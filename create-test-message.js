const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Configure DynamoDB
const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000', // Local DynamoDB
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local'
  }
});

const docClient = DynamoDBDocumentClient.from(client);

async function createTestMessage() {
  const testMessage = {
    messageId: uuidv4(),
    senderId: 'test-sender',
    recipientId: 'siphera.us@gmail.com',
    content: 'Hello! This is a test message sent TO you.',
    encryptedContent: 'SGVsbG8hIFRoaXMgaXMgYSB0ZXN0IG1lc3NhZ2Ugc2VudCBUTyB5b3Uu', // base64 encoded
    timestamp: Date.now(),
    isEncrypted: true,
    isRead: false,
    messageType: 'text',
    encryptedData: {
      encryptedText: 'SGVsbG8hIFRoaXMgaXMgYSB0ZXN0IG1lc3NhZ2Ugc2VudCBUTyB5b3Uu',
      iv: 'test_iv_' + Date.now(),
      salt: 'test_salt_' + Date.now(),
      hmac: 'test_hmac_' + Date.now(),
      timestamp: Date.now()
    },
    metadata: {}
  };

  try {
    await docClient.send(new PutCommand({
      TableName: 'siphera-messages-dev',
      Item: testMessage
    }));

    console.log('✅ Test message created successfully!');
    console.log('Message ID:', testMessage.messageId);
    console.log('From:', testMessage.senderId);
    console.log('To:', testMessage.recipientId);
    console.log('Content:', testMessage.content);
    
    return testMessage;
  } catch (error) {
    console.error('❌ Error creating test message:', error);
    throw error;
  }
}

// Run the function
createTestMessage()
  .then(() => {
    console.log('🎉 Test message creation completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to create test message:', error);
    process.exit(1);
  }); 