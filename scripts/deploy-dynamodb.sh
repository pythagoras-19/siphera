#!/bin/bash

# Siphera DynamoDB Tables Deployment Script
# This script deploys the DynamoDB tables for user management and message storage

set -e

# Configuration
STACK_NAME="siphera-dynamodb-tables"
TEMPLATE_FILE="infrastructure/dynamodb-tables.yml"
ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}

echo "🚀 Deploying Siphera DynamoDB Tables..."
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Stack Name: $STACK_NAME"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if template file exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ Template file not found: $TEMPLATE_FILE"
    exit 1
fi

# Validate CloudFormation template
echo "📋 Validating CloudFormation template..."
aws cloudformation validate-template \
    --template-body file://$TEMPLATE_FILE \
    --region $REGION

if [ $? -eq 0 ]; then
    echo "✅ Template validation successful"
else
    echo "❌ Template validation failed"
    exit 1
fi

# Check if stack exists
STACK_EXISTS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "STACK_NOT_FOUND")

if [ "$STACK_EXISTS" = "STACK_NOT_FOUND" ]; then
    echo "📦 Creating new CloudFormation stack..."
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_FILE \
        --parameters ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
        --region $REGION \
        --capabilities CAPABILITY_IAM

    echo "⏳ Waiting for stack creation to complete..."
    aws cloudformation wait stack-create-complete \
        --stack-name $STACK_NAME \
        --region $REGION
else
    echo "🔄 Updating existing CloudFormation stack..."
    aws cloudformation update-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_FILE \
        --parameters ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
        --region $REGION \
        --capabilities CAPABILITY_IAM

    echo "⏳ Waiting for stack update to complete..."
    aws cloudformation wait stack-update-complete \
        --stack-name $STACK_NAME \
        --region $REGION
fi

# Get stack outputs
echo "📊 Getting stack outputs..."
OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs')

echo ""
echo "✅ DynamoDB Tables deployed successfully!"
echo ""
echo "📋 Stack Outputs:"
echo "$OUTPUTS" | jq -r '.[] | "\(.OutputKey): \(.OutputValue)"'

# Save table names to environment file
echo ""
echo "💾 Saving table names to .env file..."

USERS_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="UsersTableName") | .OutputValue')
MESSAGES_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="MessagesTableName") | .OutputValue')
SESSIONS_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="SessionsTableName") | .OutputValue')

# Create or update .env file
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    touch "$ENV_FILE"
fi

# Update or add DynamoDB table names
if grep -q "USERS_TABLE=" "$ENV_FILE"; then
    sed -i.bak "s/USERS_TABLE=.*/USERS_TABLE=$USERS_TABLE/" "$ENV_FILE"
else
    echo "USERS_TABLE=$USERS_TABLE" >> "$ENV_FILE"
fi

if grep -q "MESSAGES_TABLE=" "$ENV_FILE"; then
    sed -i.bak "s/MESSAGES_TABLE=.*/MESSAGES_TABLE=$MESSAGES_TABLE/" "$ENV_FILE"
else
    echo "MESSAGES_TABLE=$MESSAGES_TABLE" >> "$ENV_FILE"
fi

if grep -q "SESSIONS_TABLE=" "$ENV_FILE"; then
    sed -i.bak "s/SESSIONS_TABLE=.*/SESSIONS_TABLE=$SESSIONS_TABLE/" "$ENV_FILE"
else
    echo "SESSIONS_TABLE=$SESSIONS_TABLE" >> "$ENV_FILE"
fi

# Clean up backup files
rm -f "$ENV_FILE.bak"

echo "✅ Environment variables updated in $ENV_FILE"
echo ""
echo "🎉 Deployment complete! Your DynamoDB tables are ready to use."
echo ""
echo "📝 Next steps:"
echo "1. Update your AWS credentials in the .env file"
echo "2. Set up your Cognito User Pool ID"
echo "3. Deploy your backend application"
echo "4. Test the user management and messaging features" 