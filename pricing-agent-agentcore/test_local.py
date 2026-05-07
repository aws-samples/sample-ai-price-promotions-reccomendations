"""
Local testing script — invoke the handler directly without deploying to AgentCore.

Usage:
    export DATA_BUCKET=your-bucket-name
    export GRAPH_API_URL=https://your-appsync-endpoint/graphql
    python test_local.py
"""

import json
import os
import logging

logging.basicConfig(level=logging.INFO, format="%(name)s %(levelname)s %(message)s")

# Set test environment variables if not already set
os.environ.setdefault("DATA_BUCKET", "your-data-bucket")
os.environ.setdefault("GRAPH_API_URL", "https://your-appsync-endpoint/graphql")
os.environ.setdefault("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "us-west-2"))

from handler import invoke


class MockContext:
    """Mock AgentCore RequestContext for local testing."""
    session_id = "test-session-001"


def main():
    test_product = {
        "name": "CRAFTSMAN V20 Cordless Circular Saw",
        "sku": "CMAN-SAW-PRO725",
        "department": "Power Tools",
        "class": "Circular Saws",
        "role": "best",
        "cost": 85.00,
        "msrp": 179.99,
        "map": 149.99,
        "current_price": 169.99,
        "voltage": "20V",
        "features": ["brushless motor", "LED light", "dust blower"],
        "ytd_units_sold": 450,
        "ytd_target": 500,
        "season": "spring",
    }

    payload = {
        "product": test_product,
        "pricing_id": "test-pricing-001",
        "user_id": "test-user-001",
        "host": "",
        "auth_token": "",
    }

    print("=" * 60)
    print("LOCAL TEST: Retail Pricing Agent")
    print("=" * 60)
    print(f"Product: {test_product['name']}")
    print(f"SKU: {test_product['sku']}")
    print(f"Cost: ${test_product['cost']}")
    print(f"MSRP: ${test_product['msrp']}")
    print(f"MAP: ${test_product['map']}")
    print("=" * 60)

    result = invoke(payload, MockContext())

    print("\n" + "=" * 60)
    print("RESULT:")
    print("=" * 60)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
