#!/usr/bin/env python3
"""
CDK App — deploys the Retail Pricing Agent infrastructure.

Usage:
    cd pricing-agent-agentcore/infra
    source .venv/bin/activate

    # Option 1: Use environment variables
    export CDK_DEFAULT_ACCOUNT=<your-account-id>
    export CDK_DEFAULT_REGION=<your-region>
    cdk deploy --all

    # Option 2: Use CDK context
    cdk deploy --all -c account=<your-account-id> -c region=<your-region>
"""

import os
import aws_cdk as cdk
from cdk_nag import AwsSolutionsChecks, NagSuppressions
from stacks.pricing_stack import PricingAgentStack

app = cdk.App()

# Enable cdk-nag AWS Solutions checks
cdk.Aspects.of(app).add(AwsSolutionsChecks(verbose=True))

# Get account and region from context, environment variables, or CDK defaults
account = app.node.try_get_context("account") or os.environ.get("CDK_DEFAULT_ACCOUNT")
region = app.node.try_get_context("region") or os.environ.get("CDK_DEFAULT_REGION") or os.environ.get("AWS_DEFAULT_REGION")

PricingAgentStack(
    app, "PricingAgent",
    env=cdk.Environment(account=account, region=region),
    description="Retail Pricing Agent — S3, Cognito, AppSync, DynamoDB, Lambda Proxy",
)

app.synth()
