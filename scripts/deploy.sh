#!/usr/bin/env bash
#
# deploy.sh — Full deployment of the Retail Pricing Agent on Bedrock AgentCore
#
# Deploys everything from scratch:
#   1. Python environment + dependencies
#   2. CDK infrastructure (S3, Cognito, AppSync, DynamoDB, Lambda proxy)
#   3. Seed data generation (products, forecasts, competitors, margin rules, images)
#   4. Upload seed data to S3
#   5. AgentCore Runtime (handler + agents)
#   6. Wire proxy Lambda to AgentCore Runtime ARN
#   7. Create Cognito demo user + CORS + frontend .env
#
# Usage:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh [--region <your-region>] [--account 123456789012] [--skip-images] [--skip-seed]
#
# Prerequisites:
#   - AWS CLI configured with valid credentials
#   - Node.js + CDK CLI installed
#   - Python 3.12+
#   - Bedrock model access: Claude Sonnet 4.5, Claude Haiku 4.5, Nova Lite, Nova Pro, Nova Canvas, OpenAI gpt-oss-120b

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════
# Defaults & paths (all relative to repo root)
# ═══════════════════════════════════════════════════════════════════════════
REGION="${AWS_REGION:-us-west-2}"
ACCOUNT=""
SKIP_IMAGES=false
SKIP_SEED=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/pricing-agent-agentcore"
INFRA_DIR="$BACKEND_DIR/infra"
FRONTEND_DIR="$REPO_ROOT/pricing-agent-ui"

while [[ $# -gt 0 ]]; do
    case $1 in
        --region)      REGION="$2"; shift 2 ;;
        --account)     ACCOUNT="$2"; shift 2 ;;
        --skip-images) SKIP_IMAGES=true; shift ;;
        --skip-seed)   SKIP_SEED=true; shift ;;
        -h|--help)
            echo "Usage: $0 [--region REGION] [--account ACCOUNT_ID] [--skip-images] [--skip-seed]"
            exit 0 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [[ -z "$ACCOUNT" ]]; then
    ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
fi

export AWS_REGION="$REGION"
BUCKET="pricing-agent-data-${ACCOUNT}-${REGION}"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  RETAIL PRICING AGENT — FULL DEPLOYMENT                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Account:   $ACCOUNT"
echo "║  Region:    $REGION"
echo "║  Bucket:    $BUCKET"
echo "║  Backend:   $BACKEND_DIR"
echo "║  Frontend:  $FRONTEND_DIR"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Step 1: Python environments
# ═══════════════════════════════════════════════════════════════════════════
echo "━━━ [1/7] Setting up Python environments ━━━"

# Backend venv
if [[ ! -d "$BACKEND_DIR/.venv" ]]; then
    python3 -m venv "$BACKEND_DIR/.venv"
fi
source "$BACKEND_DIR/.venv/bin/activate"
pip install --quiet -r "$BACKEND_DIR/requirements.txt"

# CDK infra venv
if [[ ! -d "$INFRA_DIR/.venv" ]]; then
    python3 -m venv "$INFRA_DIR/.venv"
fi
source "$INFRA_DIR/.venv/bin/activate"
pip install --quiet aws-cdk-lib constructs cdk-nag

# Switch back to backend venv for the rest
source "$BACKEND_DIR/.venv/bin/activate"
echo "  ✓ Python environments ready"

# ═══════════════════════════════════════════════════════════════════════════
# Step 2: CDK Bootstrap + Deploy
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ [2/7] Deploying CDK infrastructure ━━━"

cdk bootstrap "aws://${ACCOUNT}/${REGION}" --region "$REGION" 2>/dev/null || true

# Update account/region in CDK app
sed -i.bak "s/account=\"[0-9]*\"/account=\"${ACCOUNT}\"/" "$INFRA_DIR/app.py"
sed -i.bak "s/region=\"[a-z0-9-]*\"/region=\"${REGION}\"/" "$INFRA_DIR/app.py"
rm -f "$INFRA_DIR/app.py.bak"

cd "$INFRA_DIR"
source .venv/bin/activate
JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1 cdk deploy PricingAgent \
    --require-approval never \
    --region "$REGION" \
    --outputs-file /tmp/cdk-outputs.json

