# DynamoDB Validation Scripts

This directory contains scripts for validating and analyzing DynamoDB data structures.

## validate-dynamo-encryption.js

A comprehensive script to validate that DynamoDB messages contain the correct encryption data structure.

### Features

- ✅ Validates required encryption fields (encryptedText, iv, salt, hmac, timestamp)
- ✅ Checks base64 encoding validity
- ✅ Analyzes data structure (encryptedData vs legacy metadata)
- ✅ Provides detailed item analysis
- ✅ Generates summary reports

### Prerequisites

1. **AWS Credentials**: Set up your AWS credentials via environment variables:
   ```bash
   export AWS_ACCESS_KEY_ID=your_access_key
   export AWS_SECRET_ACCESS_KEY=your_secret_key
   export AWS_REGION=us-east-1  # or your preferred region
   ```

2. **Dependencies**: Install the AWS SDK:
   ```bash
   npm install aws-sdk@^2.1691.0
   ```

### Usage

#### Scan all messages in a table
```bash
# Using npm script
npm run validate-db:scan

# Or directly
node scripts/validate-dynamo-encryption.js scan

# With custom table name
node scripts/validate-dynamo-encryption.js scan messages
```

#### Get a specific message
```bash
# Using npm script
npm run validate-db:get messages abc123

# Or directly
node scripts/validate-dynamo-encryption.js get messages abc123
```

#### Show help
```bash
node scripts/validate-dynamo-encryption.js
```

### Expected Data Structure

The script validates that each DynamoDB item contains:

#### Required Fields
- `encryptedText` (string, base64): The AES-GCM encrypted message
- `iv` (string, base64): 12-byte IV used in AES-GCM
- `salt` (string, base64): Used in PBKDF2 to derive the encryption key
- `hmac` (string, base64): HMAC for integrity/authentication check
- `timestamp` (number): Unix timestamp

#### Data Structure Support
The script handles both data structures:

1. **New Structure** (preferred):
   ```json
   {
     "messageId": "abc123",
     "encryptedData": {
       "encryptedText": "base64_encrypted_content",
       "iv": "base64_12_byte_iv",
       "salt": "base64_16_byte_salt",
       "hmac": "base64_hmac",
       "timestamp": 1703123456789
     }
   }
   ```

2. **Legacy Structure** (backward compatibility):
   ```json
   {
     "messageId": "abc123",
     "encryptedContent": "base64_encrypted_content",
     "metadata": {
       "iv": "base64_12_byte_iv",
       "salt": "base64_16_byte_salt",
       "hmac": "base64_hmac"
     },
     "timestamp": 1703123456789
   }
   ```

### Output Example

```
🔐 DynamoDB Encryption Validation Script
==========================================
🔍 Scanning DynamoDB table: messages
📊 Found 3 messages

============================================================
📋 Item Analysis:
  Message ID: abc123
  Sender: user1
  Recipient: user2
  Timestamp: 2023-12-21T10:30:45.789Z
  Is Encrypted: true
  ✅ Has encryptedData object
    - encryptedText length: 256
    - iv length: 16
    - salt length: 24
    - hmac length: 44

  ✅ Validation Passed

============================================================
📈 Summary:
  ✅ Valid items: 3
  ❌ Items with errors: 0
  ⚠️  Items with warnings: 0
  📊 Total items checked: 3

🎉 All items passed validation!
```

### Troubleshooting

#### Common Issues

1. **Missing AWS Credentials**
   ```
   ❌ Error scanning DynamoDB: CredentialsError: Missing credentials
   ```
   **Solution**: Set up AWS credentials via environment variables

2. **Invalid Base64**
   ```
   ⚠️  Warnings:
     - 'encryptedText' is not valid base64: Invalid character
   ```
   **Solution**: Check if the encryption process is working correctly

3. **Missing Required Fields**
   ```
   ❌ Validation Errors:
     - Missing 'salt'
     - Missing 'hmac'
   ```
   **Solution**: Ensure the encryption process includes all required fields

#### Environment Setup

For local development, you can use AWS CLI profiles:
```bash
export AWS_PROFILE=your_profile_name
```

Or use AWS credentials file:
```bash
# ~/.aws/credentials
[default]
aws_access_key_id = your_access_key
aws_secret_access_key = your_secret_key

# ~/.aws/config
[default]
region = us-east-1
``` 