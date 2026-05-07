"""
GraphQL client — ported from the original gql_utils.py + gql.py.
Handles authenticated AppSync mutations for persisting agent results.
"""

import json
import logging
import requests

import config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# GraphQL Mutation (identical to original)
# ---------------------------------------------------------------------------
UPDATE_PRICING_MUTATION = """
mutation UpdatePricing(
  $input: UpdatePricingInput!
  $condition: ModelPricingConditionInput
) {
  updatePricing(input: $input, condition: $condition) {
    id
    userId
    product
    demandForecast
    webScrap
    marginAnalysis
    personalizedPricing
    botResponses
    status
    createdAt
    updatedAt
    __typename
  }
}
"""


# ---------------------------------------------------------------------------
# Executor
# ---------------------------------------------------------------------------
def gql_execute(query: str, variables: dict) -> dict:
    """
    Execute a GraphQL operation against the AppSync endpoint.
    Uses the per-request credentials stored in config.
    """
    endpoint = config.GRAPH_API_URL
    if not endpoint:
        logger.warning("GRAPH_API_URL not set — skipping GraphQL call")
        return {"error": "GRAPH_API_URL not configured"}

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    if config.APPSYNC_AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {config.APPSYNC_AUTH_TOKEN}"
    if config.APPSYNC_HOST:
        headers["host"] = config.APPSYNC_HOST

    payload = {"query": query, "variables": variables}

    try:
        resp = requests.post(endpoint, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        logger.error("GraphQL request failed: %s", exc)
        return {"error": str(exc)}


def update_pricing_field(session_id: str, field: str, data: dict) -> dict:
    """Convenience wrapper: update a single AWSJSON field on a Pricing record."""
    return gql_execute(
        UPDATE_PRICING_MUTATION,
        {"input": {"id": session_id, field: json.dumps(data)}},
    )


def update_pricing_status(session_id: str, status: str) -> dict:
    """Set the status field (success / error) on a Pricing record."""
    return gql_execute(
        UPDATE_PRICING_MUTATION,
        {"input": {"id": session_id, "status": status}},
    )


def update_bot_responses(session_id: str, bot_responses: list) -> dict:
    """Push chat messages to the botResponses field for real-time subscriptions."""
    return gql_execute(
        UPDATE_PRICING_MUTATION,
        {"input": {"id": session_id, "botResponses": json.dumps(bot_responses)}},
    )
