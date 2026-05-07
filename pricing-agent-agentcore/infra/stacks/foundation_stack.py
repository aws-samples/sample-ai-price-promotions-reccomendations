"""
Foundation Stack — core infrastructure for the Retail Pricing Agent.

Creates:
  - S3 bucket for product data (demand_forecast, web_scrap, margin_rules, product images)
  - Cognito User Pool + Identity Pool for authentication
  - AppSync GraphQL API with Pricing model (DynamoDB-backed)
  - DynamoDB table for pricing records with real-time subscriptions
"""

from aws_cdk import (
    Stack,
    RemovalPolicy,
    Duration,
    CfnOutput,
    aws_s3 as s3,
    aws_s3_deployment as s3deploy,
    aws_cognito as cognito,
    aws_dynamodb as dynamodb,
    aws_appsync as appsync,
    aws_iam as iam,
)
from constructs import Construct
import os


class PricingAgentFoundationStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ═══════════════════════════════════════════════════════════════
        # S3: Data bucket for product data, forecasts, competitor data
        # ═══════════════════════════════════════════════════════════════
        self.data_bucket = s3.Bucket(
            self, "DataBucket",
            bucket_name=f"pricing-agent-data-{self.account}-{self.region}",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            event_bridge_enabled=True,
        )

        # Seed data deployment (if seed_output exists)
        seed_path = os.path.join(os.path.dirname(__file__), "..", "..", "seed_output")
        if os.path.isdir(seed_path):
            s3deploy.BucketDeployment(
                self, "SeedDataDeployment",
                sources=[s3deploy.Source.asset(seed_path)],
                destination_bucket=self.data_bucket,
            )

        # ═══════════════════════════════════════════════════════════════
        # Cognito: User Pool + Client + Identity Pool
        # ═══════════════════════════════════════════════════════════════
        self.user_pool = cognito.UserPool(
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

        self.user_pool_client = cognito.UserPoolClient(
            self, "UserPoolClient",
            user_pool=self.user_pool,
            generate_secret=False,
            auth_flows=cognito.AuthFlow(
                user_password=True,
                user_srp=True,
            ),
            access_token_validity=Duration.hours(3),
            id_token_validity=Duration.hours(3),
            refresh_token_validity=Duration.days(1),
        )

        self.identity_pool = cognito.CfnIdentityPool(
            self, "IdentityPool",
            allow_unauthenticated_identities=False,
            cognito_identity_providers=[
                cognito.CfnIdentityPool.CognitoIdentityProviderProperty(
                    client_id=self.user_pool_client.user_pool_client_id,
                    provider_name=self.user_pool.user_pool_provider_name,
                ),
            ],
        )

        # Authenticated role for identity pool
        authenticated_role = iam.Role(
            self, "AuthenticatedRole",
            assumed_by=iam.FederatedPrincipal(
                "cognito-identity.amazonaws.com",
                conditions={
                    "StringEquals": {
                        "cognito-identity.amazonaws.com:aud": self.identity_pool.ref,
                    },
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "authenticated",
                    },
                },
                assume_role_action="sts:AssumeRoleWithWebIdentity",
            ),
        )
        self.data_bucket.grant_read_write(authenticated_role)

        cognito.CfnIdentityPoolRoleAttachment(
            self, "IdentityPoolRoles",
            identity_pool_id=self.identity_pool.ref,
            roles={"authenticated": authenticated_role.role_arn},
        )

        # ═══════════════════════════════════════════════════════════════
        # DynamoDB: Pricing table
        # ═══════════════════════════════════════════════════════════════
        self.pricing_table = dynamodb.Table(
            self, "PricingTable",
            table_name="PricingAgent-Pricing",
            partition_key=dynamodb.Attribute(
                name="id", type=dynamodb.AttributeType.STRING,
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,
            point_in_time_recovery=True,
        )

        self.pricing_table.add_global_secondary_index(
            index_name="byUserId",
            partition_key=dynamodb.Attribute(
                name="userId", type=dynamodb.AttributeType.STRING,
            ),
        )

        # ═══════════════════════════════════════════════════════════════
        # AppSync: GraphQL API
        # ═══════════════════════════════════════════════════════════════
        self.graph_api = appsync.GraphqlApi(
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
                        user_pool=self.user_pool,
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

        self.graph_api_url = self.graph_api.graphql_url

        # DynamoDB data source for AppSync
        pricing_ds = self.graph_api.add_dynamo_db_data_source(
            "PricingDS", self.pricing_table,
        )

        # Resolver: getPricing
        pricing_ds.create_resolver(
            "GetPricingResolver",
            type_name="Query",
            field_name="getPricing",
            request_mapping_template=appsync.MappingTemplate.dynamo_db_get_item("id", "id"),
            response_mapping_template=appsync.MappingTemplate.dynamo_db_result_item(),
        )

        # Resolver: updatePricing
        pricing_ds.create_resolver(
            "UpdatePricingResolver",
            type_name="Mutation",
            field_name="updatePricing",
            request_mapping_template=appsync.MappingTemplate.from_string("""
{
    "version": "2017-02-28",
    "operation": "UpdateItem",
    "key": {
        "id": $util.dynamodb.toDynamoDBJson($ctx.args.input.id)
    },
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
    #set($expression = "SET")
    #foreach($entry in $expSet.entrySet())
        #set($expression = "$expression $entry.key = $entry.value")
        #if($foreach.hasNext)
            #set($expression = "$expression,")
        #end
    #end
    "update": {
        "expression": "$expression",
        "expressionNames": $util.toJson($expNames),
        "expressionValues": $util.toJson($expValues)
    }
}
"""),
            response_mapping_template=appsync.MappingTemplate.dynamo_db_result_item(),
        )

        # Resolver: createPricing
        pricing_ds.create_resolver(
            "CreatePricingResolver",
            type_name="Mutation",
            field_name="createPricing",
            request_mapping_template=appsync.MappingTemplate.dynamo_db_put_item(
                appsync.PrimaryKey.partition("id").auto(),
                appsync.Values.projecting("input"),
            ),
            response_mapping_template=appsync.MappingTemplate.dynamo_db_result_item(),
        )

        # ═══════════════════════════════════════════════════════════════
        # Outputs
        # ═══════════════════════════════════════════════════════════════
        CfnOutput(self, "DataBucketName", value=self.data_bucket.bucket_name)
        CfnOutput(self, "UserPoolId", value=self.user_pool.user_pool_id)
        CfnOutput(self, "UserPoolClientId", value=self.user_pool_client.user_pool_client_id)
        CfnOutput(self, "IdentityPoolId", value=self.identity_pool.ref)
        CfnOutput(self, "GraphApiUrl", value=self.graph_api.graphql_url)
        CfnOutput(self, "GraphApiId", value=self.graph_api.api_id)
        CfnOutput(self, "PricingTableName", value=self.pricing_table.table_name)
