#!/usr/bin/env bash
#
# deploy-frontend.sh — Build and deploy the React frontend to S3 + CloudFront
#
# Usage:
#   chmod +x scripts/deploy-frontend.sh
#   ./scripts/deploy-frontend.sh [--region <your-region>]
#
# Prerequisites:
#   - Node.js 20+
#   - pricing-agent-agentcore/deployment.json must exist (run deploy.sh first)

set -euo pipefail

REGION="${AWS_REGION:-us-west-2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/pricing-agent-agentcore"
FRONTEND_DIR="$REPO_ROOT/pricing-agent-ui"
DEPLOY_CONFIG="$BACKEND_DIR/deployment.json"

while [[ $# -gt 0 ]]; do
    case $1 in
        --region) REGION="$2"; shift 2 ;;
        -h|--help) echo "Usage: $0 [--region REGION]"; exit 0 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

export AWS_REGION="$REGION"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

if [[ ! -f "$DEPLOY_CONFIG" ]]; then
    echo "ERROR: $DEPLOY_CONFIG not found. Run scripts/deploy.sh first."
    exit 1
fi

if [[ ! -d "$FRONTEND_DIR" ]]; then
    echo "ERROR: $FRONTEND_DIR not found."
    exit 1
fi

GRAPH_API_URL=$(jq -r '.graphApiUrl' "$DEPLOY_CONFIG")
USER_POOL_ID=$(jq -r '.userPoolId' "$DEPLOY_CONFIG")
USER_POOL_CLIENT_ID=$(jq -r '.userPoolClientId' "$DEPLOY_CONFIG")
IDENTITY_POOL_ID=$(jq -r '.identityPoolId' "$DEPLOY_CONFIG")
DATA_BUCKET=$(jq -r '.bucket' "$DEPLOY_CONFIG")
WEBSITE_BUCKET="pricing-agent-frontend-${ACCOUNT}-${REGION}"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  FRONTEND DEPLOYMENT — S3 + CloudFront                      ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Region:   $REGION"
echo "║  Bucket:   $WEBSITE_BUCKET"
echo "║  AppSync:  $GRAPH_API_URL"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: S3 bucket
echo "━━━ [1/5] Creating S3 website bucket ━━━"
if aws s3 ls "s3://${WEBSITE_BUCKET}" --region "$REGION" 2>/dev/null; then
    echo "  ✓ Bucket already exists"
else
    aws s3 mb "s3://${WEBSITE_BUCKET}" --region "$REGION"
    echo "  ✓ Bucket created"
fi
aws s3 website "s3://${WEBSITE_BUCKET}" --index-document index.html --error-document index.html --region "$REGION"

# Step 2: CloudFront
echo ""
echo "━━━ [2/5] Setting up CloudFront ━━━"
EXISTING_DIST=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[0].DomainName=='${WEBSITE_BUCKET}.s3.${REGION}.amazonaws.com'].Id" --output text 2>/dev/null || echo "")

if [[ -n "$EXISTING_DIST" && "$EXISTING_DIST" != "None" ]]; then
    DISTRIBUTION_ID="$EXISTING_DIST"
    CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution --id "$DISTRIBUTION_ID" --query "Distribution.DomainName" --output text)
    echo "  ✓ Using existing: $DISTRIBUTION_ID"
else
    OAC_ID=$(aws cloudfront create-origin-access-control --origin-access-control-config "{\"Name\":\"pricing-oac-${ACCOUNT}\",\"OriginAccessControlOriginType\":\"s3\",\"SigningBehavior\":\"always\",\"SigningProtocol\":\"sigv4\"}" --query "OriginAccessControl.Id" --output text 2>/dev/null || \
        aws cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='pricing-oac-${ACCOUNT}'].Id" --output text 2>/dev/null || echo "")

    DIST_RESULT=$(aws cloudfront create-distribution --distribution-config "{\"CallerReference\":\"pricing-$(date +%s)\",\"Comment\":\"Pricing Agent Frontend\",\"Enabled\":true,\"DefaultRootObject\":\"index.html\",\"Origins\":{\"Quantity\":1,\"Items\":[{\"Id\":\"S3\",\"DomainName\":\"${WEBSITE_BUCKET}.s3.${REGION}.amazonaws.com\",\"S3OriginConfig\":{\"OriginAccessIdentity\":\"\"},\"OriginAccessControlId\":\"${OAC_ID}\"}]},\"DefaultCacheBehavior\":{\"TargetOriginId\":\"S3\",\"ViewerProtocolPolicy\":\"redirect-to-https\",\"AllowedMethods\":{\"Quantity\":2,\"Items\":[\"GET\",\"HEAD\"]},\"CachePolicyId\":\"658327ea-f89d-4fab-a63d-7e88639e58f6\",\"Compress\":true},\"CustomErrorResponses\":{\"Quantity\":1,\"Items\":[{\"ErrorCode\":403,\"ResponsePagePath\":\"/index.html\",\"ResponseCode\":\"200\",\"ErrorCachingMinTTL\":10}]},\"ViewerCertificate\":{\"CloudFrontDefaultCertificate\":true,\"MinimumProtocolVersion\":\"TLSv1.2_2021\"}}" --query "Distribution.{Id:Id,DomainName:DomainName}" --output json)

    DISTRIBUTION_ID=$(echo "$DIST_RESULT" | jq -r '.Id')
    CLOUDFRONT_DOMAIN=$(echo "$DIST_RESULT" | jq -r '.DomainName')

    aws s3api put-bucket-policy --bucket "$WEBSITE_BUCKET" --region "$REGION" --policy "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"CF\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"cloudfront.amazonaws.com\"},\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::${WEBSITE_BUCKET}/*\",\"Condition\":{\"StringEquals\":{\"AWS:SourceArn\":\"arn:aws:cloudfront::${ACCOUNT}:distribution/${DISTRIBUTION_ID}\"}}}]}"
    echo "  ✓ Created: $DISTRIBUTION_ID"
