"""
Strands @tool implementations for the Personalization Agent.

Tools:
  - get_customer_profile     → reads customer profile from DynamoDB
  - get_purchase_history     → reads recent purchase history from DynamoDB
  - gql_update_personalized_pricing → persists personalized pricing via GraphQL
"""

import json
import logging
from datetime import datetime, timedelta, timezone

import boto3
from strands import tool

import config
import store
import gql_client

logger = logging.getLogger(__name__)

dynamodb = boto3.resource("dynamodb", region_name=config.AWS_REGION)


# ═══════════════════════════════════════════════════════════════════════════
# Customer Profile
# ═══════════════════════════════════════════════════════════════════════════

@tool
def get_customer_profile(customer_id: str) -> str:
    """Retrieve a customer's profile including loyalty tier, payment methods, and persona.

    Args:
        customer_id: The customer's unique identifier.
    """
    table_name = config.CUSTOMER_PROFILE_TABLE
    if not table_name:
        return json.dumps({"error": "CUSTOMER_PROFILE_TABLE not configured"})

    try:
        table = dynamodb.Table(table_name)
        response = table.get_item(Key={"customerId": customer_id})
        item = response.get("Item")

        if not item:
            logger.warning("Customer profile not found: %s", customer_id)
            return json.dumps({
                "customerId": customer_id,
                "loyaltyTier": "standard",
                "paymentMethods": [],
                "primaryPersona": "none",
                "annualSpend": 0,
                "memberSince": None,
                "found": False,
            })

        # Convert Decimal types to float for JSON serialization
        result = _convert_decimals(item)
        result["found"] = True
        logger.info("Customer profile found: %s (tier=%s, persona=%s)",
                     customer_id, result.get("loyaltyTier"), result.get("primaryPersona"))
        return json.dumps(result, default=str)

    except Exception as exc:
        logger.error("Error reading customer profile: %s", exc)
        return json.dumps({"error": str(exc), "customerId": customer_id})


# ═══════════════════════════════════════════════════════════════════════════
# Purchase History
# ═══════════════════════════════════════════════════════════════════════════

@tool
def get_purchase_history(customer_id: str, limit: int = 20) -> str:
    """Retrieve a customer's recent purchase history to detect buying patterns.

    Args:
        customer_id: The customer's unique identifier.
        limit: Maximum number of recent purchases to return (default 20).
    """
    table_name = config.PURCHASE_HISTORY_TABLE
    if not table_name:
        return json.dumps({"error": "PURCHASE_HISTORY_TABLE not configured"})

    try:
        table = dynamodb.Table(table_name)
        response = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("customerId").eq(customer_id),
            ScanIndexForward=False,  # Most recent first
            Limit=limit,
        )
        items = response.get("Items", [])
        items = [_convert_decimals(item) for item in items]

        logger.info("Purchase history: %d orders for %s", len(items), customer_id)
        return json.dumps({
            "customerId": customer_id,
            "orderCount": len(items),
            "orders": items,
        }, default=str)

    except Exception as exc:
        logger.error("Error reading purchase history: %s", exc)
        return json.dumps({"error": str(exc), "customerId": customer_id, "orders": []})


# ═══════════════════════════════════════════════════════════════════════════
# GraphQL: Personalized Pricing
# ═══════════════════════════════════════════════════════════════════════════

@tool
def gql_update_personalized_pricing(
    personalized_price: float,
    base_suggested_price: float,
    total_savings: float,
    savings_percentage: float,
    discount_breakdown: str,
    margin_validation: str,
    offer_details: str,
    rationale: str,
) -> str:
    """Persist personalized pricing results to DynamoDB via GraphQL mutation.

    Call this AFTER generating the personalized pricing to save results.

    Args:
        personalized_price: Final price after all personalization discounts.
        base_suggested_price: Original suggested price from Margin Agent.
        total_savings: Total dollar amount saved.
        savings_percentage: Total percentage discount.
        discount_breakdown: JSON string with loyalty, payment, and persona discount details.
        margin_validation: JSON string with final margin, floor, and compliance status.
        offer_details: JSON string with expiration, exclusivity flag, and customer message.
        rationale: Detailed explanation of the personalization logic.
    """
    # Parse JSON strings if they're strings
    breakdown = json.loads(discount_breakdown) if isinstance(discount_breakdown, str) else discount_breakdown
    validation = json.loads(margin_validation) if isinstance(margin_validation, str) else margin_validation
    details = json.loads(offer_details) if isinstance(offer_details, str) else offer_details

    personalized_data = {
        "personalizedPrice": personalized_price,
        "baseSuggestedPrice": base_suggested_price,
        "totalSavings": total_savings,
        "savingsPercentage": savings_percentage,
        "discountBreakdown": breakdown,
        "marginValidation": validation,
        "offerDetails": details,
        "rationale": rationale,
    }

    # Store for downstream use
    store.set("personalizedPricing", personalized_data)

    session_id = store.get_session_id()
    result = gql_client.update_pricing_field(session_id, "personalizedPricing", personalized_data)

    logger.info("gql_update_personalized_pricing: session=%s, price=%.2f",
                 session_id, personalized_price)
    return json.dumps({"personalizedPricing": personalized_data, "gql_result": result})


# ═══════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════

def _convert_decimals(obj):
    """Recursively convert DynamoDB Decimal types to float/int."""
    from decimal import Decimal
    if isinstance(obj, dict):
        return {k: _convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_convert_decimals(v) for v in obj]
    elif isinstance(obj, Decimal):
        return int(obj) if obj == int(obj) else float(obj)
    return obj
