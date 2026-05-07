# Personalized Pricing Recommendations — Approach Document

## Overview

Extend the Retail Pricing Agent to generate personalized price recommendations based on individual customer profiles. Instead of a single price for all customers, the system produces tailored discounts considering loyalty tier, payment method, and behavioral persona — offering exclusive pricing that goes beyond standard promotions.

---

## Customer Profile Dimensions

### 1. Loyalty Tier

| Tier | Discount Range | Qualification |
|------|---------------|---------------|
| Platinum | 12–20% off suggested price | 3+ years, $5K+ annual spend |
| Gold | 8–15% off suggested price | 1–3 years, $2K+ annual spend |
| Silver | 4–10% off suggested price | 6+ months, $500+ annual spend |
| Standard | 0% (base pricing only) | All other customers |

### 2. Payment Method

| Method | Additional Discount | Rationale |
|--------|-------------------|-----------|
| Brand Credit Card | 3–5% extra | Drives card adoption, higher LTV |
| Store Gift Card | 2–3% extra | Pre-committed spend, zero payment processing cost |
| Standard Payment | 0% | Baseline |

### 3. Behavioral Persona

| Persona | Detection Signals | Pricing Strategy |
|---------|------------------|-----------------|
| Audiophile | Repeat headphone/speaker purchases, high-end SKUs, reviews audio products | Premium bundle discounts on audio accessories, loyalty pricing on flagship models |
| Fitness Enthusiast | Smartwatch + earbuds purchases, fitness app integrations | Cross-category bundles (watch + earbuds), seasonal fitness campaign pricing |
| Movie Lover | Tablet + speaker purchases, streaming accessory history | Home entertainment bundles, display upgrade incentives |
| Tech Early Adopter | Day-1 purchases, pre-orders, latest model upgrades | Early access pricing, trade-in bonuses on new releases |
| Budget Conscious | Coupon usage, sale-only purchases, price comparison behavior | Targeted flash deals, layaway/installment incentives |

---

## Architecture

```mermaid
graph TB
    subgraph Frontend
        UI[Product Page]
        PROFILE[Customer Profile Widget]
    end

    subgraph AppSync
        GQL[GraphQL API]
    end

    subgraph AgentCore["AgentCore Runtime"]
        HANDLER[Orchestrator Handler]

        subgraph ExistingAgents["Existing Agents"]
            DA[Demand Forecast Agent]
            WA[Web Scraper Agent]
            MA[Margin Agent]
        end

        PA[Personalization Agent<br/>NEW]

        subgraph Memory["AgentCore Memory"]
            STM[Short-Term Memory<br/>Session context]
            LTM[Long-Term Memory<br/>Customer preferences<br/>Purchase history patterns]
        end
    end

    subgraph DataLayer["Data Layer"]
        DDB[(DynamoDB<br/>Pricing Records)]
        S3[(S3<br/>Product Data)]
        CUST[(DynamoDB<br/>Customer Profiles<br/>NEW)]
        HISTORY[(DynamoDB<br/>Purchase History<br/>NEW)]
    end

    UI -->|"getPricing(productId, customerId)"| GQL
    GQL --> HANDLER
    HANDLER --> DA
    HANDLER --> WA
    HANDLER --> MA
    MA -->|"base pricing"| PA
    PA -->|"reads"| CUST
    PA -->|"reads"| HISTORY
    PA -->|"recalls patterns"| LTM
    PA -->|"personalizedPricing"| DDB
    DDB -->|"subscription"| UI
    PROFILE -->|"displays"| UI
```