fi

SITE_URL="https://${CLOUDFRONT_DOMAIN}"
echo "  URL: $SITE_URL"

# Step 3: Cognito callbacks
echo ""
echo "━━━ [3/5] Updating Cognito callbacks ━━━"
aws cognito-idp update-user-pool-client \
    --user-pool-id "$USER_POOL_ID" --client-id "$USER_POOL_CLIENT_ID" \
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --callback-urls "http://localhost:3000" "$SITE_URL" \
    --logout-urls "http://localhost:3000" "$SITE_URL" \
    --supported-identity-providers COGNITO \
    --allowed-o-auth-flows code implicit \
    --allowed-o-auth-scopes openid email profile phone aws.cognito.signin.user.admin \
    --allowed-o-auth-flows-user-pool-client \
    --region "$REGION" > /dev/null
echo "  ✓ Cognito updated"

# Step 4: Build
echo ""
echo "━━━ [4/5] Building frontend ━━━"
cat > "$FRONTEND_DIR/.env.production" <<EOF
VITE_REGION=$REGION
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
VITE_IDENTITY_POOL_ID=$IDENTITY_POOL_ID
VITE_GRAPH_API_URL=$GRAPH_API_URL
VITE_STORAGE_BUCKET_NAME=$DATA_BUCKET
VITE_CALLBACK_URL=$SITE_URL
VITE_REST_API_URL=$SITE_URL/api/
EOF

cd "$FRONTEND_DIR"
npm install --ignore-scripts 2>/dev/null
npm run build
cd "$REPO_ROOT"
echo "  ✓ Built"

# Step 5: Deploy + invalidate
echo ""
echo "━━━ [5/5] Deploying to S3 ━━━"
aws s3 sync "$FRONTEND_DIR/dist/" "s3://${WEBSITE_BUCKET}/" --region "$REGION" --delete --cache-control "public, max-age=31536000, immutable" --quiet
aws s3 cp "$FRONTEND_DIR/dist/index.html" "s3://${WEBSITE_BUCKET}/index.html" --region "$REGION" --cache-control "no-cache, no-store, must-revalidate" --quiet
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*" --query "Invalidation.Id" --output text > /dev/null

# Update CORS on data bucket
aws s3api put-bucket-cors --bucket "$DATA_BUCKET" --region "$REGION" --cors-configuration "{\"CORSRules\":[{\"AllowedHeaders\":[\"*\"],\"AllowedMethods\":[\"GET\",\"PUT\",\"POST\",\"DELETE\",\"HEAD\"],\"AllowedOrigins\":[\"http://localhost:3000\",\"$SITE_URL\"],\"ExposeHeaders\":[\"x-amz-server-side-encryption\",\"x-amz-request-id\",\"x-amz-id-2\",\"ETag\"],\"MaxAgeSeconds\":3000}]}"

# Save to deployment config
jq --arg url "$SITE_URL" --arg dist "$DISTRIBUTION_ID" --arg bucket "$WEBSITE_BUCKET" \
    '. + {frontendUrl: $url, cloudfrontDistributionId: $dist, websiteBucket: $bucket}' \
    "$DEPLOY_CONFIG" > /tmp/deploy-updated.json && mv /tmp/deploy-updated.json "$DEPLOY_CONFIG"

echo "  ✓ Deployed and cache invalidated"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ FRONTEND DEPLOYED                                       ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  URL:    $SITE_URL"
echo "║  Login:  demo@example.com / (password from \$DEMO_PASSWORD)"
echo "║  Note:   CloudFront may take 5-10 min to propagate          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
