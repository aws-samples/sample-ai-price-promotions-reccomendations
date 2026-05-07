"""
Pricing Agent Stack — all infrastructure in a single stack to avoid cyclic dependencies.

Creates:
  - S3 bucket for product data
  - Cognito User Pool + Identity Pool
  - DynamoDB table for pricing records
  - AppSync GraphQL API with resolvers
  - Lambda proxy function wired to AppSync resolverLambda mutation
  - IAM permissions for AgentCore Runtime, Bedrock, S3, AppSync
"""

from aws_cdk import (
    Stack,
    RemovalPolicy,
    Duration,
    CfnOutput,
    aws_s3 as s3,
    aws_cognito as cognito,
    aws_dynamodb as dynamodb,
    aws_appsync as appsync,
    aws_iam as iam,
    aws_lambda as _lambda,
)
from constructs import Construct
from cdk_nag import NagSuppressions
import os


class PricingAgentStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ═══════════════════════════════════════════════════════════════
        # S3: Data bucket
        # ═══════════════════════════════════════════════════════════════
        data_bucket = s3.Bucket(
            self, "DataBucket",
            bucket_name=f"pricing-agent-data-{self.account}-{self.region}",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            event_bridge_enabled=True,
            enforce_ssl=True,
        )

        # Seed data is uploaded separately via `aws s3 sync` in deploy.sh
        # (BucketDeployment removed — it was causing 10+ minute deploys)

        # ═══════════════════════════════════════════════════════════════
        # Cognito
        # ═══════════════════════════════════════════════════════════════
        user_pool = cognito.UserPool(
            self, "UserPool",
            user_pool_name="pricing-agent-users",
            self_sign_up_enabled=False,
            sign_in_aliases=cognito.SignInAliases(email=True),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            standard_attributes=cognito.StandardAttributes(
                email=cognito.StandardAttribute(required=True, mutable=True),
            ),
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=True,
            ),
            removal_policy=RemovalPolicy.DESTROY,
        )

        user_pool_client = cognito.UserPoolClient(
            self, "UserPoolClient",
            user_pool=user_pool,
            generate_secret=False,
            auth_flows=cognito.AuthFlow(user_password=True, user_srp=True),
            access_token_validity=Duration.hours(3),
            id_token_validity=Duration.hours(3),
            refresh_token_validity=Duration.days(1),
        )

        identity_pool = cognito.CfnIdentityPool(
            self, "IdentityPool",
            allow_unauthenticated_identities=False,
            cognito_identity_providers=[
                cognito.CfnIdentityPool.CognitoIdentityProviderProperty(
                    client_id=user_pool_client.user_pool_client_id,
                    provider_name=user_pool.user_pool_provider_name,
                ),
            ],
        )

        auth_role = iam.Role(
            self, "AuthenticatedRole",
            assumed_by=iam.FederatedPrincipal(
                "cognito-identity.amazonaws.com",
                conditions={
                    "StringEquals": {
                        "cognito-identity.amazonaws.com:aud": identity_pool.ref,
                    },
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "authenticated",
                    },
                },
                assume_role_action="sts:AssumeRoleWithWebIdentity",
            ),
        )
        data_bucket.grant_read_write(auth_role)

        cognito.CfnIdentityPoolRoleAttachment(
            self, "IdentityPoolRoles",
            identity_pool_id=identity_pool.ref,
            roles={"authenticated": auth_role.role_arn},
        )

        # ═══════════════════════════════════════════════════════════════
        # DynamoDB
        # ═══════════════════════════════════════════════════════════════
        pricing_table = dynamodb.Table(
            self, "PricingTable",
            table_name="PricingAgent-Pricing",
            partition_key=dynamodb.Attribute(
                name="id", type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True,
            ),
        )

        pricing_table.add_global_secondary_index(
            index_name="byUserId",
            partition_key=dynamodb.Attribute(
                name="userId", type=dynamodb.AttributeType.STRING,
            ),
        )

        # Customer Profiles table
        customer_table = dynamodb.Table(
            self, "CustomerProfileTable",
            table_name="PricingAgent-CustomerProfiles",
            partition_key=dynamodb.Attribute(
                name="customerId", type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True,
            ),
        )

        customer_table.add_global_secondary_index(
            index_name="byLoyaltyTier",
            partition_key=dynamodb.Attribute(
                name="loyaltyTier", type=dynamodb.AttributeType.STRING,
            ),
        )

        # Purchase History table
        purchase_history_table = dynamodb.Table(
            self, "PurchaseHistoryTable",
            table_name="PricingAgent-PurchaseHistory",
            partition_key=dynamodb.Attribute(
                name="customerId", type=dynamodb.AttributeType.STRING,
            ),
            sort_key=dynamodb.Attribute(
                name="orderId", type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True,
            ),
        )

        # ═══════════════════════════════════════════════════════════════
        # AppSync GraphQL API
        # ═══════════════════════════════════════════════════════════════
        graph_api = appsync.GraphqlApi(
            self, "GraphApi",
            name="PricingAgentAPI",
            definition=appsync.Definition.from_schema(
                appsync.SchemaFile.from_asset(
                    os.path.join(os.path.dirname(__file__), "..", "schema.graphql")
                )
            ),
            authorization_config=appsync.AuthorizationConfig(
                default_authorization=appsync.AuthorizationMode(
                    authorization_type=appsync.AuthorizationType.USER_POOL,
                    user_pool_config=appsync.UserPoolConfig(
                        user_pool=user_pool,
                    ),
                ),
                additional_authorization_modes=[
                    appsync.AuthorizationMode(
                        authorization_type=appsync.AuthorizationType.IAM,
                    ),
                ],
            ),
            log_config=appsync.LogConfig(
                field_log_level=appsync.FieldLogLevel.ALL,
            ),
            xray_enabled=True,
        )

        # DynamoDB resolvers
        pricing_ds = graph_api.add_dynamo_db_data_source("PricingDS", pricing_table)

        pricing_ds.create_resolver(
            "GetPricingResolver",
            type_name="Query",
            field_name="getPricing",
            request_mapping_template=appsync.MappingTemplate.dynamo_db_get_item("id", "id"),
            response_mapping_template=appsync.MappingTemplate.dynamo_db_result_item(),
        )

        # listPricings — scan with optional filter
        pricing_ds.create_resolver(
            "ListPricingsResolver",
            type_name="Query",
            field_name="listPricings",
            request_mapping_template=appsync.MappingTemplate.from_string("""{
    "version": "2017-02-28",
    "operation": "Scan",
    #if($ctx.args.limit) "limit": $ctx.args.limit, #end
    #if($ctx.args.nextToken) "nextToken": "$ctx.args.nextToken", #end
}"""),
            response_mapping_template=appsync.MappingTemplate.dynamo_db_result_list(),
        )

        # pricingByUserId — query GSI
        pricing_ds.create_resolver(
            "PricingByUserIdResolver",
            type_name="Query",
            field_name="pricingByUserId",
            request_mapping_template=appsync.MappingTemplate.from_string("""{
    "version": "2017-02-28",
    "operation": "Query",
    "index": "byUserId",
    "query": {
        "expression": "userId = :userId",
        "expressionValues": {
            ":userId": $util.dynamodb.toDynamoDBJson($ctx.args.userId)
        }
    },
    #if($ctx.args.limit) "limit": $ctx.args.limit, #end
    #if($ctx.args.nextToken) "nextToken": "$ctx.args.nextToken", #end
    #if($ctx.args.sortDirection) "scanIndexForward": #if($ctx.args.sortDirection == "ASC") true #else false #end, #end
}"""),
            response_mapping_template=appsync.MappingTemplate.dynamo_db_result_list(),
        )

        # updatePricing — with auto updatedAt
        pricing_ds.create_resolver(
            "UpdatePricingResolver",
            type_name="Mutation",
            field_name="updatePricing",
            request_mapping_template=appsync.MappingTemplate.from_string("""{
    "version": "2017-02-28",
    "operation": "UpdateItem",
    "key": { "id": $util.dynamodb.toDynamoDBJson($ctx.args.input.id) },
    #set($expNames = {})
    #set($expValues = {})
    #set($expSet = {})
    #foreach($entry in $ctx.args.input.entrySet())
        #if($entry.key != "id")
            #set($expNames["#$entry.key"] = "$entry.key")
            #set($expValues[":$entry.key"] = $util.dynamodb.toDynamoDB($entry.value))
            $!{expSet.put("#$entry.key", ":$entry.key")}
        #end
    #end
    #set($expNames["#updatedAt"] = "updatedAt")
    #set($expValues[":updatedAt"] = $util.dynamodb.toDynamoDB($util.time.nowISO8601()))
    $!{expSet.put("#updatedAt", ":updatedAt")}
    #set($expression = "SET")
    #foreach($entry in $expSet.entrySet())
        #set($expression = "$expression $entry.key = $entry.value")
        #if($foreach.hasNext) #set($expression = "$expression,") #end
    #end
    "update": {
        "expression": "$expression",
        "expressionNames": $util.toJson($expNames),
        "expressionValues": $util.toJson($expValues)
    }
}"""),
            response_mapping_template=appsync.MappingTemplate.dynamo_db_result_item(),
        )

        # createPricing — with auto id, createdAt, updatedAt
        pricing_ds.create_resolver(
            "CreatePricingResolver",
            type_name="Mutation",
            field_name="createPricing",
            request_mapping_template=appsync.MappingTemplate.from_string("""{
    "version": "2017-02-28",
    "operation": "PutItem",
    "key": {
        "id": $util.dynamodb.toDynamoDBJson($util.defaultIfNullOrBlank($ctx.args.input.id, $util.autoId()))
    },
    #set($input = $ctx.args.input)
    $!{input.put("createdAt", $util.time.nowISO8601())}
    $!{input.put("updatedAt", $util.time.nowISO8601())}
    "attributeValues": $util.dynamodb.toMapValuesJson($input)
}"""),
            response_mapping_template=appsync.MappingTemplate.dynamo_db_result_item(),
        )

        # deletePricing
        pricing_ds.create_resolver(
            "DeletePricingResolver",
            type_name="Mutation",
            field_name="deletePricing",
            request_mapping_template=appsync.MappingTemplate.dynamo_db_delete_item("id", "id"),
            response_mapping_template=appsync.MappingTemplate.dynamo_db_result_item(),
        )

        # ═══════════════════════════════════════════════════════════════
        # Lambda: Proxy function
        # ═══════════════════════════════════════════════════════════════
        agent_runtime_arn = self.node.try_get_context("agentRuntimeArn") or "PLACEHOLDER"

        proxy_fn = _lambda.Function(
            self, "ProxyLambda",
            function_name="pricing-agent-proxy",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="index.lambda_handler",
            code=_lambda.Code.from_asset(
                os.path.join(os.path.dirname(__file__), "..", "..", "proxy_lambda")
            ),
            memory_size=256,
            timeout=Duration.seconds(60),
            environment={
                "AGENT_RUNTIME_ARN": agent_runtime_arn,
                "GRAPH_API_URL": graph_api.graphql_url,
                "DATA_BUCKET": data_bucket.bucket_name,
                "CUSTOMER_PROFILE_TABLE": customer_table.table_name,
                "PURCHASE_HISTORY_TABLE": purchase_history_table.table_name,
            },
        )

        # IAM permissions
        proxy_fn.add_to_role_policy(iam.PolicyStatement(
            actions=[
                "bedrock-agentcore:InvokeAgentRuntime",
                "bedrock-agentcore:InvokeAgent",
                "bedrock-agentcore:GetAgentRuntime",
            ],
            resources=["*"],
        ))
        proxy_fn.add_to_role_policy(iam.PolicyStatement(
            actions=["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
            resources=["*"],
        ))
        data_bucket.grant_read(proxy_fn)
        customer_table.grant_read_data(proxy_fn)
        purchase_history_table.grant_read_data(proxy_fn)
        graph_api.grant_mutation(proxy_fn)
        graph_api.grant_query(proxy_fn)

        # Wire Lambda to AppSync
        lambda_ds = graph_api.add_lambda_data_source("ProxyLambdaDS", proxy_fn)
        lambda_ds.create_resolver(
            "ResolverLambdaMutation",
            type_name="Mutation",
            field_name="resolverLambda",
            request_mapping_template=appsync.MappingTemplate.from_string("""{
    "version": "2017-02-28",
    "operation": "Invoke",
    "payload": {
        "arguments": $util.toJson($ctx.arguments),
        "request": {
            "headers": {
                "host": "$ctx.request.headers.host",
                "authorization": "$ctx.request.headers.authorization"
            }
        }
    }
}"""),
            response_mapping_template=appsync.MappingTemplate.from_string(
                "$util.toJson($ctx.result)"
            ),
        )

        # ═══════════════════════════════════════════════════════════════
        # Outputs
        # ═══════════════════════════════════════════════════════════════
        CfnOutput(self, "DataBucketName", value=data_bucket.bucket_name)
        CfnOutput(self, "UserPoolId", value=user_pool.user_pool_id)
        CfnOutput(self, "UserPoolClientId", value=user_pool_client.user_pool_client_id)
        CfnOutput(self, "IdentityPoolId", value=identity_pool.ref)
        CfnOutput(self, "GraphApiUrl", value=graph_api.graphql_url)
        CfnOutput(self, "GraphApiId", value=graph_api.api_id)
        CfnOutput(self, "PricingTableName", value=pricing_table.table_name)
        CfnOutput(self, "CustomerProfileTableName", value=customer_table.table_name)
        CfnOutput(self, "PurchaseHistoryTableName", value=purchase_history_table.table_name)
        CfnOutput(self, "ProxyFunctionName", value=proxy_fn.function_name)

        # ═══════════════════════════════════════════════════════════════
        # cdk-nag Suppressions
        # ═══════════════════════════════════════════════════════════════
        NagSuppressions.add_resource_suppressions(
            data_bucket,
            [
                {
                    "id": "AwsSolutions-S1",
                    "reason": "Server access logging not required for demo/PoC data bucket containing sample product data.",
                },
            ],
        )

        NagSuppressions.add_resource_suppressions(
            user_pool,
            [
                {
                    "id": "AwsSolutions-COG2",
                    "reason": "MFA not required for demo/PoC application with limited user base.",
                },
                {
                    "id": "AwsSolutions-COG3",
                    "reason": "AdvancedSecurityMode requires Cognito Plus tier which is cost prohibitive for demo/PoC application.",
                },
                {
                    "id": "AwsSolutions-COG8",
                    "reason": "Cognito Plus tier not required for demo/PoC application — advanced security features are cost prohibitive for demonstration purposes.",
                },
            ],
        )

        NagSuppressions.add_resource_suppressions_by_path(
            self,
            f"/{construct_id}/AuthenticatedRole/DefaultPolicy/Resource",
            [
                {
                    "id": "AwsSolutions-IAM5",
                    "reason": "Cognito authenticated users need wildcard S3 access to read/write product images and data files. Actions are scoped to the specific data bucket.",
                    "appliesTo": [
                        "Action::s3:GetObject*",
                        "Action::s3:GetBucket*",
                        "Action::s3:List*",
                        "Action::s3:DeleteObject*",
                        "Action::s3:Abort*",
                        f"Resource::<DataBucketE3889A50.Arn>/*",
                    ],
                },
            ],
        )

        NagSuppressions.add_resource_suppressions_by_path(
            self,
            f"/{construct_id}/ProxyLambda/ServiceRole/DefaultPolicy/Resource",
            [
                {
                    "id": "AwsSolutions-IAM5",
                    "reason": "Lambda proxy requires broad permissions for Bedrock AgentCore invocation, S3 data access, DynamoDB index queries, and AppSync mutations/queries. Actions are scoped to specific resources where possible.",
                    "appliesTo": [
                        "Resource::*",
                        "Action::s3:GetObject*",
                        "Action::s3:GetBucket*",
                        "Action::s3:List*",
                        f"Resource::<DataBucketE3889A50.Arn>/*",
                        f"Resource::<CustomerProfileTableBC00171D.Arn>/index/*",
                        f"Resource::arn:<AWS::Partition>:appsync:{self.region}:{self.account}:apis/<GraphApiDF3DE7E7.ApiId>/types/Mutation/*",
                        f"Resource::arn:<AWS::Partition>:appsync:{self.region}:{self.account}:apis/<GraphApiDF3DE7E7.ApiId>/types/Query/*",
                    ],
                },
            ],
        )

        NagSuppressions.add_resource_suppressions_by_path(
            self,
            f"/{construct_id}/GraphApi/PricingDS/ServiceRole/DefaultPolicy/Resource",
            [
                {
                    "id": "AwsSolutions-IAM5",
                    "reason": "AppSync data source requires access to all DynamoDB GSIs for pricing queries.",
                    "appliesTo": [f"Resource::<PricingTable5DA5F4FC.Arn>/index/*"],
                },
            ],
        )

        NagSuppressions.add_resource_suppressions_by_path(
            self,
            f"/{construct_id}/GraphApi/ProxyLambdaDS/ServiceRole/DefaultPolicy/Resource",
            [
                {
                    "id": "AwsSolutions-IAM5",
                    "reason": "AppSync Lambda data source requires invoke permissions on Lambda function versions.",
                    "appliesTo": [f"Resource::<ProxyLambdaAE35EAC4.Arn>:*"],
                },
            ],
        )

        NagSuppressions.add_resource_suppressions_by_path(
            self,
            f"/{construct_id}/GraphApi/ApiLogsRole/Resource",
            [
                {
                    "id": "AwsSolutions-IAM4",
                    "reason": "AWS managed policy for AppSync CloudWatch Logs is the recommended approach.",
                    "appliesTo": ["Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSAppSyncPushToCloudWatchLogs"],
                },
            ],
        )

        NagSuppressions.add_resource_suppressions_by_path(
            self,
            f"/{construct_id}/ProxyLambda/ServiceRole/Resource",
            [
                {
                    "id": "AwsSolutions-IAM4",
                    "reason": "AWS managed policy for Lambda basic execution is the recommended approach for CloudWatch Logs access.",
                    "appliesTo": ["Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],
                },
            ],
        )

        NagSuppressions.add_resource_suppressions_by_path(
            self,
            f"/{construct_id}/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/Resource",
            [
                {
                    "id": "AwsSolutions-IAM4",
                    "reason": "CDK LogRetention custom resource uses AWS managed policy for Lambda basic execution.",
                    "appliesTo": ["Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],
                },
            ],
        )

        NagSuppressions.add_resource_suppressions_by_path(
            self,
            f"/{construct_id}/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/DefaultPolicy/Resource",
            [
                {
                    "id": "AwsSolutions-IAM5",
                    "reason": "CDK LogRetention custom resource requires wildcard permissions to manage CloudWatch log groups.",
                    "appliesTo": ["Resource::*"],
                },
            ],
        )

        NagSuppressions.add_resource_suppressions_by_path(
            self,
            f"/{construct_id}/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/Resource",
            [
                {
                    "id": "AwsSolutions-IAM4",
                    "reason": "CDK BucketNotifications custom resource uses AWS managed policy for Lambda basic execution.",
                    "appliesTo": ["Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],
                },
                {
                    "id": "AwsSolutions-IAM5",
                    "reason": "CDK BucketNotifications custom resource requires wildcard permissions to configure S3 bucket notifications.",
                    "appliesTo": ["Resource::*"],
                },
            ],
        )

        NagSuppressions.add_resource_suppressions(
            proxy_fn,
            [
                {
                    "id": "AwsSolutions-L1",
                    "reason": "Python 3.12 is the latest stable Lambda runtime as of April 2026. Python 3.13 is not yet GA in Lambda.",
                },
            ],
        )
