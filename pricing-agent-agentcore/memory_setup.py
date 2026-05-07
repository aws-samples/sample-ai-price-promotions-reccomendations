"""
One-time setup script — creates AgentCore Memory resources.

Run once before deploying the agent:
    python memory_setup.py

Creates:
  1. Short-term memory (STM) — stores raw conversation turns within a session
  2. Long-term memory (LTM) — extracts pricing patterns and product preferences across sessions

Outputs a memory_config.json with the IDs to use in deployment.
"""

import json
import uuid

from bedrock_agentcore.memory import MemoryClient

import config

REGION = config.AWS_REGION


def main():
    client = MemoryClient(region_name=REGION)

    print("Creating AgentCore Memory resources for Retail Pricing Agent...\n")

    # -----------------------------------------------------------------------
    # Short-Term Memory: session-scoped conversation storage
    # -----------------------------------------------------------------------
    stm_name = f"PricingAgent_STM_{uuid.uuid4().hex[:8]}"
    stm = client.create_memory_and_wait(
        name=stm_name,
        strategies=[],  # No extraction — just raw conversation storage
        event_expiry_days=7,
        description="Short-term memory for pricing agent session conversations",
    )
    stm_id = stm.get("memoryId", stm.get("id", ""))
    print(f"  STM created: {stm_id}")
    print(f"    - Stores exact conversation messages")
    print(f"    - Remembers within the same session")
    print(f"    - 7-day retention")

    # -----------------------------------------------------------------------
    # Long-Term Memory: cross-session pricing patterns
    # -----------------------------------------------------------------------
    ltm_name = f"PricingAgent_LTM_{uuid.uuid4().hex[:8]}"
    ltm = client.create_memory_and_wait(
        name=ltm_name,
        strategies=[
            {
                "semanticMemoryStrategy": {
                    "name": "pricing_patterns",
                    "namespaces": ["/pricing/{actorId}/{sessionId}/"],
                }
            },
            {
                "userPreferenceMemoryStrategy": {
                    "name": "product_preferences",
                    "namespaces": ["/products/{actorId}/"],
                }
            },
        ],
        event_expiry_days=90,
        description="Long-term memory for pricing analysis patterns and product preferences",
    )
    ltm_id = ltm.get("memoryId", ltm.get("id", ""))
    print(f"\n  LTM created: {ltm_id}")
    print(f"    - Extracts pricing patterns automatically")
    print(f"    - Remembers product preferences across sessions")
    print(f"    - 90-day retention")

    # -----------------------------------------------------------------------
    # Save config
    # -----------------------------------------------------------------------
    output = {
        "stm_memory_id": stm_id,
        "ltm_memory_id": ltm_id,
        "region": REGION,
    }

    with open("memory_config.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"\nConfiguration saved to memory_config.json")
    print(f"\nFor deployment, set one of:")
    print(f"  export MEMORY_ID={stm_id}   # Short-term only")
    print(f"  export MEMORY_ID={ltm_id}   # Long-term (recommended)")


if __name__ == "__main__":
    main()
