import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { getAwsCredentials } from '../config/security';

export interface User {
  userId: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: number;
  contacts: string[];
  publicKey?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  messageId: string;
  senderId: string;
  recipientId: string;
  content: string;
  encryptedContent?: string;
  timestamp: number;
  isEncrypted: boolean;
  isRead: boolean;
  messageType: 'text' | 'file' | 'image' | 'voice';
  metadata?: Record<string, any>;
}

export interface ChatSession {
  sessionId: string;
  participants: string[];
  lastMessageId?: string;
  lastMessageTime?: number;
  createdAt: number;
  updatedAt: number;
}

export class DynamoDBService {
  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;
  private readonly USERS_TABLE = 'siphera-users-dev';
  private readonly MESSAGES_TABLE = process.env.MESSAGES_TABLE || 'siphera-messages';
  private readonly SESSIONS_TABLE = process.env.SESSIONS_TABLE || 'siphera-sessions';

  constructor() {
    const awsConfig = getAwsCredentials();
    
    this.client = new DynamoDBClient(awsConfig);
    this.docClient = DynamoDBDocumentClient.from(this.client);
  }

  // User Management
  async createUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = Date.now();
    const userWithTimestamps: User = {
      ...user,
      createdAt: now,
      updatedAt: now,
    };

    await this.docClient.send(new PutCommand({
      TableName: this.USERS_TABLE,
      Item: userWithTimestamps,
    }));

    return userWithTimestamps;
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const result = await this.docClient.send(new GetCommand({
        TableName: this.USERS_TABLE,
        Key: { userId },
      }));

      return result.Item as User || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const result = await this.docClient.send(new QueryCommand({
        TableName: this.USERS_TABLE,
        IndexName: 'username-index',
        KeyConditionExpression: 'username = :username',
        ExpressionAttributeValues: {
          ':username': username,
        },
      }));