## Agent Chain — Extended Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Runtime as AgentCore Runtime
    participant Demand as Demand Agent
    participant Web as Web Scraper Agent
    participant Margin as Margin Agent
    participant Personal as Personalization Agent
    participant CustDB as Customer Profile DB
    participant Memory as AgentCore LTM
    participant DDB as DynamoDB

    User->>Frontend: Select product (logged in as customer)
    Frontend->>Runtime: resolverLambda(productId, customerId)

    rect rgb(230, 245, 255)
        Note over Runtime,DDB: Phase 1–3: Existing pricing chain (unchanged)
        Runtime->>Demand: Analyze demand
        Demand->>DDB: gql_update_demand_forecast
        Runtime->>Web: Analyze competitors
        Web->>DDB: gql_update_web_scrap
        Runtime->>Margin: Apply margin rules
        Margin->>DDB: gql_update_margin_analysis
    end

    rect rgb(255, 230, 255)
        Note over Runtime,Memory: Phase 4: Personalization (NEW)
        Runtime->>Personal: Personalize pricing for customer
        Personal->>CustDB: get_customer_profile(customerId)
        CustDB-->>Personal: Loyalty tier, payment methods, persona
        Personal->>Memory: Retrieve purchase patterns
        Memory-->>Personal: Historical preferences, brand affinity
        Note over Personal: Apply personalization rules:<br/>1. Loyalty tier discount<br/>2. Payment method bonus<br/>3. Persona-based offer<br/>4. Validate against margin floor
        Personal->>DDB: gql_update_personalized_pricing
        DDB-->>Frontend: Subscription update
    end

    Frontend->>User: Display personalized price + savings breakdown
