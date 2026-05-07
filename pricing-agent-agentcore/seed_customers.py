"""
Seed customer profiles and purchase history into DynamoDB.

Creates 13 customers across all loyalty tiers and personas,
plus purchase history records.

Usage:
    export AWS_REGION=<your-region>
    python seed_customers.py
"""

import json
import logging
import os
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

import boto3

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

REGION = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION"))
CUSTOMER_TABLE = os.environ.get("CUSTOMER_PROFILE_TABLE", "PricingAgent-CustomerProfiles")
HISTORY_TABLE = os.environ.get("PURCHASE_HISTORY_TABLE", "PricingAgent-PurchaseHistory")

dynamodb = boto3.resource("dynamodb", region_name=REGION)

# ═══════════════════════════════════════════════════════════════════════════
# Customer Profiles
# ═══════════════════════════════════════════════════════════════════════════

CUSTOMERS = [
    {
        "customerId": "cust-001",
        "email": "sarah.chen@example.com",
        "name": "Sarah Chen",
        "loyaltyTier": "gold",
        "loyaltyPoints": 12500,
        "memberSince": "2024-03-15",
        "annualSpend": Decimal("3200.00"),
        "paymentMethods": ["brand_credit_card", "debit_card"],
        "primaryPersona": "audiophile",
        "secondaryPersonas": ["early_adopter"],
        "preferences": {"brands": ["Sonora", "Audion"], "categories": ["headphones", "speakers"]},
    },
    {
        "customerId": "cust-002",
        "email": "marcus.johnson@example.com",
        "name": "Marcus Johnson",
        "loyaltyTier": "platinum",
        "loyaltyPoints": 45000,
        "memberSince": "2022-01-10",
        "annualSpend": Decimal("7500.00"),
        "paymentMethods": ["brand_credit_card", "store_gift_card"],
        "primaryPersona": "fitness_enthusiast",
        "secondaryPersonas": ["early_adopter"],
        "preferences": {"brands": ["Smart", "Silent"], "categories": ["smartwatches", "earbuds"]},
    },
    {
        "customerId": "cust-003",
        "email": "alex.rivera@example.com",
        "name": "Alex Rivera",
        "loyaltyTier": "silver",
        "loyaltyPoints": 3200,
        "memberSince": "2025-08-20",
        "annualSpend": Decimal("800.00"),
        "paymentMethods": ["store_gift_card"],
        "primaryPersona": "budget_conscious",
        "secondaryPersonas": [],
        "preferences": {"brands": [], "categories": ["routers", "chargers"]},
    },
    {
        "customerId": "cust-004",
        "email": "priya.patel@example.com",
        "name": "Priya Patel",
        "loyaltyTier": "platinum",
        "loyaltyPoints": 38000,
        "memberSince": "2022-06-01",
        "annualSpend": Decimal("6200.00"),
        "paymentMethods": ["brand_credit_card"],
        "primaryPersona": "movie_lover",
        "secondaryPersonas": ["audiophile"],
        "preferences": {"brands": ["Vision", "Audion"], "categories": ["tablets", "speakers"]},
    },
    {
        "customerId": "cust-005",
        "email": "james.wilson@example.com",
        "name": "James Wilson",
        "loyaltyTier": "gold",
        "loyaltyPoints": 15800,
        "memberSince": "2023-11-05",
        "annualSpend": Decimal("4100.00"),
        "paymentMethods": ["debit_card"],
        "primaryPersona": "early_adopter",
        "secondaryPersonas": [],
        "preferences": {"brands": ["Sonora", "Game"], "categories": ["headphones", "gaming mice"]},
    },
    {
        "customerId": "cust-006",
        "email": "emma.thompson@example.com",
        "name": "Emma Thompson",
        "loyaltyTier": "silver",
        "loyaltyPoints": 5600,
        "memberSince": "2025-02-14",
        "annualSpend": Decimal("1200.00"),
        "paymentMethods": ["brand_credit_card", "debit_card"],
        "primaryPersona": "fitness_enthusiast",
        "secondaryPersonas": ["budget_conscious"],
        "preferences": {"brands": ["Smart"], "categories": ["smartwatches"]},
    },
    {
        "customerId": "cust-007",
        "email": "david.kim@example.com",
        "name": "David Kim",
        "loyaltyTier": "standard",
        "loyaltyPoints": 200,
        "memberSince": "2026-01-20",
        "annualSpend": Decimal("150.00"),
        "paymentMethods": ["debit_card"],
        "primaryPersona": "budget_conscious",
        "secondaryPersonas": [],
        "preferences": {"brands": [], "categories": ["chargers", "keyboards"]},
    },
    {
        "customerId": "cust-008",
        "email": "lisa.nguyen@example.com",
        "name": "Lisa Nguyen",
        "loyaltyTier": "gold",
        "loyaltyPoints": 18200,
        "memberSince": "2023-07-22",
        "annualSpend": Decimal("3800.00"),
        "paymentMethods": ["brand_credit_card", "store_gift_card"],
        "primaryPersona": "audiophile",
        "secondaryPersonas": ["movie_lover"],
        "preferences": {"brands": ["Sonora", "Audion", "Silent"], "categories": ["headphones", "earbuds", "speakers"]},
    },
    {
        "customerId": "cust-009",
        "email": "carlos.garcia@example.com",
        "name": "Carlos Garcia",
        "loyaltyTier": "silver",
        "loyaltyPoints": 4100,
        "memberSince": "2025-05-10",
        "annualSpend": Decimal("950.00"),
        "paymentMethods": ["debit_card"],
        "primaryPersona": "movie_lover",
        "secondaryPersonas": [],
        "preferences": {"brands": ["Vision"], "categories": ["tablets"]},
    },
    {
        "customerId": "cust-010",
        "email": "rachel.brown@example.com",
        "name": "Rachel Brown",
        "loyaltyTier": "platinum",
        "loyaltyPoints": 52000,
        "memberSince": "2021-09-01",
        "annualSpend": Decimal("9800.00"),
        "paymentMethods": ["brand_credit_card", "store_gift_card", "debit_card"],
        "primaryPersona": "early_adopter",
        "secondaryPersonas": ["audiophile", "fitness_enthusiast"],
        "preferences": {"brands": ["Sonora", "Smart", "Game"], "categories": ["headphones", "smartwatches", "gaming mice"]},
    },
    {
        "customerId": "cust-011",
        "email": "kevin.zhang@example.com",
        "name": "Kevin Zhang",
        "loyaltyTier": "gold",
        "loyaltyPoints": 14200,
        "memberSince": "2023-09-12",
        "annualSpend": Decimal("3600.00"),
        "paymentMethods": ["brand_credit_card", "debit_card"],
        "primaryPersona": "gamer",
        "secondaryPersonas": ["early_adopter"],
        "preferences": {"brands": ["Game", "Key"], "categories": ["gaming mice", "keyboards", "headphones"]},
    },
    {
        "customerId": "cust-012",
        "email": "nina.patel@example.com",
        "name": "Nina Patel",
        "loyaltyTier": "silver",
        "loyaltyPoints": 4800,
        "memberSince": "2025-04-01",
        "annualSpend": Decimal("1100.00"),
        "paymentMethods": ["brand_credit_card"],
        "primaryPersona": "remote_worker",
        "secondaryPersonas": ["budget_conscious"],
        "preferences": {"brands": ["Web", "Key", "Sonora"], "categories": ["webcams", "headphones", "keyboards"]},
    },
    {
        "customerId": "cust-013",
        "email": "tom.nakamura@example.com",
        "name": "Tom Nakamura",
        "loyaltyTier": "platinum",
        "loyaltyPoints": 41000,
        "memberSince": "2022-03-20",
        "annualSpend": Decimal("6800.00"),
        "paymentMethods": ["brand_credit_card", "store_gift_card"],
        "primaryPersona": "traveler",
        "secondaryPersonas": ["fitness_enthusiast"],
        "preferences": {"brands": ["Silent", "Power", "Sonora"], "categories": ["headphones", "earbuds", "chargers"]},
    },
]