source "$BACKEND_DIR/.venv/bin/activate"
cd "$BACKEND_DIR"

# Extract outputs
GRAPH_API_URL=$(jq -r '.PricingAgent.GraphApiUrl' /tmp/cdk-outputs.json)
GRAPH_API_ID=$(jq -r '.PricingAgent.GraphApiId' /tmp/cdk-outputs.json)
USER_POOL_ID=$(jq -r '.PricingAgent.UserPoolId' /tmp/cdk-outputs.json)
USER_POOL_CLIENT_ID=$(jq -r '.PricingAgent.UserPoolClientId' /tmp/cdk-outputs.json)
IDENTITY_POOL_ID=$(jq -r '.PricingAgent.IdentityPoolId' /tmp/cdk-outputs.json)
PRICING_TABLE=$(jq -r '.PricingAgent.PricingTableName' /tmp/cdk-outputs.json)

echo "  ✓ CDK stack deployed"
echo "    AppSync:  $GRAPH_API_URL"
echo "    Cognito:  $USER_POOL_ID"
echo "    S3:       $BUCKET"

# ═══════════════════════════════════════════════════════════════════════════
# Step 3: Generate seed data
# ═══════════════════════════════════════════════════════════════════════════
if [[ "$SKIP_SEED" == false ]]; then
    echo ""
    echo "━━━ [3/7] Generating seed data (text + images + competitor assets) ━━━"
    if [[ "$SKIP_IMAGES" == true ]]; then
        python3 seed_data.py --output ./seed_output --skip-images
    else
        python3 seed_data.py --output ./seed_output
    fi
    echo "  ✓ Seed data generated"
else
    echo ""
    echo "━━━ [3/7] Skipping seed data (--skip-seed) ━━━"
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 4: Upload seed data to S3
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ [4/7] Uploading all seed data to S3 ━━━"
if [[ -d "./seed_output" ]]; then
    aws s3 sync ./seed_output/ "s3://${BUCKET}/" --region "$REGION" --quiet
    echo "  ✓ All data uploaded to s3://${BUCKET}/"
else
    echo "  ⚠ No seed_output/ directory — skipping S3 upload"
fi

# ═══════════════════════════════════════════════════════════════════════════
# Step 4b: Seed customer profiles + purchase history
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ [4b/7] Seeding customer profiles and purchase history ━━━"
CUSTOMER_PROFILE_TABLE=PricingAgent-CustomerProfiles \
PURCHASE_HISTORY_TABLE=PricingAgent-PurchaseHistory \
DATA_BUCKET="$BUCKET" \
python3 seed_customers.py
echo "  ✓ Customer data seeded"

# ═══════════════════════════════════════════════════════════════════════════
# Step 5: Configure + Deploy AgentCore Runtime
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ [5/7] Deploying AgentCore Runtime ━━━"

AWS_DEFAULT_REGION="$REGION" agentcore configure --entrypoint handler.py --non-interactive --region "$REGION"

# Inject environment variables into AgentCore Runtime config
python3 -c "
import yaml
with open('.bedrock_agentcore.yaml') as f:
    cfg = yaml.safe_load(f)
agent_name = cfg.get('default_agent', 'handler')
cfg['agents'][agent_name]['environment'] = {
    'DATA_BUCKET': '${BUCKET}',
    'CUSTOMER_PROFILE_TABLE': 'PricingAgent-CustomerProfiles',
    'PURCHASE_HISTORY_TABLE': 'PricingAgent-PurchaseHistory',
    'AWS_REGION': '${REGION}',
}
with open('.bedrock_agentcore.yaml', 'w') as f:
    yaml.dump(cfg, f, default_flow_style=False)
"
echo "  ✓ AgentCore environment variables configured"

AWS_DEFAULT_REGION="$REGION" agentcore deploy --auto-update-on-conflict

