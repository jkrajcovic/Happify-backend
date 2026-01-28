#!/bin/bash

# Happify Remote Config Deployment Script
# Deploys quotes database and feature flags to Firebase

set -e

echo "🚀 Deploying Happify Remote Config..."
echo ""

# Check if quotes database exists
if [ ! -f "quotes-database.json" ]; then
    echo "❌ Error: quotes-database.json not found"
    exit 1
fi

# Validate JSON
echo "📋 Validating quotes database..."
if ! cat quotes-database.json | jq . > /dev/null 2>&1; then
    echo "❌ Error: Invalid JSON in quotes-database.json"
    exit 1
fi

# Count quotes
QUOTE_COUNT=$(cat quotes-database.json | jq 'length')
echo "✅ Found $QUOTE_COUNT quotes"
echo ""

# Check Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: Firebase CLI not installed"
    echo "Install with: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in
if ! firebase projects:list > /dev/null 2>&1; then
    echo "❌ Error: Not logged into Firebase"
    echo "Login with: firebase login"
    exit 1
fi

echo "📤 Preparing Remote Config..."

# Create temporary config file with quotes embedded
QUOTES_JSON=$(cat quotes-database.json | jq -c .)

# Note: Firebase Remote Config deployment via CLI requires the Admin SDK
# For first deployment, use Firebase Console (see PHASE_B_DEPLOYMENT.md)

echo ""
echo "⚠️  Manual deployment required for first time setup"
echo ""
echo "Please follow these steps:"
echo "1. Go to: https://console.firebase.google.com/project/happify-2-prod/config"
echo "2. Add parameter 'quotes_database' with type JSON"
echo "3. Copy content from quotes-database.json as the default value"
echo "4. Add other parameters from remoteconfig.template.json"
echo "5. Publish changes"
echo ""
echo "📚 See PHASE_B_DEPLOYMENT.md for complete instructions"
echo ""

# Alternative: Use Firebase Admin SDK (Node.js script)
echo "💡 For automated deployment, consider using Firebase Admin SDK"
echo "   See: https://firebase.google.com/docs/remote-config/use-config-rest"

exit 0
