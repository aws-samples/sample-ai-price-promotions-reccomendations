"""
AgentCore Memory integration — replaces the original ThreadManager + InMemoryChatStorage.

The original system used:
  - InMemoryChatStorage: stored agent chat messages in-memory
  - ThreadManager: daemon thread polling chat storage every 5s, pushing to GraphQL

This module provides:
  - save_conversation_event(): persists a conversation turn to AgentCore Memory
  - get_recent_turns(): retrieves recent conversation history
  - push_bot_responses(): pushes chat messages to GraphQL for real-time subscriptions
"""

import json
import logging
from typing import Optional

import config
import gql_client

logger = logging.getLogger(__name__)

# Lazy-init the memory client only if MEMORY_ID is set
_memory_client = None


def _get_memory_client():
    """Lazy-initialize the AgentCore Memory client."""
    global _memory_client
    if _memory_client is not None:
        return _memory_client

    if not config.MEMORY_ID:
        return None

    try:
        from bedrock_agentcore.memory import MemoryClient
        _memory_client = MemoryClient(region_name=config.AWS_REGION)
        logger.info("AgentCore Memory client initialized: memory_id=%s", config.MEMORY_ID)
        return _memory_client
    except Exception as exc:
        logger.warning("Failed to initialize AgentCore Memory: %s", exc)
        return None


def save_conversation_event(
    user_id: str,
    session_id: str,
    user_message: str,
    assistant_message: str,
):
    """
    Persist a conversation turn (user + assistant) to AgentCore Memory.
    This replaces the original InMemoryChatStorage + ThreadManager pattern.
    """
    client = _get_memory_client()
    if not client:
        logger.debug("Memory not configured — skipping save")
        return None

    try:
        event = client.create_event(
            memory_id=config.MEMORY_ID,
            actor_id=user_id,
            session_id=session_id,
            messages=[
                (user_message, "USER"),
                (assistant_message, "ASSISTANT"),
            ],
        )
        logger.info("Saved conversation event: %s", event.get("eventId"))
        return event
    except Exception as exc:
        logger.warning("Failed to save conversation event: %s", exc)
        return None


def save_tool_event(
    user_id: str,
    session_id: str,
    tool_name: str,
    tool_output: str,
):
    """
    Persist a tool invocation result to AgentCore Memory.
    Useful for tracking intermediate agent outputs (demand forecast, web scrap).
    """
    client = _get_memory_client()
    if not client:
        return None

    try:
        event = client.create_event(
            memory_id=config.MEMORY_ID,
            actor_id=user_id,
            session_id=session_id,
            messages=[
                (f"Tool: {tool_name}", "USER"),
                (tool_output, "TOOL"),
            ],
        )
        return event
    except Exception as exc:
        logger.warning("Failed to save tool event: %s", exc)
        return None


def get_recent_turns(
    user_id: str,
    session_id: str,
    k: int = 5,
) -> list:
    """
    Retrieve the last K conversation turns from AgentCore Memory.
    Returns a list of turn lists, where each turn contains message dicts.
    """
    client = _get_memory_client()
    if not client:
        return []

    try:
        turns = client.get_last_k_turns(
            memory_id=config.MEMORY_ID,
            actor_id=user_id,
            session_id=session_id,
            k=k,
        )
        return turns
    except Exception as exc:
        logger.warning("Failed to retrieve turns: %s", exc)
        return []


def push_bot_responses(session_id: str, messages: list):
    """
    Push chat messages to the botResponses field via GraphQL.
    This triggers the onPricingById subscription for real-time frontend updates.

    Replaces the original ThreadManager._worker() polling loop.
    Called explicitly after each agent completes instead of polling.
    """
    if not messages:
        return

    try:
        bot_responses = []
        for msg in messages:
            content = msg.get("content", "")
            bot_responses.append({
                "role": msg.get("role", "assistant"),
                "content": [{"text": content}] if isinstance(content, str) else content,
            })

        gql_client.update_bot_responses(session_id, bot_responses)
        logger.info("Pushed %d bot responses for session %s", len(bot_responses), session_id)
    except Exception as exc:
        logger.warning("Failed to push bot responses: %s", exc)