```

---

## Data Model — New Tables

```mermaid
erDiagram
    CUSTOMER_PROFILE {
        string customerId PK "Cognito sub or external ID"
        string email "Customer email"
        string loyaltyTier "standard | silver | gold | platinum"
        int loyaltyPoints "Accumulated points"
        date memberSince "Membership start date"
        float annualSpend "Rolling 12-month spend"
        json paymentMethods "Array of payment types on file"
        string primaryPersona "audiophile | fitness | movie_lover | early_adopter | budget"
        json secondaryPersonas "Additional detected personas"
        json preferences "Brand preferences, category affinities"
        datetime lastUpdated "Profile refresh timestamp"
    }

    PURCHASE_HISTORY {
        string customerId PK "Links to customer profile"
        string orderId "Order identifier (sort key)"
        datetime purchaseDate "When the purchase was made"
        string productId "Product SKU"
        string category "Product category"
        float paidPrice "Actual price paid"
        float listPrice "Listed price at time of purchase"
        string discountType "loyalty | promo | personalized | none"
        float discountAmount "Discount applied"
        string paymentMethod "How they paid"
        int rating "Product rating given (1-5, nullable)"
    }

    PERSONALIZED_PRICING {
        string id PK "Pricing record ID"
        string customerId "Customer who received this price"
        string productId "Product SKU"
        float baseSuggestedPrice "From Margin Agent"
        float personalizedPrice "After all personalization"
        float totalDiscount "Total discount amount"
        json discountBreakdown "Itemized: loyalty, payment, persona"
        string loyaltyTier "Tier at time of pricing"
        string persona "Persona applied"
        string paymentIncentive "Payment method bonus applied"
        boolean isWithinMarginFloor "Validates minimum margin"
        string rationale "Explanation of personalization logic"
        datetime expiresAt "Offer expiration"
    }

    CUSTOMER_PROFILE ||--o{ PURCHASE_HISTORY : "has purchases"
    CUSTOMER_PROFILE ||--o{ PERSONALIZED_PRICING : "receives offers"
    PERSONALIZED_PRICING }o--|| PRICING : "extends base pricing"
```

---

## Personalization Agent — Design

### System Prompt (Summary)

The Personalization Agent receives the base pricing from the Margin Agent and the customer profile, then applies a layered discount strategy:

1. **Loyalty Discount** — percentage off based on tier, capped by category rules
2. **Payment Bonus** — additional percentage if customer has a brand credit card or gift card balance
3. **Persona Offer** — targeted discount or bundle based on behavioral persona (e.g., audiophile gets 5% extra on headphones, fitness enthusiast gets a watch+earbuds bundle price)
4. **Margin Floor Validation** — the final personalized price must never go below the promotional floor margin defined in margin rules
5. **Exclusivity Flag** — marks the offer as "personalized, not available via standard promotions"

### Tools

| Tool | Description |
|------|-------------|
| `get_customer_profile` | Reads customer profile from DynamoDB (loyalty tier, personas, payment methods) |
| `get_purchase_history` | Reads recent purchase history to detect patterns and validate persona |
| `retrieve_customer_memories` | Queries AgentCore LTM for long-term customer preferences and brand affinity |
| `gql_update_personalized_pricing` | Persists the personalized pricing to DynamoDB via GraphQL |

### Output Schema

```json
{
    "personalized_price": 114.99,
    "base_suggested_price": 134.99,
    "total_savings": 20.00,
    "savings_percentage": 14.8,
    "discount_breakdown": {
        "loyalty_discount": {
            "tier": "gold",
            "percentage": 10,
            "amount": 13.50
        },
        "payment_bonus": {
            "method": "brand_credit_card",
            "percentage": 3,
            "amount": 4.05
        },
        "persona_offer": {
            "persona": "audiophile",
            "type": "category_affinity",
            "percentage": 2,
            "amount": 2.70
        }
    },
    "margin_validation": {
        "final_margin": 42.1,
        "margin_floor": 35.0,
        "is_compliant": true
    },
    "offer_details": {
        "is_exclusive": true,
        "expires_at": "2026-04-16T23:59:59Z",
        "message": "Gold member exclusive: Save $20 on Sonora Pro Headphones with your brand card"
    },
    "rationale": "Gold tier loyalty (10%) + brand credit card (3%) + audiophile affinity (2%) = 14.8% personalized discount. Final price $114.99 maintains 42.1% margin above 35% floor."
}
```

---

## AgentCore Memory — Customer Intelligence

### Short-Term Memory (Session)

Stores the current pricing session context so the Personalization Agent knows what the Demand, Web Scraper, and Margin agents already determined.

### Long-Term Memory (Cross-Session)

Uses AgentCore Memory's semantic and user preference strategies to build persistent customer intelligence:

```python
memory = client.create_memory_and_wait(
    name="CustomerPricingMemory",
    strategies=[
        # Extracts customer preferences from interactions
        {"userPreferenceMemoryStrategy": {
            "name": "customer_preferences",
            "namespaces": ["/customers/{actorId}/preferences/"]
        }},
        # Extracts purchase patterns and brand affinity
        {"semanticMemoryStrategy": {
            "name": "purchase_patterns",
            "namespaces": ["/customers/{actorId}/patterns/"]
        }},
    ],
    event_expiry_days=365,
)
```

Over time, the LTM learns:
- Which brands a customer gravitates toward
- Price sensitivity (do they buy at full price or wait for sales?)
- Category preferences (audio heavy? wearables? computing?)
- Seasonal buying patterns (holiday gifter? back-to-school shopper?)

The Personalization Agent queries these memories to refine its discount strategy beyond the static rules.

---

## Frontend Changes

### Customer Profile Widget

Add a profile badge on the pricing page showing:
- Loyalty tier (with icon: 🥈 Silver, 🥇 Gold, 💎 Platinum)
- Active payment methods
- Detected persona
- "Your personalized price" callout with savings breakdown

### Personalized Pricing Panel

New panel alongside the existing Demand/Competitive/Margin panels:

```
┌─────────────────────────────────────────┐
│  💎 Your Personalized Price             │
│                                         │
│  $114.99  (was $134.99)                 │
│  ─────────────────────────              │
│  You save $20.00 (14.8%)               │
│                                         │
│  Breakdown:                             │
│  ├── Gold Member Discount    -$13.50    │
│  ├── Brand Card Bonus        -$4.05     │
│  └── Audiophile Reward       -$2.70     │
│                                         │
│  ⏰ Offer expires: Apr 16, 2026         │
│  🔒 Exclusive — not available publicly  │
└─────────────────────────────────────────┘
```

### GraphQL Schema Addition

```graphql
type PersonalizedPricing {
    personalizedPrice: Float
    baseSuggestedPrice: Float
    totalSavings: Float
    savingsPercentage: Float
    discountBreakdown: AWSJSON
    marginValidation: AWSJSON
    offerDetails: AWSJSON
    rationale: String
}

# Extend the existing Pricing type
type Pricing {
    # ... existing fields ...
    personalizedPricing: AWSJSON
}
```

---

## Implementation Plan

### Phase 1: Customer Profile Infrastructure (Week 1)

- Create `CustomerProfile` DynamoDB table with GSI on `loyaltyTier`
- Create `PurchaseHistory` DynamoDB table with GSI on `customerId`
- Seed synthetic customer profiles (10 customers across all tiers and personas)
- Seed purchase history data (50–100 orders) using Nova Lite
- Add `get_customer_profile` and `get_purchase_history` Strands tools

### Phase 2: Personalization Agent (Week 2)

- Write the Personalization Agent system prompt with discount rules
- Implement the `gql_update_personalized_pricing` tool
- Wire the agent as Phase 4 in the handler chain (after Margin Agent)
- Add personalization rules to S3 (`data/personalization_rules.json`):
  - Loyalty tier discount tables
  - Payment method bonus rates
  - Persona-category affinity matrix
  - Margin floor overrides for personalized pricing

### Phase 3: AgentCore Memory Integration (Week 2–3)

- Create LTM memory resource with `userPreferenceMemoryStrategy` and `semanticMemoryStrategy`
- Save purchase events to memory after each pricing decision
- Add `retrieve_customer_memories` tool that queries LTM for customer patterns
- Train the memory with historical purchase data

### Phase 4: Frontend (Week 3)

- Add customer profile selector to the Home page (dropdown or login-based)
- Create `PersonalizedPricingPanel` component
- Add `personalizedPricing` field to the GraphQL subscription
- Display savings breakdown with tier badge and expiration

### Phase 5: Validation & Guardrails (Week 3–4)

- Ensure personalized price never goes below margin promotional floor
- Add audit logging for every personalized offer (who, what, why, when)
- Implement offer expiration (7-day default, configurable per tier)
- Add A/B testing flag to compare personalized vs. standard pricing conversion rates
- Rate limiting: max 3 personalized price requests per customer per product per day

---

## Example Scenarios

### Scenario 1: Gold Member + Brand Card + Audiophile

```
Customer: Sarah Chen (Gold, 2 years, $3.2K annual spend)
Product: SONORA-HP-PRO200 (Suggested: $134.99)
Payment: Brand Credit Card

Personalization:
  Gold loyalty:     -10% = -$13.50
  Brand card:        -3% = -$4.05
  Audiophile (headphones category match): -2% = -$2.70

Personalized Price: $114.74
Margin check: 42.1% (floor: 35%) ✅
Offer: "Gold member exclusive — save $20.25 on Sonora Pro Headphones"
```

### Scenario 2: Platinum Member + Fitness Enthusiast

```
Customer: Marcus Johnson (Platinum, 4 years, $7.5K annual spend)
Product: SMART-SW-MID100 Smartwatch (Suggested: $89.99)
Payment: Standard

Personalization:
  Platinum loyalty: -15% = -$13.50
  Fitness persona (smartwatch category match): -3% = -$2.70

Personalized Price: $73.79
Margin check: 38.2% (floor: 30%) ✅
Offer: "Platinum exclusive — your fitness reward price on Smart Fit Watch"
```

### Scenario 3: Silver Member + Budget Conscious

```
Customer: Alex Rivera (Silver, 8 months, $800 annual spend)
Product: NET-WR-LITE100 Router (Suggested: $49.99)
Payment: Store Gift Card

Personalization:
  Silver loyalty:    -5% = -$2.50
  Gift card bonus:   -2% = -$1.00
  Budget persona: flash deal eligible (no extra %)

Personalized Price: $46.49
Margin check: 28.5% (floor: 25%) ✅
Offer: "Silver member deal — extra savings with your gift card balance"
```

### Scenario 4: Margin Floor Protection

```
Customer: Premium member requesting deep discount on low-margin entry product
Product: ECHO-SP-ENT110 Speaker (Suggested: $34.99, cost: $22.00)
Payment: Brand Card

Personalization attempt:
  Platinum loyalty: -15% = -$5.25
  Brand card:        -3% = -$1.05
  Persona bonus:     -2% = -$0.70

Calculated price: $27.99 → Margin: 21.4%
Margin floor: 25% → VIOLATION

Resolution: Cap discount at margin floor
  Adjusted price: $29.33 (25% margin)
  Actual discount: 16.2% instead of 20%
  Flag: "Discount capped to maintain minimum margin"
```
