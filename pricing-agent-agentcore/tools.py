"""
Strands @tool implementations — ported from the original tool_handler in utils.py.

Each tool is a standalone decorated function. Strands agents discover them
automatically via the tools=[...] list passed at agent construction time.

Tools:
  - s3_lookup            → fetches data files from S3 (demand_forecast, web_scrap, margin_rules)
  - get_local_storage    → reads inter-agent data from the request-scoped store
  - gql_update_demand_forecast  → persists demand analysis to DynamoDB via GraphQL
  - gql_update_web_scrap        → persists competitive analysis to DynamoDB via GraphQL
  - gql_update_margin_analysis  → persists final pricing boundaries to DynamoDB via GraphQL
"""

import json
import logging

import boto3
from strands import tool

import config
import store
import gql_client

logger = logging.getLogger(__name__)

s3 = boto3.client("s3", region_name=config.AWS_REGION)


# ═══════════════════════════════════════════════════════════════════════════
# S3 Lookup
# ═══════════════════════════════════════════════════════════════════════════

ALLOWED_S3_FILES = {
    "demand_forecast.json",
    "web_scrap.json",
    "margin_rules.json",
    "personalization_rules.json",
}


@tool
def s3_lookup(file_name: str) -> str:
    """Scan the S3 data bucket and return the contents of the file matching the given name.

    Use this to fetch product data, demand forecasts, competitor data, or margin rules.
    Available files: demand_forecast.json, web_scrap.json, margin_rules.json, personalization_rules.json

    Args:
        file_name: Name of the file to look up in the S3 data bucket.
    """
    # Validate file_name against allowlist to prevent arbitrary S3 key access
    if file_name not in ALLOWED_S3_FILES:
        return (
            f"Error: '{file_name}' is not a valid file name. "
            f"Allowed files: {sorted(ALLOWED_S3_FILES)}"
        )

    bucket = config.DATA_BUCKET
    if not bucket:
        return "Error: DATA_BUCKET environment variable not set"

    try:
        response = s3.list_objects_v2(Bucket=bucket, Prefix="data")
        if "Contents" not in response:
            return f"No files found in bucket: {bucket}"

        keys = [obj["Key"] for obj in response["Contents"]]
        match = next((k for k in keys if file_name in k), None)

        if not match:
            return f"'{file_name}' not found in bucket. Available: {keys}"

        obj = s3.get_object(Bucket=bucket, Key=match)
        content = obj["Body"].read().decode("utf-8")
        logger.info("s3_lookup: fetched %s (%d bytes)", match, len(content))
        return content

    except Exception as exc:
        logger.error("s3_lookup error: %s", exc)
        return f"Error accessing S3: {str(exc)}"


# ═══════════════════════════════════════════════════════════════════════════
# Local Storage (inter-agent data)
# ═══════════════════════════════════════════════════════════════════════════

@tool
def get_local_storage(key: str) -> str:
    """Retrieve data from the inter-agent local store by key.

    Available keys:
      - "args"           → product details, userID, sessionID
      - "demandForecast" → output from the Demand Forecast Agent
      - "webScrap"       → output from the Web Scraper Agent

    Args:
        key: Key of the stored object.
    """
    value = store.get(key)
    if value is None:
        return json.dumps({"result": None})
    return json.dumps({"result": value}, default=str)


# ═══════════════════════════════════════════════════════════════════════════
# GraphQL: Demand Forecast
# ═══════════════════════════════════════════════════════════════════════════

@tool
def gql_update_demand_forecast(
    recommended_price: float,
    price_floor: float = 0.0,
    price_ceiling: float = 0.0,
    pricing_rationale: str = "",
    current_confidence_score: float = 0.0,
    confidence_p10: float = 0.0,
    confidence_p50: float = 0.0,
    confidence_p90: float = 0.0,
) -> str:
    """Persist demand forecast analysis results to DynamoDB via a GraphQL mutation.

    Call this AFTER generating your demand forecast analysis to save results
    to the database and make them available to downstream agents.

    Args:
        recommended_price: Optimal price point based on demand analysis.
        price_floor: Minimum recommended price point.
        price_ceiling: Maximum recommended price point.
        pricing_rationale: Explanation of the pricing recommendation logic.
        current_confidence_score: Confidence score for current demand (0-1 scale).
        confidence_p10: 10th percentile of demand forecast confidence interval.
        confidence_p50: 50th percentile (median) of demand forecast confidence interval.
        confidence_p90: 90th percentile of demand forecast confidence interval.
    """
    forecast_data = {
        "recommendedPrice": recommended_price,
        "priceFloor": price_floor,
        "priceCeiling": price_ceiling,
        "pricingRationale": pricing_rationale,
        "currentConfidenceScore": current_confidence_score,
        "confidenceP10": confidence_p10,
        "confidenceP50": confidence_p50,
        "confidenceP90": confidence_p90,
    }

    # Store for downstream agents (Margin Agent reads this)
    store.set("demandForecast", forecast_data)

    session_id = store.get_session_id()
    result = gql_client.update_pricing_field(session_id, "demandForecast", forecast_data)

    logger.info("gql_update_demand_forecast: session=%s", session_id)
    return json.dumps({"demandForecast": forecast_data, "gql_result": result})


# ═══════════════════════════════════════════════════════════════════════════
# GraphQL: Web Scrap (Competitive Analysis)
# ═══════════════════════════════════════════════════════════════════════════

