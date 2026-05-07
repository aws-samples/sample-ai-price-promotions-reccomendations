"""
AgentCore Runtime entrypoint — the main orchestration handler.

Replaces:
  - index.py (Lambda handler)
  - agent_orchestrator.py (AgentOrchestrator class)
  - The multi-agent-orchestrator library's ChainAgent + SupervisorAgent pattern

Architecture:
  This handler receives a pricing request, runs three agents in sequence
  (Demand Forecast → Web Scraper → Margin), and persists results via GraphQL.
  Each agent writes its output to both the inter-agent store and DynamoDB.
  The frontend receives real-time updates via GraphQL subscriptions.

Deploy:
  agentcore configure --entrypoint handler.py
  agentcore deploy
"""

import json
import logging
import re
import time

from bedrock_agentcore.runtime import BedrockAgentCoreApp
from bedrock_agentcore.runtime.context import RequestContext

import config
import store
import gql_client
import memory_manager
from agents import (
    create_demand_forecast_agent,
    create_web_scraper_agent,
    create_margin_agent,
    create_personalization_agent,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------
# Regex: alphanumeric, hyphens, underscores, dots. Covers UUIDs and typical IDs.
_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9._@\-]{1,128}$")

# Maximum size for the product JSON payload (characters)
_MAX_PRODUCT_SIZE = 10_000


def _validate_payload(payload: dict) -> str | None:
    """Validate incoming payload fields. Returns an error message or None if valid."""
    pricing_id = payload.get("pricing_id", "")
    user_id = payload.get("user_id", "")
    customer_id = payload.get("customer_id", "")

    for field_name, value in [("pricing_id", pricing_id), ("user_id", user_id)]:
        if value and not _SAFE_ID_RE.match(value):
            return f"Invalid {field_name}: must be 1-128 alphanumeric/dash/underscore/dot characters"

    if customer_id and not _SAFE_ID_RE.match(customer_id):
        return "Invalid customer_id: must be 1-128 alphanumeric/dash/underscore/dot characters"

    product = payload.get("product", {})
    if not isinstance(product, dict):
        return "Invalid product: must be a JSON object"
    if len(json.dumps(product)) > _MAX_PRODUCT_SIZE:
        return f"Invalid product: payload exceeds {_MAX_PRODUCT_SIZE} character limit"

    return None

# ---------------------------------------------------------------------------
# AgentCore Runtime App
# ---------------------------------------------------------------------------
app = BedrockAgentCoreApp()


