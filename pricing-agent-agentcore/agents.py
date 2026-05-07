"""
Agent definitions — creates all Strands Agent instances with their tools and prompts.

Architecture:
  Each agent uses a different model to showcase AgentCore's multi-model orchestration:
  - demand_forecast_agent: Claude Sonnet 4.5 (complex reasoning, confidence intervals)
  - web_scraper_agent:     Claude Haiku 4.5  (fast structured extraction, cost-effective)
  - margin_agent:          Amazon Nova Pro    (AWS-native, rule application)
  - personalization_agent: OpenAI gpt-oss-120b (cross-provider, Bedrock-hosted OpenAI)

The handler.py orchestrates these in sequence (Phase 1→2→3→4).
"""

import logging
from strands import Agent
from strands.models.bedrock import BedrockModel

import config
from prompts import (
    DEMAND_FORECAST_AGENT_SYSTEM_PROMPT,
    WEB_SCRAPER_AGENT_SYSTEM_PROMPT,
    SUPERVISOR_AGENT_SYSTEM_PROMPT,
    MARGIN_AGENT_SYSTEM_PROMPT,
)
from tools import (
    s3_lookup,
    get_local_storage,
    gql_update_demand_forecast,
    gql_update_web_scrap,
    gql_update_margin_analysis,
)

logger = logging.getLogger(__name__)


def create_demand_forecast_agent() -> Agent:
    """
    Phase 1 — Demand Forecast Agent
    Model: Claude Sonnet 4.5 (best reasoning for demand analysis & confidence intervals)
    """
    model = BedrockModel(model_id=config.CLAUDE_SONNET_4_5)
    return Agent(
        model=model,
        system_prompt=DEMAND_FORECAST_AGENT_SYSTEM_PROMPT,
        tools=[s3_lookup, get_local_storage, gql_update_demand_forecast],
    )


def create_web_scraper_agent() -> Agent:
    """
    Phase 2 — Web Scraper Agent
    Model: Claude Haiku 4.5 (fast, cost-effective for structured data extraction)
    Uses LLM knowledge of real competitor products and market prices.
    """
    model = BedrockModel(model_id=config.CLAUDE_HAIKU_4_5)
    return Agent(
        model=model,
        system_prompt=WEB_SCRAPER_AGENT_SYSTEM_PROMPT,
        tools=[s3_lookup, get_local_storage, gql_update_web_scrap],
    )


def create_margin_agent() -> Agent:
    """
    Phase 3 — Margin Agent
    Model: Amazon Nova Pro (AWS-native model, good at rule application & calculations)
    """
    model = BedrockModel(model_id=config.NOVA_PRO)
    return Agent(
        model=model,
        system_prompt=MARGIN_AGENT_SYSTEM_PROMPT,
        tools=[s3_lookup, get_local_storage, gql_update_margin_analysis],
    )


# Import personalization components
from prompts_personalization import PERSONALIZATION_AGENT_SYSTEM_PROMPT
from tools_personalization import (
    get_customer_profile,
    get_purchase_history,
    gql_update_personalized_pricing,
)


def create_personalization_agent() -> Agent:
    """
    Phase 4 — Personalization Agent
    Model: OpenAI gpt-oss-120b on Bedrock (cross-provider showcase)
    Note: OpenAI models on Bedrock require streaming=False for tool use.
    """
    model = BedrockModel(
        model_id=config.OPENAI_GPT_OSS,
        streaming=False,
    )
    return Agent(
        model=model,
        system_prompt=PERSONALIZATION_AGENT_SYSTEM_PROMPT,
        tools=[
            s3_lookup,
            get_local_storage,
            get_customer_profile,
            get_purchase_history,
            gql_update_personalized_pricing,
        ],
    )
