#!/usr/bin/env bash
#
# cleanup.sh — Tear down all Retail Pricing Agent resources
#
# Destroys in reverse order:
#   1. AgentCore Runtime + Memory
#   2. AgentCore S3 artifacts
#   3. Cognito demo user
#   4. CDK stack (S3, Cognito, AppSync, DynamoDB, Lambda)
#   5. Frontend CloudFront + S3 (if deployed)
#   6. Local generated files
#
# Usage:
#   chmod +x scripts/cleanup.sh
#   ./scripts/cleanup.sh [--region <your-region>] [--keep-local]

set -euo pipefail

REGION="${AWS_REGION:-us-west-2}"
KEEP_LOCAL=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/pricing-agent-agentcore"
INFRA_DIR="$BACKEND_DIR/infra"
FRONTEND_DIR="$REPO_ROOT/pricing-agent-ui"

while [[ $# -gt 0 ]]; do
    case $1 in
        --region)      REGION="$2"; shift 2 ;;
        --keep-local)  KEEP_LOCAL=true; shift ;;
        -h|--help)     echo "Usage: $0 [--region REGION] [--keep-local]"; exit 0 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

export AWS_REGION="$REGION"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
BUCKET="pricing-agent-data-${ACCOUNT}-${REGION}"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  RETAIL PRICING AGENT — CLEANUP                             ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Account:  $ACCOUNT"
echo "║  Region:   $REGION"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
read -p "⚠️  This will PERMANENTLY DELETE all resources. Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 1: Delete AgentCore Runtime + Memory
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ [1/6] Deleting AgentCore Runtime ━━━"

if [[ -f "$BACKEND_DIR/.venv/bin/activate" ]]; then
    source "$BACKEND_DIR/.venv/bin/activate"
fi

