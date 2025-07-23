#!/bin/bash

# Deploy Siphera Backend to AWS App Runner
set -e

echo "🚀 Deploying Siphera Backend to AWS App Runner..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Variables
SERVICE_NAME="siphera-backend"
REGION="us-east-2"
SOURCE_REPOSITORY_URL="https://github.com/pythagoras-19/siphera.git"
SOURCE_DIRECTORY="backend"

echo "📋 Configuration:"
echo "  Service Name: $SERVICE_NAME"
echo "  Region: $REGION"
echo "  Source: $SOURCE_REPOSITORY_URL"
echo "  Directory: $SOURCE_DIRECTORY"

# Check if service already exists
if aws apprunner describe-service --service-name $SERVICE_NAME --region $REGION > /dev/null 2>&1; then
    echo "✅ Service $SERVICE_NAME already exists. Updating..."
    
    # Update existing service
    aws apprunner update-service \
        --service-name $SERVICE_NAME \
        --region $REGION \
        --source-configuration "{
            \"CodeRepository\": {
                \"CodeConfiguration\": {
                    \"ConfigurationSource\": \"API\",
                    \"ConfigurationValues\": {
                        \"Runtime\": \"NODEJS_18\",
                        \"BuildCommand\": \"npm ci && npm run build\",
                        \"StartCommand\": \"npm start\",
                        \"Port\": \"3007\"
                    }
                },
                \"RepositoryUrl\": \"$SOURCE_REPOSITORY_URL\",
                \"SourceDirectory\": \"$SOURCE_DIRECTORY\"
            }
        }" \
        --instance-configuration "{
            \"Cpu\": \"1 vCPU\",
            \"Memory\": \"2 GB\"
        }"
    
    echo "✅ Service updated successfully!"
else
    echo "🆕 Creating new service $SERVICE_NAME..."
    
    # Create new service
    aws apprunner create-service \
        --service-name $SERVICE_NAME \
        --region $REGION \
        --source-configuration "{
            \"CodeRepository\": {
                \"CodeConfiguration\": {
                    \"ConfigurationSource\": \"API\",
                    \"ConfigurationValues\": {
                        \"Runtime\": \"NODEJS_18\",
                        \"BuildCommand\": \"npm ci && npm run build\",
                        \"StartCommand\": \"npm start\",
                        \"Port\": \"3007\"
                    }
                },
                \"RepositoryUrl\": \"$SOURCE_REPOSITORY_URL\",
                \"SourceDirectory\": \"$SOURCE_DIRECTORY\"
            }
        }" \
        --instance-configuration "{
            \"Cpu\": \"1 vCPU\",
            \"Memory\": \"2 GB\"
        }"
    
    echo "✅ Service created successfully!"
fi

# Wait for service to be ready
echo "⏳ Waiting for service to be ready..."
aws apprunner wait service-running --service-name $SERVICE_NAME --region $REGION

# Get service URL
SERVICE_URL=$(aws apprunner describe-service --service-name $SERVICE_NAME --region $REGION --query 'Service.ServiceUrl' --output text)

echo "🎉 Deployment complete!"
echo "📡 Service URL: $SERVICE_URL"
echo ""
echo "🔧 Next steps:"
echo "1. Update frontend environment variables with the new backend URL"
echo "2. Test the API endpoints"
echo "3. Verify user data is accessible" 