#!/bin/bash

# IOC Workspace Deployment Setup Script
# This script helps initialize deployment configurations

set -e

echo "🚀 IOC Workspace Deployment Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from workspace root
if [ ! -f "nx.json" ]; then
    echo -e "${RED}Error: This script must be run from the workspace root${NC}"
    exit 1
fi

echo -e "\n${YELLOW}Setting up deployment configurations...${NC}"

# Create necessary directories
echo "Creating directories..."
mkdir -p .github/workflows
mkdir -p scripts
mkdir -p docs

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Vercel CLI not found. Installing...${NC}"
    npm install -g vercel@latest
fi

# Initialize environment files
echo -e "\n${YELLOW}Setting up environment files...${NC}"
for app in main-application admin-dashboard beta-application dev-sandbox; do
    if [ ! -f "apps/$app/.env.local" ] && [ -f "apps/$app/.env.example" ]; then
        echo "Creating .env.local for $app..."
        cp "apps/$app/.env.example" "apps/$app/.env.local"
        echo -e "${GREEN}✓ Created apps/$app/.env.local${NC}"
    else
        echo -e "${YELLOW}⚠ apps/$app/.env.local already exists or no example found${NC}"
    fi
done

# Create .gitignore entries
echo -e "\n${YELLOW}Updating .gitignore...${NC}"
if ! grep -q "\.env\.local" .gitignore 2>/dev/null; then
    echo -e "\n# Environment files\n.env.local\n.env.*.local" >> .gitignore
    echo -e "${GREEN}✓ Added environment files to .gitignore${NC}"
fi

# Check GitHub secrets reminder
echo -e "\n${YELLOW}GitHub Secrets Required:${NC}"
echo "Please ensure the following secrets are set in your GitHub repository:"
echo "  - VERCEL_ORG_ID"
echo "  - VERCEL_TOKEN"
echo "  - VERCEL_PROJECT_ID_MAIN"
echo "  - VERCEL_PROJECT_ID_ADMIN"
echo "  - VERCEL_PROJECT_ID_BETA"
echo "  - NX_CLOUD_ACCESS_TOKEN (optional)"
echo "  - CODECOV_TOKEN (optional)"

# Vercel project linking
echo -e "\n${YELLOW}Vercel Project Setup:${NC}"
echo "Run the following commands to link your Vercel projects:"
echo ""
echo "  cd apps/main-application && vercel link"
echo "  cd apps/admin-dashboard && vercel link"
echo "  cd apps/beta-application && vercel link"
echo "  cd apps/dev-sandbox && vercel link"

# Install dependencies check
echo -e "\n${YELLOW}Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm ci
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi

# Validate Nx workspace
echo -e "\n${YELLOW}Validating Nx workspace...${NC}"
npx nx workspace-lint

# Test affected detection
echo -e "\n${YELLOW}Testing affected detection...${NC}"
npx nx print-affected --type=app

echo -e "\n${GREEN}✅ Deployment setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure environment variables in .env.local files"
echo "2. Set up GitHub secrets"
echo "3. Link Vercel projects"
echo "4. Run 'npm run deploy:affected' to test deployment"
echo ""
echo "For more information, see docs/DEPLOYMENT.md"