AGENT_RUNTIME_ARN=$(python3 -c "
import yaml
with open('.bedrock_agentcore.yaml') as f:
    cfg = yaml.safe_load(f)
agent_name = cfg.get('default_agent', 'handler')
print(cfg['agents'][agent_name]['bedrock_agentcore']['agent_arn'])
")
echo "  ✓ AgentCore Runtime deployed: $AGENT_RUNTIME_ARN"

# Grant AgentCore Runtime role access to customer DynamoDB tables
AGENTCORE_ROLE=$(python3 -c "
import yaml
with open('.bedrock_agentcore.yaml') as f:
    cfg = yaml.safe_load(f)
agent_name = cfg.get('default_agent', 'handler')
print(cfg['agents'][agent_name]['aws']['execution_role'].split('/')[-1])
")

aws iam put-role-policy \
    --role-name "$AGENTCORE_ROLE" \
    --policy-name DynamoDBCustomerAccess \
    --policy-document "{
        \"Version\": \"2012-10-17\",
        \"Statement\": [{
            \"Effect\": \"Allow\",
            \"Action\": [\"dynamodb:GetItem\", \"dynamodb:Query\", \"dynamodb:Scan\"],
            \"Resource\": [
                \"arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/PricingAgent-CustomerProfiles\",
                \"arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/PricingAgent-CustomerProfiles/index/*\",
                \"arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/PricingAgent-PurchaseHistory\",
                \"arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/PricingAgent-PurchaseHistory/index/*\"
            ]
        }]
    }" 2>/dev/null || true
echo "  ✓ AgentCore IAM: DynamoDB customer table access granted"

# Grant AgentCore Runtime role access to Browser
aws iam put-role-policy \
    --role-name "$AGENTCORE_ROLE" \
    --policy-name AgentCoreBrowserAccess \
    --policy-document "{
        \"Version\": \"2012-10-17\",
        \"Statement\": [{
            \"Effect\": \"Allow\",
            \"Action\": [
                \"bedrock-agentcore:CreateBrowser\",
                \"bedrock-agentcore:ListBrowsers\",
                \"bedrock-agentcore:GetBrowser\",
                \"bedrock-agentcore:StartBrowserSession\",
                \"bedrock-agentcore:ListBrowserSessions\",
                \"bedrock-agentcore:GetBrowserSession\",
                \"bedrock-agentcore:StopBrowserSession\",
                \"bedrock-agentcore:UpdateBrowserStream\",
                \"bedrock-agentcore:ConnectBrowserAutomationStream\",
                \"bedrock-agentcore:ConnectBrowserLiveViewStream\"
            ],
            \"Resource\": \"arn:aws:bedrock-agentcore:${REGION}:${ACCOUNT}:browser/*\"
        }]
    }" 2>/dev/null || true
echo "  ✓ AgentCore IAM: Browser access granted"

# ═══════════════════════════════════════════════════════════════════════════
# Step 6: Wire proxy Lambda (with ALL env vars including new tables)
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ [6/7] Wiring proxy Lambda ━━━"

aws lambda update-function-configuration \
    --function-name pricing-agent-proxy \
    --environment "Variables={AGENT_RUNTIME_ARN=${AGENT_RUNTIME_ARN},GRAPH_API_URL=${GRAPH_API_URL},DATA_BUCKET=${BUCKET},CUSTOMER_PROFILE_TABLE=PricingAgent-CustomerProfiles,PURCHASE_HISTORY_TABLE=PricingAgent-PurchaseHistory}" \
    --region "$REGION" \
    --query "FunctionName" --output text > /dev/null

echo "  ✓ Proxy Lambda updated with AgentCore ARN"

# ═══════════════════════════════════════════════════════════════════════════
# Step 7: Cognito user + CORS + frontend env
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo "━━━ [7/7] Setting up Cognito, CORS, and frontend config ━━━"

DEMO_EMAIL="demo@example.com"
DEMO_PASSWORD="${DEMO_PASSWORD:-}"

if [[ -z "$DEMO_PASSWORD" ]]; then
    echo "  ⚠ DEMO_PASSWORD environment variable not set."
    echo "    Please export DEMO_PASSWORD before running this script."
    echo "    Example: export DEMO_PASSWORD='YourSecureP@ss1'"
    exit 1
fi