# ═══════════════════════════════════════════════════════════════════════════
# Purchase History
# ═══════════════════════════════════════════════════════════════════════════

def _generate_purchase_history():
    """Generate realistic purchase history for all customers."""
    import random  # nosec B311 - Used for deterministic seed data generation, not security
    random.seed(42)

    products = [
        ("SONORA-HP-PRO200", "headphones", 134.99, 149.99),
        ("AUDION-SP-MID100", "speakers", 79.99, 89.99),
        ("SILENT-EB-LITE100", "earbuds", 44.99, 59.99),
        ("VISION-TB-PRO100", "tablets", 249.99, 299.99),
        ("SMART-SW-MID100", "smartwatches", 89.99, 119.99),
        ("POWER-PC-LITE100", "chargers", 24.99, 34.99),
        ("KEY-KB-PRO100", "keyboards", 69.99, 89.99),
        ("WEB-WC-MID100", "webcams", 49.99, 69.99),
        ("GAME-MG-PRO100", "gaming mice", 59.99, 79.99),
        ("NET-WR-LITE100", "routers", 39.99, 49.99),
    ]

    orders = []
    base_date = datetime(2025, 1, 1)

    for cust in CUSTOMERS:
        cid = cust["customerId"]
        tier = cust["loyaltyTier"]
        persona = cust["primaryPersona"]

        # Number of orders based on tier
        num_orders = {"platinum": 12, "gold": 8, "silver": 5, "standard": 2}[tier]

        for i in range(num_orders):
            # Bias product selection toward persona
            if persona == "audiophile":
                weights = [5, 4, 4, 1, 1, 1, 1, 1, 1, 1]
            elif persona == "fitness_enthusiast":
                weights = [1, 1, 3, 1, 5, 1, 1, 1, 1, 1]
            elif persona == "movie_lover":
                weights = [1, 3, 1, 5, 1, 1, 1, 1, 1, 1]
            elif persona == "early_adopter":
                weights = [3, 2, 2, 3, 3, 1, 2, 2, 3, 1]
            elif persona == "gamer":
                weights = [2, 1, 1, 1, 1, 1, 4, 1, 5, 1]
            elif persona == "remote_worker":
                weights = [3, 1, 1, 1, 1, 1, 4, 5, 1, 2]
            elif persona == "traveler":
                weights = [4, 1, 4, 1, 1, 5, 1, 1, 1, 1]
            else:  # budget_conscious
                weights = [1, 1, 2, 1, 1, 3, 2, 1, 1, 3]

            prod = random.choices(products, weights=weights, k=1)[0]  # nosec B311
            sku, cat, paid, listed = prod

            # Apply some discount variation
            discount_pct = random.choice([0, 0, 5, 10, 15]) / 100  # nosec B311
            actual_paid = round(listed * (1 - discount_pct), 2)
            discount_type = "none" if discount_pct == 0 else random.choice(["promo", "loyalty"])  # nosec B311

            order_date = base_date + timedelta(days=random.randint(0, 450))  # nosec B311
            payment = random.choice(cust["paymentMethods"])  # nosec B311

            orders.append({
                "customerId": cid,
                "orderId": f"ORD-{uuid.uuid4().hex[:8].upper()}",
                "purchaseDate": order_date.isoformat(),
                "productId": sku,
                "category": cat,
                "paidPrice": Decimal(str(actual_paid)),
                "listPrice": Decimal(str(listed)),
                "discountType": discount_type,
                "discountAmount": Decimal(str(round(listed - actual_paid, 2))),
                "paymentMethod": payment,
                "rating": random.choice([None, 3, 4, 4, 5, 5]),  # nosec B311
            })

    return orders


