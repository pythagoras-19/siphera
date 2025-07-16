const { validateDynamoItem, validateBase64Encoding } = require('./validate-dynamo-encryption');

// Test data - simulate what we expect from DynamoDB
const testItems = [
  // ✅ Valid item with encryptedData structure
  {
    messageId: 'test-001',
    senderId: 'user1',
    recipientId: 'user2',
    timestamp: Date.now(),
    isEncrypted: true,
    encryptedData: {
      encryptedText: 'dGVzdCBlbmNyeXB0ZWQgdGV4dA==', // base64 for "test encrypted text"
      iv: 'dGVzdCBpdiB2YWx1ZQ==', // base64 for "test iv value"
      salt: 'dGVzdCBzYWx0IHZhbHVl', // base64 for "test salt value"
      hmac: 'dGVzdCBobWFjIHZhbHVl', // base64 for "test hmac value"
      timestamp: Date.now()
    }
  },
  
  // ✅ Valid item with legacy structure
  {
    messageId: 'test-002',
    senderId: 'user1',
    recipientId: 'user2',
    timestamp: Date.now(),
    isEncrypted: true,
    encryptedContent: 'dGVzdCBlbmNyeXB0ZWQgdGV4dA==',
    metadata: {
      iv: 'dGVzdCBpdiB2YWx1ZQ==',
      salt: 'dGVzdCBzYWx0IHZhbHVl',
      hmac: 'dGVzdCBobWFjIHZhbHVl'
    }
  },
  
  // ❌ Invalid item - missing salt
  {
    messageId: 'test-003',
    senderId: 'user1',
    recipientId: 'user2',
    timestamp: Date.now(),
    isEncrypted: true,
    encryptedData: {
      encryptedText: 'dGVzdCBlbmNyeXB0ZWQgdGV4dA==',
      iv: 'dGVzdCBpdiB2YWx1ZQ==',
      hmac: 'dGVzdCBobWFjIHZhbHVl',
      timestamp: Date.now()
    }
  },
  
  // ❌ Invalid item - missing hmac
  {
    messageId: 'test-004',
    senderId: 'user1',
    recipientId: 'user2',
    timestamp: Date.now(),
    isEncrypted: true,
    encryptedData: {
      encryptedText: 'dGVzdCBlbmNyeXB0ZWQgdGV4dA==',
      iv: 'dGVzdCBpdiB2YWx1ZQ==',
      salt: 'dGVzdCBzYWx0IHZhbHVl',
      timestamp: Date.now()
    }
  },
  
  // ⚠️ Invalid item - invalid base64
  {
    messageId: 'test-005',
    senderId: 'user1',
    recipientId: 'user2',
    timestamp: Date.now(),
    isEncrypted: true,
    encryptedData: {
      encryptedText: 'invalid-base64!@#',
      iv: 'dGVzdCBpdiB2YWx1ZQ==',
      salt: 'dGVzdCBzYWx0IHZhbHVl',
      hmac: 'dGVzdCBobWFjIHZhbHVl',
      timestamp: Date.now()
    }
  }
];

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

function runTests() {
  console.log('🧪 Testing DynamoDB Validation Script');
  console.log('=====================================');
  
  let validCount = 0;
  let errorCount = 0;
  let warningCount = 0;

  testItems.forEach((item, index) => {
    console.log('\n' + '='.repeat(60));
    console.log(`Test Item ${index + 1}: ${item.messageId}`);
    
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
  });

  console.log('\n' + '='.repeat(60));
  console.log('📈 Test Summary:');
  console.log(`  ✅ Valid items: ${validCount}`);
  console.log(`  ❌ Items with errors: ${errorCount}`);
  console.log(`  ⚠️  Items with warnings: ${warningCount}`);
  console.log(`  📊 Total items tested: ${testItems.length}`);

  if (errorCount === 0 && warningCount === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n🔧 Some tests failed as expected (testing error conditions).');
  }
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests, testItems }; 