# ---------------------------------------------------------------------------
# Helper: extract text from Strands agent response
# ---------------------------------------------------------------------------
def _extract_text(content) -> str:
    """Extract plain text from a Strands agent response content block."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and "text" in block:
                parts.append(block["text"])
            elif isinstance(block, str):
                parts.append(block)
        return "\n".join(parts) if parts else str(content)
    return str(content)


def _get_response_text(result) -> str:
    """Safely extract text from a Strands Agent result object."""
    try:
        msg = result.message
        if isinstance(msg, dict):
            return _extract_text(msg.get("content", []))
        return str(msg)
    except Exception:
        return str(result)


# ---------------------------------------------------------------------------
# Main entrypoint
# ---------------------------------------------------------------------------
@app.entrypoint
def invoke(payload: dict, context: RequestContext):
    """
    Main orchestration entrypoint. Called by AgentCore Runtime for each request.

    Expected payload (matches the original Lambda's args structure):
    {
        "product": { ... },          // Product details (name, sku, cost, msrp, map, etc.)
        "pricing_id": "session-uuid", // Maps to original sessionID
        "user_id": "user-uuid",       // Maps to original userID
        "host": "appsync-host",       // AppSync endpoint host for GraphQL auth
        "auth_token": "bearer-token"  // Cognito auth token for GraphQL auth
    }

    Returns:
    {
        "status": "success" | "error",
        "session_id": "...",
        "summary": "..."
    }
    """
    # --- Extract payload fields ---
    product = payload.get("product", {})
    pricing_id = payload.get("pricing_id", "")
    user_id = payload.get("user_id", "")
    host = payload.get("host", "")
    auth_token = payload.get("auth_token", "")
    session_id = context.session_id or pricing_id

    # --- Validate inputs to prevent prompt injection ---
    validation_error = _validate_payload(payload)
    if validation_error:
        logger.warning("Payload validation failed: %s", validation_error)
        return {
            "status": "error",
            "session_id": session_id,
            "pricing_id": pricing_id,
            "error": validation_error,
        }

    logger.info(
        "Request: user=%s session=%s pricing_id=%s",
        user_id, session_id, pricing_id,
    )

    # --- Configure per-request state ---
    # Set AppSync credentials for GraphQL tools
    config.set_appsync_credentials(host, auth_token)

    # Set GraphQL URL from payload if provided
    graph_api_url = payload.get("graph_api_url", "")
    if graph_api_url:
        config.GRAPH_API_URL = graph_api_url

    # Reset and seed the inter-agent store (replaces original LocalStore.set calls)
    store.reset()
    store.set("args", {
        "userID": user_id,
        "sessionID": pricing_id,
        "product": product,
    })
    store.set("gql", {
        "host": host,
        "auth_token": auth_token,
    })

    product_json = json.dumps(product) if isinstance(product, dict) else str(product)

    try:
        # ═══════════════════════════════════════════════════════════════
        # Phase 1: Demand Forecast Agent
        # ═══════════════════════════════════════════════════════════════
        logger.info("Phase 1: Running Demand Forecast Agent...")
        demand_agent = create_demand_forecast_agent()
        demand_result = demand_agent(
            f"Analyze demand and generate pricing recommendation for this product. "
            f"Product details: {product_json}"
        )
        demand_text = _get_response_text(demand_result)
        logger.info("Phase 1 complete: demand forecast generated")

        # Push intermediate chat update to frontend
        memory_manager.push_bot_responses(pricing_id, [
            {"role": "assistant", "content": "Demand forecast analysis complete."},
        ])

        # ═══════════════════════════════════════════════════════════════
        # Phase 2: Web Scraper Agent (Competitive Analysis)
        # ═══════════════════════════════════════════════════════════════
        logger.info("Phase 2: Running Web Scraper Agent...")
        web_agent = create_web_scraper_agent()
        web_result = web_agent(
            f"Analyze competitor pricing and generate competitive pricing "
            f"recommendation for this product. Product details: {product_json}"
        )
        web_text = _get_response_text(web_result)
        logger.info("Phase 2 complete: competitive analysis generated")

        # Push intermediate chat update
        memory_manager.push_bot_responses(pricing_id, [
            {"role": "assistant", "content": "Demand forecast analysis complete."},
            {"role": "assistant", "content": "Competitive analysis complete."},
        ])

        # ═══════════════════════════════════════════════════════════════
        # Phase 3: Margin Agent
        # Receives upstream results via the store (demandForecast, webScrap)
        # which were set by the tools in Phase 1 and Phase 2.
        # ═══════════════════════════════════════════════════════════════
        logger.info("Phase 3: Running Margin Agent...")
        margin_agent = create_margin_agent()

        # Build context string with upstream results for the margin agent
        upstream_context = (
            f"=== UPSTREAM RESULTS ===\n\n"
            f"--- Demand Forecast Agent Output ---\n{demand_text}\n\n"
            f"--- Competitive Analysis Agent Output ---\n{web_text}\n\n"
            f"--- Product Details ---\n{product_json}\n\n"
            f"Apply margin rules and determine final pricing boundaries using "
            f"the upstream analysis results and the margin rules from S3."
        )

        margin_result = margin_agent(upstream_context)
        margin_text = _get_response_text(margin_result)
        logger.info("Phase 3 complete: margin analysis generated")

        # Push intermediate chat update
        memory_manager.push_bot_responses(pricing_id, [
            {"role": "assistant", "content": "Demand forecast analysis complete."},
            {"role": "assistant", "content": "Competitive analysis complete."},
            {"role": "assistant", "content": "Margin analysis and final pricing complete."},
        ])

        # ═══════════════════════════════════════════════════════════════
        # Phase 4: Personalization Agent (if customer_id provided)
        # Applies loyalty tier, payment method, and persona discounts.
        # ═══════════════════════════════════════════════════════════════
        customer_id = payload.get("customer_id", "")
        personalization_text = ""

        if customer_id:
            logger.info("Phase 4: Running Personalization Agent for customer %s...", customer_id)
            personalization_agent = create_personalization_agent()

            personalization_context = (
                f"=== PERSONALIZATION REQUEST ===\n\n"
                f"Customer ID: {customer_id}\n\n"
                f"--- Margin Agent Output (base pricing) ---\n{margin_text}\n\n"
                f"--- Product Details ---\n{product_json}\n\n"
                f"Generate a personalized price for this customer based on their "
                f"loyalty tier, payment methods, and behavioral persona."
            )

            personalization_result = personalization_agent(personalization_context)
            personalization_text = _get_response_text(personalization_result)
            logger.info("Phase 4 complete: personalized pricing generated")

            memory_manager.push_bot_responses(pricing_id, [
                {"role": "assistant", "content": "Demand forecast analysis complete."},
                {"role": "assistant", "content": "Competitive analysis complete."},
                {"role": "assistant", "content": "Margin analysis and final pricing complete."},
                {"role": "assistant", "content": "Personalized pricing generated."},
            ])
        else:
            logger.info("Phase 4: Skipped (no customer_id in payload)")

        # ═══════════════════════════════════════════════════════════════
        # Finalize: Update status + persist to memory
        # ═══════════════════════════════════════════════════════════════
        gql_client.update_pricing_status(pricing_id, "success")
        logger.info("Updated pricing status to 'success'")

        final_text = personalization_text if personalization_text else margin_text

        # Save full conversation to AgentCore Memory (if configured)
        memory_manager.save_conversation_event(
            user_id=user_id,
            session_id=session_id,
            user_message=f"Determine optimal price for: {product_json}",
            assistant_message=final_text[:2000],
        )

        return {
            "status": "success",
            "session_id": session_id,
            "pricing_id": pricing_id,
            "summary": margin_text[:500],
        }

    except Exception as exc:
        logger.error("Orchestration error: %s", exc, exc_info=True)

        # Update status to error
        try:
            gql_client.update_pricing_status(pricing_id, "error")
        except Exception as gql_exc:
            logger.error("Failed to update error status: %s", gql_exc)

        return {
            "status": "error",
            "session_id": session_id,
            "pricing_id": pricing_id,
            "error": str(exc),
        }


# ---------------------------------------------------------------------------
# Local development entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    app.run()