# ═══════════════════════════════════════════════════════════════════════════
# Personalization Rules (S3)
# ═══════════════════════════════════════════════════════════════════════════

PERSONALIZATION_RULES = {
    "loyalty_discounts": {
        "platinum": {"percentage": 15, "max_cap_percentage": 20},
        "gold": {"percentage": 10, "max_cap_percentage": 15},
        "silver": {"percentage": 5, "max_cap_percentage": 10},
        "standard": {"percentage": 0, "max_cap_percentage": 0},
    },
    "payment_bonuses": {
        "brand_credit_card": {"percentage": 3},
        "store_gift_card": {"percentage": 2},
        "debit_card": {"percentage": 0},
        "credit_card": {"percentage": 0},
    },
    "persona_affinity": {
        "audiophile": {
            "matching_categories": ["headphones", "speakers", "earbuds"],
            "discount_percentage": 2,
        },
        "fitness_enthusiast": {
            "matching_categories": ["smartwatches", "earbuds"],
            "discount_percentage": 2,
        },
        "movie_lover": {
            "matching_categories": ["tablets", "speakers"],
            "discount_percentage": 2,
        },
        "early_adopter": {
            "matching_roles": ["best"],
            "discount_percentage": 3,
        },
        "budget_conscious": {
            "matching_categories": [],
            "discount_percentage": 0,
            "flash_deal_eligible": True,
        },
        "gamer": {
            "matching_categories": ["gaming mice", "keyboards", "headphones"],
            "discount_percentage": 2,
        },
        "remote_worker": {
            "matching_categories": ["webcams", "headphones", "keyboards"],
            "discount_percentage": 2,
        },
        "traveler": {
            "matching_categories": ["headphones", "earbuds", "chargers", "portable chargers"],
            "discount_percentage": 2,
        },
    },
    "offer_settings": {
        "default_expiry_days": 7,
        "max_total_discount_percentage": 25,
        "min_margin_override": False,
    },
}


# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("SEED CUSTOMER DATA")
    print(f"Region: {REGION}")
    print(f"Customer Table: {CUSTOMER_TABLE}")
    print(f"History Table: {HISTORY_TABLE}")
    print("=" * 60)

    # Seed customer profiles
    print(f"\n[1/3] Seeding {len(CUSTOMERS)} customer profiles...")
    cust_table = dynamodb.Table(CUSTOMER_TABLE)
    with cust_table.batch_writer() as batch:
        for cust in CUSTOMERS:
            batch.put_item(Item=cust)
    print(f"  ✓ {len(CUSTOMERS)} profiles written")

    # Seed purchase history
    orders = _generate_purchase_history()
    print(f"\n[2/3] Seeding {len(orders)} purchase history records...")
    hist_table = dynamodb.Table(HISTORY_TABLE)
    with hist_table.batch_writer() as batch:
        for order in orders:
            batch.put_item(Item=order)
    print(f"  ✓ {len(orders)} orders written")

    # Upload personalization rules to S3
    print("\n[3/3] Uploading personalization rules to S3...")
    bucket = os.environ.get("DATA_BUCKET", "")
    if bucket:
        s3 = boto3.client("s3", region_name=REGION)
        s3.put_object(
            Bucket=bucket,
            Key="data/personalization_rules.json",
            Body=json.dumps(PERSONALIZATION_RULES, indent=2),
            ContentType="application/json",
        )
        print(f"  ✓ personalization_rules.json → s3://{bucket}/data/")
    else:
        # Save locally
        os.makedirs("seed_output/data", exist_ok=True)
        with open("seed_output/data/personalization_rules.json", "w", encoding="utf-8") as f:
            json.dump(PERSONALIZATION_RULES, f, indent=2)
        print("  ✓ personalization_rules.json → seed_output/data/")

    # Summary
    tiers = {}
    personas = {}
    for c in CUSTOMERS:
        tiers[c["loyaltyTier"]] = tiers.get(c["loyaltyTier"], 0) + 1
        personas[c["primaryPersona"]] = personas.get(c["primaryPersona"], 0) + 1

    print(f"\n  Tiers:    {tiers}")
    print(f"  Personas: {personas}")
    print(f"  Orders:   {len(orders)}")
    print("\nDone!")


if __name__ == "__main__":
    main()
