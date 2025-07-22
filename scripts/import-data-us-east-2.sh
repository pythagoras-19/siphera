#!/bin/bash

# Import data from us-east-1 to us-east-2
# This script imports the exported JSON data into the new tables

set -e

echo "📥 Importing data to us-east-2 tables..."

# Function to import data from JSON file
import_table_data() {
    local table_name=$1
    local json_file=$2
    local region="us-east-2"
    
    echo "Importing data to $table_name from $json_file..."
    
    # Check if JSON file exists and has data
    if [ ! -f "$json_file" ]; then
        echo "⚠️  File $json_file not found, skipping..."
        return
    fi
    
    # Count items in the JSON file
    local item_count=$(jq '.Items | length' "$json_file")
    echo "Found $item_count items to import..."
    
    if [ "$item_count" -eq 0 ]; then
        echo "No items to import for $table_name"
        return
    fi
    
    # Import each item using AWS CLI
    echo "Importing items to $table_name..."
    
    # Use jq to process each item and convert to DynamoDB format
    jq -c '.Items[]' "$json_file" | while read -r item; do
        # Write item to DynamoDB
        aws dynamodb put-item \
            --table-name "$table_name" \
            --region "$region" \
            --item "$item" \
            --output json > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            echo "✅ Imported item to $table_name"
        else
            echo "❌ Failed to import item to $table_name"
        fi
    done
    
    echo "✅ Completed import for $table_name"
}

# Import each table
echo "Starting data import process..."
import_table_data "siphera-users-dev" "siphera-users-dev.json"
import_table_data "siphera-sessions-dev" "siphera-sessions-dev.json"
import_table_data "siphera-messages-dev" "siphera-messages-dev.json"

echo "✅ Data import complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Redeploy backend to use us-east-2"
echo "2. Test the connection on deployed app"
echo "3. Verify users appear in the app" 