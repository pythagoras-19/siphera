import { SenderKeyService } from './SenderKeyService';
import { WebSocketService } from './WebSocketService';
import { SecureChatService } from './SecureChatService';
import { E2EEncryption } from '../utils/encryption';

export interface DecryptedMessage {
  messageId: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: number;
  isEncrypted: boolean;
  isRead: boolean;
  messageType: string;
  isSentByMe: boolean;
  canRead: boolean;
}

export interface RawMessage {
  messageId: string;
  senderId: string;
  recipientId: string;
  content: string;
  encryptedContent?: string;
  encryptedData?: {
    encryptedText: string;
    iv: string;
    salt: string;
    hmac: string;
    timestamp: number;
  };
  senderReference?: {
    content: string;
    keyId: string;
    timestamp: number;
  };
  timestamp: number;
  isEncrypted: boolean;
  isRead: boolean;
  messageType: string;
  metadata?: Record<string, any>;
}

export class MessageRetrievalService {
  private static instance: MessageRetrievalService;
  private senderKeyService: SenderKeyService;
  private webSocketService: WebSocketService;
  private secureChatService: SecureChatService;

  private constructor() {
    this.senderKeyService = new SenderKeyService();
    this.webSocketService = WebSocketService.getInstance();
    this.secureChatService = SecureChatService.getInstance();
  }

  static getInstance(): MessageRetrievalService {
    if (!MessageRetrievalService.instance) {
      MessageRetrievalService.instance = new MessageRetrievalService();
    }
    return MessageRetrievalService.instance;
  }

  /**
   * Decrypt messages for the current user
   */
  async decryptMessages(messages: RawMessage[]): Promise<DecryptedMessage[]> {
    const currentUser = this.webSocketService.getCurrentUser();
    if (!currentUser?.id) {
      console.warn('No current user found, cannot decrypt messages');
      return messages.map(msg => ({
        ...msg,
        isSentByMe: false,
        canRead: false
      }));
    }

    console.log('🔍 Starting to decrypt messages:', {
      totalMessages: messages.length,
      currentUserId: currentUser.id
    });

    const decryptedMessages: DecryptedMessage[] = [];

    for (const message of messages) {
      try {
        // Use username (email) for comparison since that's what's stored in the database
        const currentUserIdentifier = currentUser.name || currentUser.id;
        const isSentByMe = message.senderId === currentUserIdentifier;
        
        console.log('🔍 Processing message:', {
          messageId: message.messageId,
          senderId: message.senderId,
          recipientId: message.recipientId,
          hasEncryptedData: !!message.encryptedData,
          hasSenderReference: !!message.senderReference,
          isSentByMe,
          currentUserIdentifier,
          currentUserId: currentUser.id,
          currentUserName: currentUser.name
        });

        const decryptedMessage = await this.decryptSingleMessage(message, currentUserIdentifier);
        decryptedMessages.push(decryptedMessage);
      } catch (error) {
        console.error(`Failed to decrypt message ${message.messageId}:`, error);
        // Add message with error state
        const currentUserIdentifier = currentUser.name || currentUser.id;
        decryptedMessages.push({
          ...message,
          content: '[Message could not be decrypted]',
          isSentByMe: message.senderId === currentUserIdentifier,
          canRead: false
        });
      }
    }

    console.log('✅ Finished decrypting messages:', {
      totalDecrypted: decryptedMessages.length,
      readableMessages: decryptedMessages.filter(m => m.canRead).length
    });

    return decryptedMessages;
  }

  /**
   * Decrypt a single message
   */
  private async decryptSingleMessage(message: RawMessage, currentUserIdentifier: string): Promise<DecryptedMessage> {
    const isSentByMe = message.senderId === currentUserIdentifier;

    if (isSentByMe) {
      // This is a message I sent - decrypt sender reference
      return await this.decryptSenderMessage(message, currentUserIdentifier);
    } else {
      // This is a message I received - decrypt encrypted data
      return await this.decryptRecipientMessage(message, currentUserIdentifier);
    }
  }

