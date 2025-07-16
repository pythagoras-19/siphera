// Load environment variables from .env file
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const dynamodb = new AWS.DynamoDB.DocumentClient();

function validateDynamoItem(item) {
  const errors = [];

  const data = item.encryptedData || {
    encryptedText: item.encryptedContent,
    iv: item.metadata?.iv,
    salt: item.metadata?.salt,
    hmac: item.metadata?.hmac,
    timestamp: item.timestamp
  };

  if (!data.encryptedText) errors.push("Missing 'encryptedText' or 'encryptedContent'");
  if (!data.iv) errors.push("Missing 'iv'");
  if (!data.salt) errors.push("Missing 'salt'");
  if (!data.hmac) errors.push("Missing 'hmac'");
  if (!data.timestamp || typeof data.timestamp !== 'number') errors.push("Missing or invalid 'timestamp'");

  return errors;
}

function validateBase64Encoding(data) {
  const warnings = [];
  
  const fields = [
    { name: 'encryptedText', value: data.encryptedText },
    { name: 'iv', value: data.iv },
    { name: 'salt', value: data.salt },
    { name: 'hmac', value: data.hmac }
  ];

  fields.forEach(field => {
    if (field.value) {
      try {
        // Check if it's valid base64
        const decoded = Buffer.from(field.value, 'base64');
        if (decoded.length === 0) {
          warnings.push(`'${field.name}' appears to be empty after base64 decode`);
        }
      } catch (error) {
        warnings.push(`'${field.name}' is not valid base64: ${error.message}`);
      }
    }
  });

  return warnings;
}

function analyzeItemStructure(item) {
  console.log('\n📋 Item Analysis:');
  console.log('  Message ID:', item.messageId || item.id || 'N/A');
  console.log('  Sender:', item.senderId || item.sender || 'N/A');
  console.log('  Recipient:', item.recipientId || item.recipient || 'N/A');
  console.log('  Timestamp:', new Date(item.timestamp).toISOString());
  console.log('  Is Encrypted:', item.isEncrypted);
  
  // Check data structure
  if (item.encryptedData) {
    console.log('  ✅ Has encryptedData object');
    console.log('    - encryptedText length:', item.encryptedData.encryptedText?.length || 0);
    console.log('    - iv length:', item.encryptedData.iv?.length || 0);
    console.log('    - salt length:', item.encryptedData.salt?.length || 0);
    console.log('    - hmac length:', item.encryptedData.hmac?.length || 0);
  } else {
    console.log('  ⚠️  No encryptedData object, checking legacy structure');
    console.log('    - encryptedContent length:', item.encryptedContent?.length || 0);
    console.log('    - metadata.iv length:', item.metadata?.iv?.length || 0);
    console.log('    - metadata.salt length:', item.metadata?.salt?.length || 0);
    console.log('    - metadata.hmac length:', item.metadata?.hmac?.length || 0);
  }
}

async function scanMessages(tableName) {
  // Use environment variable if no table name provided
  const actualTableName = tableName || process.env.MESSAGES_TABLE || 'messages';
  console.log(`🔍 Scanning DynamoDB table: ${actualTableName}`);
  
  try {
    const params = {
      TableName: actualTableName,
      Limit: 50 // Limit to first 50 items for testing
    };

    const result = await dynamodb.scan(params).promise();
    
    console.log(`📊 Found ${result.Items.length} messages`);
    
    let validCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    for (const item of result.Items) {
      console.log('\n' + '='.repeat(60));
      
      analyzeItemStructure(item);
      
      const errors = validateDynamoItem(item);
      const data = item.encryptedData || {
        encryptedText: item.encryptedContent,
        iv: item.metadata?.iv,
        salt: item.metadata?.salt,
        hmac: item.metadata?.hmac,
        timestamp: item.timestamp
      };
      const warnings = validateBase64Encoding(data);

      if (errors.length > 0) {
        console.log('  ❌ Validation Errors:');
        errors.forEach(error => console.log(`    - ${error}`));
        errorCount++;
      } else {
        console.log('  ✅ Validation Passed');
        validCount++;
      }

      if (warnings.length > 0) {
        console.log('  ⚠️  Warnings:');
        warnings.forEach(warning => console.log(`    - ${warning}`));
        warningCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Summary:');
    console.log(`  ✅ Valid items: ${validCount}`);
    console.log(`  ❌ Items with errors: ${errorCount}`);
    console.log(`  ⚠️  Items with warnings: ${warningCount}`);
    console.log(`  📊 Total items checked: ${result.Items.length}`);

    if (errorCount === 0) {
      console.log('\n🎉 All items passed validation!');
    } else {
      console.log('\n🔧 Some items need attention. Check the errors above.');
    }

  } catch (error) {
    console.error('❌ Error scanning DynamoDB:', error);
  }
}

async function getSpecificMessage(messageId, tableName) {
  // Use environment variable if no table name provided
  const actualTableName = tableName || process.env.MESSAGES_TABLE || 'messages';
  console.log(`🔍 Looking for specific message: ${messageId}`);
  
  try {
    const params = {
      TableName: actualTableName,
      Key: {
        messageId: messageId
      }
    };

    const result = await dynamodb.get(params).promise();
    
    if (result.Item) {
      console.log('\n📋 Found Message:');
      analyzeItemStructure(result.Item);
      
      const errors = validateDynamoItem(result.Item);
      const data = result.Item.encryptedData || {
        encryptedText: result.Item.encryptedContent,
        iv: result.Item.metadata?.iv,
        salt: result.Item.metadata?.salt,
        hmac: result.Item.metadata?.hmac,
        timestamp: result.Item.timestamp
      };
      const warnings = validateBase64Encoding(data);

      if (errors.length > 0) {
        console.log('  ❌ Validation Errors:');
        errors.forEach(error => console.log(`    - ${error}`));
      } else {
        console.log('  ✅ Validation Passed');
      }

      if (warnings.length > 0) {
        console.log('  ⚠️  Warnings:');
        warnings.forEach(warning => console.log(`    - ${warning}`));
      }
    } else {
      console.log('❌ Message not found');
    }

  } catch (error) {
    console.error('❌ Error getting message:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const tableName = args[1]; // Don't set default, let the function use env var
  const messageId = args[2];

  console.log('🔐 DynamoDB Encryption Validation Script');
  console.log('==========================================');
  
  // Show configuration
  console.log('📋 Configuration:');
  console.log(`  AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  console.log(`  AWS Access Key: ${process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`  AWS Secret Key: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Messages Table: ${process.env.MESSAGES_TABLE || 'messages (default)'}`);
  console.log('');

  if (command === 'scan') {
    await scanMessages(tableName);
  } else if (command === 'get' && messageId) {
    await getSpecificMessage(messageId, tableName);
  } else {
    console.log('\nUsage:');
    console.log('  node validate-dynamo-encryption.js scan [tableName]');
    console.log('  node validate-dynamo-encryption.js get [tableName] [messageId]');
    console.log('\nExamples:');
    console.log('  node validate-dynamo-encryption.js scan');
    console.log('  node validate-dynamo-encryption.js scan messages');
    console.log('  node validate-dynamo-encryption.js get messages abc123');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  validateDynamoItem,
  validateBase64Encoding,
  scanMessages,
  getSpecificMessage
}; 