aws cognito-idp admin-create-user \
    --user-pool-id "$USER_POOL_ID" --username "$DEMO_EMAIL" \
    --user-attributes Name=email,Value="$DEMO_EMAIL" \
    --temporary-password "$DEMO_PASSWORD" --message-action SUPPRESS \
    --region "$REGION" > /dev/null 2>&1 || true

aws cognito-idp admin-set-user-password \
    --user-pool-id "$USER_POOL_ID" --username "$DEMO_EMAIL" \
    --password "$DEMO_PASSWORD" --permanent \
    --region "$REGION" 2>/dev/null || true

aws cognito-idp admin-update-user-attributes \
    --user-pool-id "$USER_POOL_ID" --username "$DEMO_EMAIL" \
    --user-attributes Name=email_verified,Value=true \
    --region "$REGION" 2>/dev/null || true

aws cognito-idp update-user-pool-client \
    --user-pool-id "$USER_POOL_ID" --client-id "$USER_POOL_CLIENT_ID" \
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_USER_SRP_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --callback-urls "http://localhost:3000" "https://example.com" \
    --logout-urls "http://localhost:3000" \
    --supported-identity-providers COGNITO \
    --allowed-o-auth-flows code implicit \
    --allowed-o-auth-scopes openid email profile phone aws.cognito.signin.user.admin \
    --allowed-o-auth-flows-user-pool-client \
    --region "$REGION" > /dev/null

aws s3api put-bucket-cors --bucket "$BUCKET" --region "$REGION" --cors-configuration '{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET","PUT","POST","DELETE","HEAD"],
    "AllowedOrigins": ["http://localhost:3000","http://localhost:5173"],
    "ExposeHeaders": ["x-amz-server-side-encryption","x-amz-request-id","x-amz-id-2","ETag"],
    "MaxAgeSeconds": 3000
  }]
}'

# Write frontend .env.local
if [[ -d "$FRONTEND_DIR" ]]; then
    cat > "$FRONTEND_DIR/.env.local" <<EOF
VITE_REGION=$REGION
VITE_USER_POOL_ID=$USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
VITE_IDENTITY_POOL_ID=$IDENTITY_POOL_ID
VITE_GRAPH_API_URL=$GRAPH_API_URL
VITE_STORAGE_BUCKET_NAME=$BUCKET
VITE_CALLBACK_URL=http://localhost:3000
VITE_REST_API_URL=http://localhost:3000/api/
EOF
    echo "  ✓ Frontend .env.local written"
fi

echo "  ✓ Demo user: $DEMO_EMAIL (password set from DEMO_PASSWORD env var)"

# ═══════════════════════════════════════════════════════════════════════════
# Save deployment config
# ═══════════════════════════════════════════════════════════════════════════
cat > "$BACKEND_DIR/deployment.json" <<EOF
{
    "account": "$ACCOUNT",
    "region": "$REGION",
    "bucket": "$BUCKET",
    "graphApiUrl": "$GRAPH_API_URL",
    "graphApiId": "$GRAPH_API_ID",
    "userPoolId": "$USER_POOL_ID",
    "userPoolClientId": "$USER_POOL_CLIENT_ID",
    "identityPoolId": "$IDENTITY_POOL_ID",
    "pricingTable": "$PRICING_TABLE",
    "agentRuntimeArn": "$AGENT_RUNTIME_ARN",
    "proxyLambda": "pricing-agent-proxy",
    "demoUser": "$DEMO_EMAIL"
}
EOF

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅ DEPLOYMENT COMPLETE                                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  AppSync:     $GRAPH_API_URL"
echo "║  AgentCore:   $AGENT_RUNTIME_ARN"
echo "║  S3 Bucket:   $BUCKET"
echo "║  Demo Login:  $DEMO_EMAIL (password from \$DEMO_PASSWORD)"
echo "║"
echo "║  To run frontend locally:"
echo "║    cd pricing-agent-ui"
echo "║    npm install --ignore-scripts && npm run dev"
echo "║    Open http://localhost:3000"
echo "║"
echo "║  To deploy frontend to AWS:"
echo "║    ./scripts/deploy-frontend.sh --region $REGION"
echo "╚══════════════════════════════════════════════════════════════╝"
