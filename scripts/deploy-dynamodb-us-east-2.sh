#!/bin/bash

# Deploy DynamoDB tables to us-east-2
# This script migrates the database from us-east-1 to us-east-2

set -e

echo "🚀 Deploying DynamoDB tables to us-east-2..."

# Deploy the CloudFormation stack to us-east-2
aws cloudformation deploy \
  --template-file infrastructure/dynamodb-tables.yml \
  --stack-name siphera-dynamodb-tables \
  --parameter-overrides Environment=dev \
  --region us-east-2 \
  --capabilities CAPABILITY_IAM

echo "✅ DynamoDB tables deployed to us-east-2 successfully!"

# List the new tables
echo "📋 Tables created in us-east-2:"
aws dynamodb list-tables --region us-east-2 --query 'TableNames[?contains(@, `siphera`)]' --output table

echo ""
echo "🎯 Next steps:"
echo "1. Import data from the JSON files"
echo "2. Update backend environment variables"
echo "3. Test the connection" 