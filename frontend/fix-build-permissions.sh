#!/bin/bash
# Fix Build Permissions Script
# This script fixes permission issues when building the frontend

echo "🔧 Fixing build permissions..."

# Remove build info files that might have wrong permissions
echo "📁 Cleaning TypeScript build info files..."
rm -rf node_modules/.tmp 2>/dev/null
rm -f tsconfig.*.tsbuildinfo 2>/dev/null
rm -f tsconfig.tsbuildinfo 2>/dev/null

# Clean dist folder
echo "🧹 Cleaning dist folder..."
rm -rf dist 2>/dev/null

# Fix permissions on node_modules if needed
echo "🔐 Fixing node_modules permissions..."
if [ -d "node_modules" ]; then
    chmod -R u+w node_modules
fi

echo "✅ Permissions fixed!"
echo ""
echo "Now you can run: npm run build"
