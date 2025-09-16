#!/bin/bash
# Staging deployment script - MVP Nivel 1

set -e

# Configuration
export NODE_ENV=staging
export API_URL=${STAGING_API_URL:-"https://staging-api.flexxus.com"}
export WS_URL=${STAGING_WS_URL:-"wss://staging-api.flexxus.com"}

# Run main deploy script with staging environment
./scripts/deploy.sh staging