  /**
   * Decrypt a message I sent (using sender reference)
   */
  private async decryptSenderMessage(message: RawMessage, currentUserId: string): Promise<DecryptedMessage> {
    if (!message.senderReference) {
      // No sender reference available (old message)
      return {
        ...message,
        content: '[Sent message - no readable copy available]',
        isSentByMe: true,
        canRead: false
      };
    }

    try {
      console.log('🔍 Attempting to decrypt sender message:', {
        keyId: message.senderReference.keyId,
        contentLength: message.senderReference.content.length,
        timestamp: message.senderReference.timestamp
      });

      // Use the specific keyId from the senderReference to get the correct key
      const senderKey = await this.senderKeyService.getSenderKeyById(message.senderReference.keyId);
      if (!senderKey) {
        console.error('Could not retrieve sender key for keyId:', message.senderReference.keyId);
        return {
          ...message,
          content: '[Sent message - key not found]',
          isSentByMe: true,
          canRead: false
        };
      }

      console.log('🔑 Retrieved sender key:', {
        keyId: senderKey.id,
        userId: senderKey.userId,
        createdAt: senderKey.createdAt
      });

      const decryptedContent = await this.senderKeyService.decryptForSender(
        message.senderReference.content,
        senderKey
      );

      console.log('✅ Successfully decrypted sender message:', decryptedContent);

      return {
        ...message,
        content: decryptedContent,
        isSentByMe: true,
        canRead: true
      };
    } catch (error) {
      console.error('Failed to decrypt sender message:', error);
      return {
        ...message,
        content: '[Sent message - decryption failed]',
        isSentByMe: true,
        canRead: false
      };
    }
  }

  /**
   * Decrypt a message I received (using encrypted data)
   */
  private async decryptRecipientMessage(message: RawMessage, currentUserId: string): Promise<DecryptedMessage> {
    if (!message.encryptedData) {
      // No encrypted data available
      return {
        ...message,
        content: '[Received message - no encrypted data available]',
        isSentByMe: false,
        canRead: false
      };
    }

    try {
      console.log('🔍 Attempting to decrypt recipient message from:', message.senderId);

      // Convert RawMessage to SecureMessage format for decryption
      const secureMessage = {
        id: message.messageId,
        sender: message.senderId,
        recipient: message.recipientId,
        encryptedData: message.encryptedData,
        messageHash: '',
        timestamp: message.timestamp,
        isEncrypted: true
      };

      // Use SecureChatService to decrypt the message
      const decryptedContent = await this.secureChatService.receiveEncryptedMessage(
        message.senderId,
        secureMessage
      );

      console.log('✅ Successfully decrypted recipient message:', decryptedContent);

      return {
        ...message,
        content: decryptedContent,
        isSentByMe: false,
        canRead: true
      };
    } catch (error) {
      console.error('Failed to decrypt recipient message:', error);
      return {
        ...message,
        content: '[Received message - decryption failed]',
        isSentByMe: false,
        canRead: false
      };
    }
  }

  /**
   * Check if a message can be decrypted by the current user
   */
  canDecryptMessage(message: RawMessage): boolean {
    const currentUser = this.webSocketService.getCurrentUser();
    if (!currentUser?.id) return false;

    const isSentByMe = message.senderId === currentUser.id;

    if (isSentByMe) {
      return !!message.senderReference;
    } else {
      return !!message.encryptedData;
    }
  }

  /**
   * Get encryption status for a message
   */
  getMessageEncryptionStatus(message: RawMessage): {
    hasSenderReference: boolean;
    hasEncryptedData: boolean;
    isSentByMe: boolean;
    canRead: boolean;
  } {
    const currentUser = this.webSocketService.getCurrentUser();
    const isSentByMe = currentUser?.id === message.senderId;

    return {
      hasSenderReference: !!message.senderReference,
      hasEncryptedData: !!message.encryptedData,
      isSentByMe,
      canRead: this.canDecryptMessage(message)
    };
  }
} 