@tool
def gql_update_web_scrap(
    lowest_market_price: float,
    highest_market_price: float,
    average_market_price: float,
    median_market_price: float,
    primary_competitor: str,
    match_confidence_score: float,
    competitor_price_point: float,
    competitor_shipping_cost: float,
    competitor_total_cost: float,
    market_position_assessment: str,
    recommended_base_price: float,
    recommended_promo_price: float,
    price_position_strategy: str,
    competitive_advantage: str,
    pricing_logic_explanation: str,
    competitor_products: str = "[]",
) -> str:
    """Persist competitive pricing analysis results to DynamoDB via a GraphQL mutation.

    Call this AFTER generating your competitive analysis to save results
    to the database and make them available to downstream agents.

    Args:
        lowest_market_price: Lowest price found across all competitors.
        highest_market_price: Highest price found across all competitors.
        average_market_price: Mean price across all competitors.
        median_market_price: Median price across all competitors.
        primary_competitor: Name of the main competing retailer.
        match_confidence_score: Confidence level of product match (0-100).
        competitor_price_point: Current price at primary competitor.
        competitor_shipping_cost: Shipping cost at primary competitor.
        competitor_total_cost: Total customer cost including shipping at primary competitor.
        market_position_assessment: Analysis of market positioning (premium/mid-premium/mid-range/value).
        recommended_base_price: Recommended regular price based on competitive analysis.
        recommended_promo_price: Recommended promotional price point.
        price_position_strategy: Suggested pricing strategy (undercut/match/premium_position/value_leader).
        competitive_advantage: Key competitive advantage identified.
        pricing_logic_explanation: Detailed explanation of pricing recommendation logic.
        competitor_products: JSON array string of top competitor products found. Each item should have: name, price, rating, seller, source (e.g. "Amazon"). Example: [{"name":"Sony WH-1000XM5","price":278.00,"rating":"4.7","seller":"Sony","source":"Amazon"}]
    """
    web_scrap_data = {
        "lowestMarketPrice": lowest_market_price,
        "highestMarketPrice": highest_market_price,
        "averageMarketPrice": average_market_price,
        "medianMarketPrice": median_market_price,
        "primaryCompetitor": primary_competitor,
        "matchConfidenceScore": match_confidence_score,
        "competitorPricePoint": competitor_price_point,
        "competitorShippingCost": competitor_shipping_cost,
        "competitorTotalCost": competitor_total_cost,
        "marketPositionAssessment": market_position_assessment,
        "recommendedBasePrice": recommended_base_price,
        "recommendedPromoPrice": recommended_promo_price,
        "pricePositionStrategy": price_position_strategy,
        "competitiveAdvantage": competitive_advantage,
        "pricingLogicExplanation": pricing_logic_explanation,
        "competitorProducts": json.loads(competitor_products) if isinstance(competitor_products, str) else competitor_products,
    }

    # Store for downstream agents (Margin Agent reads this)
    store.set("webScrap", web_scrap_data)

    session_id = store.get_session_id()
    result = gql_client.update_pricing_field(session_id, "webScrap", web_scrap_data)

    logger.info("gql_update_web_scrap: session=%s", session_id)
    return json.dumps({"webScrap": web_scrap_data, "gql_result": result})


# ═══════════════════════════════════════════════════════════════════════════
# GraphQL: Margin Analysis
# ═══════════════════════════════════════════════════════════════════════════

@tool
def gql_update_margin_analysis(
    minimum_price: float,
    maximum_price: float,
    suggested_price: float,
    map_price: float,
    pricing_rationale: str = "",
    calculated_margin: float = 0.0,
    base_margin_rate: float = 0.0,
    adjusted_margin_rate: float = 0.0,
    margin_explanation: str = "",
    requires_review: bool = False,
    is_map_compliant: bool = True,
    is_margin_compliant: bool = True,
) -> str:
    """Persist final margin analysis and pricing boundaries to DynamoDB via a GraphQL mutation.

    Call this AFTER generating your margin analysis to save the final pricing
    boundaries to the database.

    Args:
        minimum_price: Lowest allowable price point based on margin rules.
        maximum_price: Highest recommended price point based on margin rules.
        suggested_price: Optimal price point balancing margin requirements and market factors.
        map_price: Minimum Advertised Price (MAP) if applicable.
        pricing_rationale: Explanation of the final pricing recommendation.
        calculated_margin: Actual margin percentage at the suggested price.
        base_margin_rate: Standard margin rate for the product category.
        adjusted_margin_rate: Margin rate after all adjustments are applied.
        margin_explanation: Detailed explanation of margin calculations.
        requires_review: Flag indicating if human review is recommended.
        is_map_compliant: Indicates if the suggested price complies with MAP requirements.
        is_margin_compliant: Indicates if the suggested price meets minimum margin requirements.
    """
    margin_data = {
        "minimumPrice": minimum_price,
        "maximumPrice": maximum_price,
        "suggestedPrice": suggested_price,
        "mapPrice": map_price,
        "pricingRationale": pricing_rationale,
        "calculatedMargin": calculated_margin,
        "baseMarginRate": base_margin_rate,
        "adjustedMarginRate": adjusted_margin_rate,
        "marginExplanation": margin_explanation,
        "requiresReview": requires_review,
        "isMapCompliant": is_map_compliant,
        "isMarginCompliant": is_margin_compliant,
    }

    session_id = store.get_session_id()
    result = gql_client.update_pricing_field(session_id, "marginAnalysis", margin_data)

    logger.info("gql_update_margin_analysis: session=%s", session_id)
    return json.dumps({"marginAnalysis": margin_data, "gql_result": result})
