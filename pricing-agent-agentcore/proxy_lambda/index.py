"""
Thin Lambda proxy — bridges AppSync GraphQL mutations to AgentCore Runtime.

This replaces the original 1GB/5min Lambda orchestrator with a lightweight
proxy that simply forwards the request to AgentCore Runtime and returns.

The frontend contract is UNCHANGED:
  - Same GraphQL mutation: resolverLambda(args: String): String
  - Same args JSON structure: { userID, sessionID, product, ... }
  - Same response format: { success, result, statusCode }
  - Same real-time updates via onPricingById subscription

CDK deploys this as the new AppSync resolver function.
"""

import os
import json
import base64
import logging

import boto3

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

agentcore_client = boto3.client("bedrock-agentcore")

AGENT_RUNTIME_ARN = os.environ["AGENT_RUNTIME_ARN"]
GRAPH_API_URL = os.environ.get("GRAPH_API_URL", "")


def success_response(result):
    return {"success": True, "result": result, "statusCode": "200"}


def failure_response(error_message):
    return {"success": False, "errorMessage": error_message, "statusCode": "500"}


def lambda_handler(event, context):
    """
    AppSync resolver that forwards pricing requests to AgentCore Runtime.

    Input event structure (from AppSync):
    {
        "arguments": { "args": "<JSON string>" },
        "request": {
            "headers": {
                "host": "...",
                "authorization": "Bearer ...",
                "x-api-key": "..."
            }
        }
    }

    The args JSON contains:
    {
        "userID": "...",
        "sessionID": "...",
        "product": { ... }
    }
    """
    try:
        # --- Parse AppSync event ---
        arguments = event.get("arguments", {}).get("args", "{}")
        headers = event.get("request", {}).get("headers", {})
        host = headers.get("host", "")
        auth_token = headers.get("authorization", "")

        args = json.loads(arguments)
        logger.info(
            "Proxy: user=%s session=%s",
            args.get("userID"), args.get("sessionID"),
        )

        # --- Build AgentCore Runtime payload ---
        # Maps the original Lambda args to the handler.py payload format
        runtime_payload = {
            "product": args.get("product", {}),
            "pricing_id": args.get("sessionID", ""),
            "user_id": args.get("userID", ""),
            "customer_id": args.get("customerID", ""),
            "host": host,
            "auth_token": auth_token,
            "graph_api_url": os.environ.get("GRAPH_API_URL", ""),
        }

        payload_bytes = json.dumps(runtime_payload).encode("utf-8")

        # --- Invoke AgentCore Runtime ---
        logger.info("Invoking AgentCore Runtime: %s", AGENT_RUNTIME_ARN)

        response = agentcore_client.invoke_agent_runtime(
            agentRuntimeArn=AGENT_RUNTIME_ARN,
            qualifier="DEFAULT",
            payload=payload_bytes,
        )

        logger.info("AgentCore Runtime invoked successfully")

        # The actual results are written to DynamoDB by the agents via GraphQL.
        # The frontend receives them via subscriptions. This response is just
        # an acknowledgment (same as the original Lambda returning "DONE").
        return success_response("DONE")

    except Exception as exc:
        logger.error("Proxy error: %s", exc, exc_info=True)
        return failure_response(f"Error: {str(exc)}")
