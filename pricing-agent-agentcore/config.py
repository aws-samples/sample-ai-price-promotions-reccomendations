"""
Centralized configuration — all environment variables, model IDs, and defaults.
Every module imports from here instead of reading os.environ directly.
"""

import os


# ---------------------------------------------------------------------------
# AWS / Region
# ---------------------------------------------------------------------------
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

# ---------------------------------------------------------------------------
# Bedrock Model IDs
# ---------------------------------------------------------------------------
# Demand Forecast Agent — complex reasoning, needs best model
CLAUDE_SONNET_4_5 = os.environ.get(
    "DEMAND_MODEL_ID",
    "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
)
# Web Scraper Agent — structured data extraction, fast & cost-effective
CLAUDE_HAIKU_4_5 = os.environ.get(
    "WEB_MODEL_ID",
    "us.anthropic.claude-haiku-4-5-20251001-v1:0",
)
# Margin Agent — rule application & calculations, AWS-native model
NOVA_PRO = os.environ.get(
    "MARGIN_MODEL_ID",
    "us.amazon.nova-pro-v1:0",
)
# Personalization Agent — cross-provider showcase, OpenAI on Bedrock
OPENAI_GPT_OSS = os.environ.get(
    "PERSONALIZATION_MODEL_ID",
    "openai.gpt-oss-120b-1:0",
)

# ---------------------------------------------------------------------------
# S3
# ---------------------------------------------------------------------------
DATA_BUCKET = os.environ.get("DATA_BUCKET", "")

# ---------------------------------------------------------------------------
# AppSync / GraphQL
# ---------------------------------------------------------------------------
GRAPH_API_URL = os.environ.get("GRAPH_API_URL", "")

# These are set per-request by the handler from the incoming payload
APPSYNC_HOST: str = ""
APPSYNC_AUTH_TOKEN: str = ""  # nosec B105 - Not a hardcoded password, initialized empty and set at runtime


def set_appsync_credentials(host: str, auth_token: str):
    """Called once per request to inject the caller's auth context."""
    global APPSYNC_HOST, APPSYNC_AUTH_TOKEN, GRAPH_API_URL
    APPSYNC_HOST = host
    APPSYNC_AUTH_TOKEN = auth_token
    # Construct the GraphQL URL from the host if not already set via env var
    if not GRAPH_API_URL and host:
        GRAPH_API_URL = f"https://{host}/graphql"


# ---------------------------------------------------------------------------
# DynamoDB Tables
# ---------------------------------------------------------------------------
PRICING_TABLE = os.environ.get("PRICING_TABLE", "PricingAgent-Pricing")
CUSTOMER_PROFILE_TABLE = os.environ.get("CUSTOMER_PROFILE_TABLE", "PricingAgent-CustomerProfiles")
PURCHASE_HISTORY_TABLE = os.environ.get("PURCHASE_HISTORY_TABLE", "PricingAgent-PurchaseHistory")

# ---------------------------------------------------------------------------
# AgentCore Memory (optional — set MEMORY_ID to enable)
# ---------------------------------------------------------------------------
MEMORY_ID = os.environ.get("MEMORY_ID", "")

# ---------------------------------------------------------------------------
# AgentCore Runtime
# ---------------------------------------------------------------------------
AGENT_RUNTIME_ARN = os.environ.get("AGENT_RUNTIME_ARN", "")
