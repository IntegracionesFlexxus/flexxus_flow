#!/bin/bash
# Production deployment script - MVP Nivel 1
# WARNING: This deploys to production!

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Confirm production deployment
echo -e "${YELLOW}⚠️  WARNING: You are about to deploy to PRODUCTION!${NC}"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
fi

# Configuration
export NODE_ENV=production
export API_URL=${PROD_API_URL:-"https://api.flexxus.com"}
export WS_URL=${PROD_WS_URL:-"wss://api.flexxus.com"}

# Create backup of current deployment
echo -e "${YELLOW}Creating backup...${NC}"
BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
docker tag flexxus-frontend:latest flexxus-frontend:${BACKUP_NAME}

# Run main deploy script with production environment
./scripts/deploy.sh production

echo -e "${GREEN}✅ Production deployment completed!${NC}"
echo -e "${YELLOW}Backup created: flexxus-frontend:${BACKUP_NAME}${NC}"