"""
Proxy Stack — thin Lambda that bridges AppSync → AgentCore Runtime.

Creates:
  - Lambda function (256MB, 60s) that receives AppSync mutations and forwards to AgentCore
  - AppSync Lambda data source + resolver for the resolverLambda mutation
  - IAM permissions for AgentCore Runtime invocation, S3 read, AppSync mutations
"""

from aws_cdk import (
    Stack,
    Duration,
    CfnOutput,
    aws_lambda as _lambda,
    aws_iam as iam,
    aws_s3 as s3,
    aws_appsync as appsync,
    aws_cognito as cognito,
)
from constructs import Construct
import os


class PricingAgentProxyStack(Stack):

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        *,
        data_bucket: s3.Bucket,
        graph_api: appsync.GraphqlApi,
        graph_api_url: str,
        user_pool: cognito.UserPool,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # AgentCore Runtime ARN — set after `agentcore deploy`
        # For now use a placeholder; update via CDK context or env var
        agent_runtime_arn = self.node.try_get_context("agentRuntimeArn") or "PLACEHOLDER"

        # ═══════════════════════════════════════════════════════════════
        # Lambda: Proxy function
        # ═══════════════════════════════════════════════════════════════
        self.proxy_function = _lambda.Function(
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
                "GRAPH_API_URL": graph_api_url,
                "DATA_BUCKET": data_bucket.bucket_name,
            },
        )

        # IAM: Invoke AgentCore Runtime
        if agent_runtime_arn != "PLACEHOLDER":
            self.proxy_function.add_to_role_policy(
                iam.PolicyStatement(
                    actions=[
                        "bedrock-agentcore:InvokeAgentRuntime",
                        "bedrock-agentcore:InvokeAgent",
                        "bedrock-agentcore:GetAgentRuntime",
                    ],
                    resources=[agent_runtime_arn],
                )
            )
        else:
            # Before agentcore deploy, we don't know the ARN yet.
            # Use scoped actions on wildcard resource until the ARN is available.
            self.proxy_function.add_to_role_policy(
                iam.PolicyStatement(
                    actions=[
                        "bedrock-agentcore:InvokeAgentRuntime",
                        "bedrock-agentcore:InvokeAgent",
                        "bedrock-agentcore:GetAgentRuntime",
                    ],
                    resources=["*"],
                )
            )

        # IAM: Bedrock model invocation (for direct fallback)
        self.proxy_function.add_to_role_policy(
            iam.PolicyStatement(
                actions=[
                    "bedrock:InvokeModel",
                    "bedrock:InvokeModelWithResponseStream",
                ],
                resources=["*"],
            )
        )

        # IAM: S3 read access
        data_bucket.grant_read(self.proxy_function)

        # IAM: AppSync mutations
        graph_api.grant_mutation(self.proxy_function)
        graph_api.grant_query(self.proxy_function)

        # ═══════════════════════════════════════════════════════════════
        # AppSync: Wire Lambda as data source for resolverLambda mutation
        # ═══════════════════════════════════════════════════════════════
        lambda_ds = graph_api.add_lambda_data_source(
            "ProxyLambdaDS",
            self.proxy_function,
        )

        lambda_ds.create_resolver(
            "ResolverLambdaMutation",
            type_name="Mutation",
            field_name="resolverLambda",
            request_mapping_template=appsync.MappingTemplate.from_string("""
{
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
}
"""),
            response_mapping_template=appsync.MappingTemplate.from_string(
                "$util.toJson($ctx.result)"
            ),
        )

        # ═══════════════════════════════════════════════════════════════
        # Outputs
        # ═══════════════════════════════════════════════════════════════
        CfnOutput(self, "ProxyFunctionArn", value=self.proxy_function.function_arn)
        CfnOutput(self, "ProxyFunctionName", value=self.proxy_function.function_name)
        CfnOutput(self, "AgentRuntimeArn", value=agent_runtime_arn)
