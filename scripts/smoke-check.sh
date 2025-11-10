#!/bin/bash

# Smoke check script for backend API endpoints
# Tests /api/stocks and /api/index endpoints

set -e

API_URL="${API_URL:-http://localhost:5000/api}"

echo "🔍 Running smoke checks against ${API_URL}..."
echo ""

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq not found. Installing basic checks without JSON parsing..."
    USE_JQ=false
else
    USE_JQ=true
fi

# Test /api/health
echo "1. Testing /api/health..."
HEALTH_RESPONSE=$(curl -sS "${API_URL}/health" || echo "ERROR")
if [ "$HEALTH_RESPONSE" = "ERROR" ]; then
    echo "   ❌ Failed: Could not reach /api/health"
    exit 1
fi

if [ "$USE_JQ" = true ]; then
    HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status' 2>/dev/null || echo "null")
    if [ "$HEALTH_STATUS" = "ok" ]; then
        echo "   ✅ Health check passed"
    else
        echo "   ⚠️  Health check returned: $HEALTH_STATUS"
    fi
else
    if echo "$HEALTH_RESPONSE" | grep -q "status"; then
        echo "   ✅ Health check endpoint responded"
    else
        echo "   ⚠️  Unexpected response format"
    fi
fi

# Test /api/stocks
echo ""
echo "2. Testing /api/stocks..."
STOCKS_RESPONSE=$(curl -sS "${API_URL}/stocks" || echo "ERROR")
if [ "$STOCKS_RESPONSE" = "ERROR" ]; then
    echo "   ❌ Failed: Could not reach /api/stocks"
    exit 1
fi

if [ "$USE_JQ" = true ]; then
    STOCKS_SUCCESS=$(echo "$STOCKS_RESPONSE" | jq -r '.success' 2>/dev/null || echo "null")
    STOCKS_COUNT=$(echo "$STOCKS_RESPONSE" | jq -r '.count // .data | length' 2>/dev/null || echo "0")
    if [ "$STOCKS_SUCCESS" = "true" ]; then
        echo "   ✅ Stocks endpoint returned success (${STOCKS_COUNT} stocks)"
    else
        echo "   ❌ Stocks endpoint returned success=false"
        exit 1
    fi
else
    if echo "$STOCKS_RESPONSE" | grep -q "success"; then
        echo "   ✅ Stocks endpoint responded"
    else
        echo "   ⚠️  Unexpected response format"
    fi
fi

# Test /api/index
echo ""
echo "3. Testing /api/index..."
INDEX_RESPONSE=$(curl -sS "${API_URL}/index" || echo "ERROR")
if [ "$INDEX_RESPONSE" = "ERROR" ]; then
    echo "   ❌ Failed: Could not reach /api/index"
    exit 1
fi

if [ "$USE_JQ" = true ]; then
    INDEX_SUCCESS=$(echo "$INDEX_RESPONSE" | jq -r '.success' 2>/dev/null || echo "null")
    HAS_NIFTY=$(echo "$INDEX_RESPONSE" | jq -r '.data.nifty50 != null' 2>/dev/null || echo "false")
    HAS_SENSEX=$(echo "$INDEX_RESPONSE" | jq -r '.data.sensex != null' 2>/dev/null || echo "false")
    if [ "$INDEX_SUCCESS" = "true" ]; then
        echo "   ✅ Index endpoint returned success"
        if [ "$HAS_NIFTY" = "true" ]; then
            echo "      ✅ Nifty 50 data present"
        else
            echo "      ⚠️  Nifty 50 data missing"
        fi
        if [ "$HAS_SENSEX" = "true" ]; then
            echo "      ✅ Sensex data present"
        else
            echo "      ⚠️  Sensex data missing"
        fi
    else
        echo "   ❌ Index endpoint returned success=false"
        exit 1
    fi
else
    if echo "$INDEX_RESPONSE" | grep -q "success"; then
        echo "   ✅ Index endpoint responded"
    else
        echo "   ⚠️  Unexpected response format"
    fi
fi

echo ""
echo "✅ All smoke checks passed!"