if [[ -f "$BACKEND_DIR/.bedrock_agentcore.yaml" ]]; then
    AGENT_ARN=$(python3 -c "
import yaml
try:
    with open('$BACKEND_DIR/.bedrock_agentcore.yaml') as f:
        cfg = yaml.safe_load(f)
    agent_name = cfg.get('default_agent', 'handler')
    print(cfg['agents'][agent_name].get('bedrock_agentcore', {}).get('agent_arn', ''))
except: print('')
" 2>/dev/null || echo "")

    MEMORY_ID=$(python3 -c "
import yaml
try:
    with open('$BACKEND_DIR/.bedrock_agentcore.yaml') as f:
        cfg = yaml.safe_load(f)
    agent_name = cfg.get('default_agent', 'handler')
    print(cfg['agents'][agent_name].get('memory', {}).get('memory_id', ''))
except: print('')
" 2>/dev/null || echo "")

    RUNTIME_ID=$(echo "$AGENT_ARN" | grep -oP 'runtime/\K.*' || echo "")

    # Clean up custom IAM policy on AgentCore role
    AGENTCORE_ROLE=$(python3 -c "
import yaml
try:
    with open('$BACKEND_DIR/.bedrock_agentcore.yaml') as f:
        cfg = yaml.safe_load(f)
    agent_name = cfg.get('default_agent', 'handler')
    print(cfg['agents'][agent_name]['aws']['execution_role'].split('/')[-1])
except: print('')
" 2>/dev/null || echo "")

    if [[ -n "$AGENTCORE_ROLE" ]]; then
        aws iam delete-role-policy \
            --role-name "$AGENTCORE_ROLE" \
            --policy-name DynamoDBCustomerAccess \
            2>/dev/null || true
        echo "  ✓ Removed custom IAM policies"
    fi

    if [[ -n "$RUNTIME_ID" ]]; then
        echo "  Deleting runtime: $RUNTIME_ID"
        aws bedrock-agentcore delete-agent-runtime \
            --agent-runtime-id "$RUNTIME_ID" \
            --region "$REGION" 2>/dev/null || echo "  (already deleted)"
    fi

    if [[ -n "$MEMORY_ID" ]]; then
        echo "  Deleting memory: $MEMORY_ID"
        aws bedrock-agentcore-control delete-memory \
            --memory-id "$MEMORY_ID" \
            --client-token "$(uuidgen)" \
            --region "$REGION" 2>/dev/null || echo "  (already deleted)"
    fi
    echo "  ✓ AgentCore resources deleted"
else
    echo "  ⚠ No .bedrock_agentcore.yaml found — skipping"
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 2: Clean AgentCore S3 artifacts
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ [2/6] Cleaning AgentCore S3 artifacts ━━━"

AGENTCORE_BUCKET="bedrock-agentcore-codebuild-sources-${ACCOUNT}-${REGION}"
if aws s3 ls "s3://${AGENTCORE_BUCKET}" --region "$REGION" 2>/dev/null; then
    aws s3 rm "s3://${AGENTCORE_BUCKET}/handler/" --recursive --region "$REGION" --quiet 2>/dev/null || true
    echo "  ✓ Cleaned handler artifacts"
else
    echo "  ⚠ Artifacts bucket not found — skipping"
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 3: Delete Cognito user
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ [3/6] Deleting Cognito demo user ━━━"

USER_POOL_ID=""
if [[ -f "$BACKEND_DIR/deployment.json" ]]; then
    USER_POOL_ID=$(jq -r '.userPoolId // empty' "$BACKEND_DIR/deployment.json" 2>/dev/null || echo "")
fi

if [[ -n "$USER_POOL_ID" ]]; then
    aws cognito-idp admin-delete-user \
        --user-pool-id "$USER_POOL_ID" --username "demo@example.com" \
        --region "$REGION" 2>/dev/null || true
    echo "  ✓ Demo user deleted"
else
    echo "  ⚠ User pool ID not found — skipping"
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 4: Destroy CDK stack
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ [4/6] Destroying CDK stack ━━━"

if [[ -d "$INFRA_DIR/.venv" ]]; then
    cd "$INFRA_DIR"
    source .venv/bin/activate
    JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1 cdk destroy PricingAgent \
        --force --region "$REGION" 2>&1 || echo "  ⚠ CDK destroy had issues"
    cd "$REPO_ROOT"
    source "$BACKEND_DIR/.venv/bin/activate" 2>/dev/null || true
    echo "  ✓ CDK stack destroyed"
else
    aws cloudformation delete-stack --stack-name PricingAgent --region "$REGION" 2>/dev/null || true
    aws cloudformation wait stack-delete-complete --stack-name PricingAgent --region "$REGION" 2>/dev/null || true
    echo "  ✓ Stack deleted"
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 5: Delete frontend CloudFront + S3 (if deployed)
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ [5/6] Cleaning frontend resources ━━━"

WEBSITE_BUCKET="pricing-agent-frontend-${ACCOUNT}-${REGION}"
if aws s3 ls "s3://${WEBSITE_BUCKET}" --region "$REGION" 2>/dev/null; then
    aws s3 rm "s3://${WEBSITE_BUCKET}" --recursive --region "$REGION" --quiet 2>/dev/null || true
    aws s3 rb "s3://${WEBSITE_BUCKET}" --region "$REGION" 2>/dev/null || true
    echo "  ✓ Frontend S3 bucket deleted"
else
    echo "  ⚠ Frontend bucket not found — skipping"
fi

if [[ -f "$BACKEND_DIR/deployment.json" ]]; then
    CF_DIST=$(jq -r '.cloudfrontDistributionId // empty' "$BACKEND_DIR/deployment.json" 2>/dev/null || echo "")
    if [[ -n "$CF_DIST" ]]; then
        echo "  ⚠ CloudFront distribution $CF_DIST must be disabled and deleted manually"
        echo "    aws cloudfront get-distribution-config --id $CF_DIST"
    fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 6: Clean local files
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ [6/6] Cleaning local files ━━━"

if [[ "$KEEP_LOCAL" == false ]]; then
    rm -rf "$BACKEND_DIR/seed_output"
    rm -f "$BACKEND_DIR/deployment.json"
    rm -f "$BACKEND_DIR/memory_config.json"
    rm -f "$BACKEND_DIR/.bedrock_agentcore.yaml"
    rm -f "$FRONTEND_DIR/.env.local"
    rm -f "$FRONTEND_DIR/.env.production"
    rm -f /tmp/cdk-outputs.json
    echo "  ✓ Local files cleaned"
else
    echo "  ⚠ Keeping local files (--keep-local)"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ CLEANUP COMPLETE                                        ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Deleted: AgentCore Runtime + Memory, CDK Stack,             ║"
echo "║           Cognito user, S3 artifacts, local files            ║"
echo "║                                                              ║"
echo "║  NOT deleted (manual cleanup if needed):                     ║"
echo "║    - CDK bootstrap stack (CDKToolkit)                        ║"
echo "║    - CloudFront distribution (if frontend was deployed)      ║"
echo "║    - Python virtual environments (.venv)                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