      return result.Items?.[0] as User || null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  async updateUserStatus(userId: string, status: User['status']): Promise<void> {
    try {
      await this.docClient.send(new UpdateCommand({
        TableName: this.USERS_TABLE,
        Key: { userId },
        UpdateExpression: 'SET #status = :status, lastSeen = :lastSeen, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':lastSeen': Date.now(),
          ':updatedAt': Date.now(),
        },
      }));

    } catch (error) {
      console.error('Error updating user status:', error);
    }
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
    try {
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'userId' && key !== 'createdAt') {
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = value;
        }
      });

      updateExpressions.push('updatedAt = :updatedAt');
      expressionAttributeValues[':updatedAt'] = Date.now();

      await this.docClient.send(new UpdateCommand({
        TableName: this.USERS_TABLE,
        Key: { userId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      }));

    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  }

  async addContact(userId: string, contactId: string): Promise<void> {
    try {
      await this.docClient.send(new UpdateCommand({
        TableName: this.USERS_TABLE,
        Key: { userId },
        UpdateExpression: 'ADD contacts :contactId SET updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':contactId': new Set([contactId]),
          ':updatedAt': Date.now(),
        },
      }));

    } catch (error) {
      console.error('Error adding contact:', error);
    }
  }

  async removeContact(userId: string, contactId: string): Promise<void> {
    try {
      await this.docClient.send(new UpdateCommand({
        TableName: this.USERS_TABLE,
        Key: { userId },
        UpdateExpression: 'DELETE contacts :contactId SET updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':contactId': new Set([contactId]),
          ':updatedAt': Date.now(),
        },
      }));

    } catch (error) {
      console.error('Error removing contact:', error);
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const result = await this.docClient.send(new ScanCommand({
        TableName: this.USERS_TABLE,
      }));

      return result.Items as User[] || [];
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async getAllDiscoverableUsers(currentUserId: string): Promise<User[]> {
    try {
      const result = await this.docClient.send(new ScanCommand({
        TableName: this.USERS_TABLE,
        FilterExpression: 'userId <> :me',
        ExpressionAttributeValues: {
          ':me': currentUserId,
        },
        ProjectionExpression: 'userId, username, displayName, avatar',
      }));
      return result.Items as User[] || [];
    } catch (error) {
      console.error('Error getting discoverable users:', error);
      return [];
    }
  }

  // Message Management
  async saveMessage(message: Omit<Message, 'messageId'>): Promise<Message> {
    const messageWithId: Message = {
      ...message,
      messageId: uuidv4(),
    };

    await this.docClient.send(new PutCommand({
      TableName: this.MESSAGES_TABLE,
      Item: messageWithId,
    }));

    return messageWithId;
  }

  async getMessages(senderId: string, recipientId: string, limit: number = 50): Promise<Message[]> {
    try {
      // Get messages from sender to recipient
      const sentMessages = await this.docClient.send(new QueryCommand({
        TableName: this.MESSAGES_TABLE,
        IndexName: 'sender-recipient-index',
        KeyConditionExpression: 'senderId = :senderId AND recipientId = :recipientId',
        ExpressionAttributeValues: {
          ':senderId': senderId,
          ':recipientId': recipientId,
        },
        ScanIndexForward: false, // Get most recent first
        Limit: limit,
      }));

      // Get messages from recipient to sender
      const receivedMessages = await this.docClient.send(new QueryCommand({
        TableName: this.MESSAGES_TABLE,
        IndexName: 'sender-recipient-index',
        KeyConditionExpression: 'senderId = :senderId AND recipientId = :recipientId',
        ExpressionAttributeValues: {
          ':senderId': recipientId,
          ':recipientId': senderId,
        },
        ScanIndexForward: false, // Get most recent first
        Limit: limit,
      }));

      const allMessages = [
        ...(sentMessages.Items as Message[] || []),
        ...(receivedMessages.Items as Message[] || []),
      ];

      // Sort by timestamp and return the most recent
      return allMessages
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      await this.docClient.send(new UpdateCommand({
        TableName: this.MESSAGES_TABLE,
        Key: { messageId },
        UpdateExpression: 'SET isRead = :isRead',
        ExpressionAttributeValues: {
          ':isRead': true,
        },
      }));

    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  // Chat Session Management
  async createChatSession(participants: string[]): Promise<ChatSession> {
    const now = Date.now();
    const session: ChatSession = {
      sessionId: `session-${participants.sort().join('-')}-${now}`,
      participants,
      createdAt: now,
      updatedAt: now,
    };

    await this.docClient.send(new PutCommand({
      TableName: this.SESSIONS_TABLE,
      Item: session,
    }));

    return session;
  }

  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const result = await this.docClient.send(new GetCommand({
        TableName: this.SESSIONS_TABLE,
        Key: { sessionId },
      }));

      return result.Item as ChatSession || null;
    } catch (error) {
      console.error('Error getting chat session:', error);
      return null;
    }
  }

  async updateChatSession(sessionId: string, lastMessageId: string, lastMessageTime: number): Promise<void> {
    try {
      await this.docClient.send(new UpdateCommand({
        TableName: this.SESSIONS_TABLE,
        Key: { sessionId },
        UpdateExpression: 'SET lastMessageId = :lastMessageId, lastMessageTime = :lastMessageTime, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':lastMessageId': lastMessageId,
          ':lastMessageTime': lastMessageTime,
          ':updatedAt': Date.now(),
        },
      }));

    } catch (error) {
      console.error('Error updating chat session:', error);
    }
  }

  async getUserChatSessions(userId: string): Promise<ChatSession[]> {
    try {
      const result = await this.docClient.send(new QueryCommand({
        TableName: this.SESSIONS_TABLE,
        IndexName: 'participants-index',
        KeyConditionExpression: 'participants = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      }));

      return result.Items as ChatSession[] || [];
    } catch (error) {
      console.error('Error getting user chat sessions:', error);
      return [];
    }
  }
}

// Export singleton instance
export const dynamoDBService = new DynamoDBService(); 