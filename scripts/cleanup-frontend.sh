#!/usr/bin/env bash
#
# cleanup-frontend.sh — Tear down the frontend CloudFront distribution and S3 bucket
#
# Usage:
#   chmod +x scripts/cleanup-frontend.sh
#   ./scripts/cleanup-frontend.sh [--region <your-region>]

set -euo pipefail

REGION="${AWS_REGION:-us-west-2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_CONFIG="$REPO_ROOT/pricing-agent-agentcore/deployment.json"

while [[ $# -gt 0 ]]; do
    case $1 in
        --region) REGION="$2"; shift 2 ;;
        -h|--help) echo "Usage: $0 [--region REGION]"; exit 0 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

export AWS_REGION="$REGION"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
WEBSITE_BUCKET="pricing-agent-frontend-${ACCOUNT}-${REGION}"

# Try to read CloudFront distribution ID from deployment config
CF_DIST=""
if [[ -f "$DEPLOY_CONFIG" ]]; then
    CF_DIST=$(jq -r '.cloudfrontDistributionId // empty' "$DEPLOY_CONFIG" 2>/dev/null || echo "")
fi

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  FRONTEND CLEANUP                                           ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Region:       $REGION"
echo "║  S3 Bucket:    $WEBSITE_BUCKET"
echo "║  CloudFront:   ${CF_DIST:-not found}"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
read -p "⚠️  This will delete the frontend deployment. Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 1: Disable and delete CloudFront distribution
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ [1/3] Deleting CloudFront distribution ━━━"

if [[ -n "$CF_DIST" ]]; then
    # Get current config and ETag
    DIST_CONFIG=$(aws cloudfront get-distribution-config --id "$CF_DIST" 2>/dev/null || echo "")

    if [[ -n "$DIST_CONFIG" ]]; then
        ETAG=$(echo "$DIST_CONFIG" | jq -r '.ETag')
        IS_ENABLED=$(echo "$DIST_CONFIG" | jq -r '.DistributionConfig.Enabled')

        if [[ "$IS_ENABLED" == "true" ]]; then
            echo "  Disabling distribution..."
            echo "$DIST_CONFIG" | jq '.DistributionConfig.Enabled = false | .DistributionConfig' > /tmp/cf-disable.json
            aws cloudfront update-distribution \
                --id "$CF_DIST" \
                --if-match "$ETAG" \
                --distribution-config file:///tmp/cf-disable.json > /dev/null

            echo "  Waiting for distribution to deploy (this can take several minutes)..."
            aws cloudfront wait distribution-deployed --id "$CF_DIST" 2>/dev/null || true
            rm -f /tmp/cf-disable.json

            # Get fresh ETag after disable
            ETAG=$(aws cloudfront get-distribution-config --id "$CF_DIST" --query 'ETag' --output text)
        fi

        echo "  Deleting distribution..."
        aws cloudfront delete-distribution --id "$CF_DIST" --if-match "$ETAG" 2>/dev/null || echo "  ⚠ Could not delete (may still be deploying — retry in a few minutes)"
        echo "  ✓ CloudFront distribution deleted"
    else
        echo "  ⚠ Distribution $CF_DIST not found — may already be deleted"
    fi

    # Delete OAC
    OAC_ID=$(aws cloudfront list-origin-access-controls \
        --query "OriginAccessControlList.Items[?Name=='pricing-oac-${ACCOUNT}'].Id" \
        --output text 2>/dev/null || echo "")
    if [[ -n "$OAC_ID" && "$OAC_ID" != "None" ]]; then
        OAC_ETAG=$(aws cloudfront get-origin-access-control --id "$OAC_ID" --query 'ETag' --output text 2>/dev/null || echo "")
        if [[ -n "$OAC_ETAG" ]]; then
            aws cloudfront delete-origin-access-control --id "$OAC_ID" --if-match "$OAC_ETAG" 2>/dev/null || true
            echo "  ✓ OAC deleted"
        fi
    fi
else
    echo "  ⚠ No CloudFront distribution ID found — skipping"
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 2: Delete S3 website bucket
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ [2/3] Deleting S3 website bucket ━━━"

if aws s3 ls "s3://${WEBSITE_BUCKET}" --region "$REGION" 2>/dev/null; then
    aws s3 rm "s3://${WEBSITE_BUCKET}" --recursive --region "$REGION" --quiet
    aws s3 rb "s3://${WEBSITE_BUCKET}" --region "$REGION"
    echo "  ✓ Bucket deleted: $WEBSITE_BUCKET"
else
    echo "  ⚠ Bucket not found — already deleted"
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 3: Clean local build artifacts
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ [3/3] Cleaning local files ━━━"

rm -rf "$REPO_ROOT/pricing-agent-ui/dist"
rm -f "$REPO_ROOT/pricing-agent-ui/.env.production"

# Remove frontend fields from deployment.json
if [[ -f "$DEPLOY_CONFIG" ]]; then
    jq 'del(.frontendUrl, .cloudfrontDistributionId, .websiteBucket)' \
        "$DEPLOY_CONFIG" > /tmp/deploy-cleaned.json && mv /tmp/deploy-cleaned.json "$DEPLOY_CONFIG"
fi

echo "  ✓ Local artifacts cleaned"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ FRONTEND CLEANUP COMPLETE                               ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Deleted:                                                    ║"
echo "║    - CloudFront distribution                                 ║"
echo "║    - Origin Access Control                                   ║"
echo "║    - S3 website bucket                                       ║"
echo "║    - Local build artifacts                                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
