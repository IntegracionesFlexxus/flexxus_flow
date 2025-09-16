#!/bin/bash
# Deployment script - MVP Nivel 1
# TODO: En Nivel 2 agregar CI/CD integration, rollback strategy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENV=${1:-production}
VERSION=$(node -p "require('./package.json').version")
IMAGE_NAME="flexxus-frontend"
CONTAINER_NAME="flexxus-frontend"

echo -e "${GREEN}🚀 Starting deployment for environment: ${ENV}${NC}"
echo -e "${GREEN}📦 Version: ${VERSION}${NC}"

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check requirements
echo -e "${YELLOW}Checking requirements...${NC}"
if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

# Run pre-deployment checks
echo -e "${YELLOW}Running pre-deployment checks...${NC}"
npm run deploy:check
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Pre-deployment checks failed${NC}"
    exit 1
fi

# Build the application
echo -e "${YELLOW}Building application...${NC}"
if [ "$ENV" = "production" ]; then
    npm run build:prod
else
    npm run build:staging
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t ${IMAGE_NAME}:${VERSION} -t ${IMAGE_NAME}:latest .
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

# Stop existing container if running
if [ "$(docker ps -q -f name=${CONTAINER_NAME})" ]; then
    echo -e "${YELLOW}Stopping existing container...${NC}"
    docker stop ${CONTAINER_NAME}
    docker rm ${CONTAINER_NAME}
fi

# Start new container
echo -e "${YELLOW}Starting new container...${NC}"
if [ "$ENV" = "production" ]; then
    docker-compose up -d
else
    docker-compose -f docker-compose.staging.yml up -d
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start container${NC}"
    exit 1
fi

# Wait for health check
echo -e "${YELLOW}Waiting for health check...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -f http://localhost/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Health check passed${NC}"
        break
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        echo -e "${RED}❌ Health check failed after ${MAX_ATTEMPTS} attempts${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Attempt ${ATTEMPT}/${MAX_ATTEMPTS}...${NC}"
    sleep 2
done

# Clean up old images
echo -e "${YELLOW}Cleaning up old images...${NC}"
docker image prune -f

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Application is running at http://localhost${NC}"