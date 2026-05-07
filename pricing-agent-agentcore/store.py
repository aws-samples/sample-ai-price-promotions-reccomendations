"""
Inter-agent data store — replaces the original static LocalStore class.

Provides request-scoped key-value storage so agents can pass intermediate
results (demandForecast, webScrap) to downstream agents in the chain.

The store is reset at the start of each request via reset().
"""

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

_data: dict[str, Any] = {}


def reset():
    """Clear all stored data. Called at the start of each request."""
    global _data
    _data = {}
    logger.debug("Store reset")


def get(key: str) -> Optional[Any]:
    """Retrieve a value by key. Returns None if not found."""
    value = _data.get(key)
    logger.debug("store.get(%s) → %s", key, "found" if value is not None else "None")
    return value


def set(key: str, value: Any):
    """Store a value under the given key."""
    _data[key] = value
    logger.debug("store.set(%s)", key)


def get_session_id() -> str:
    """Shortcut: extract sessionID from the stored args."""
    args = get("args")
    if args and isinstance(args, dict):
        return args.get("sessionID", "")
    return ""


def get_product() -> dict:
    """Shortcut: extract product from the stored args."""
    args = get("args")
    if args and isinstance(args, dict):
        return args.get("product", {})
    return {}
