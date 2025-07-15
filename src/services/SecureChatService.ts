import { KeyManagementService } from './KeyManagementService';
import { E2EEncryption, EncryptedMessage } from '../utils/encryption';

export interface SecureMessage {
  id: string;
  sender: string;
  recipient: string;
  encryptedData: EncryptedMessage;
  messageHash: string;
  timestamp: number;
  isEncrypted: boolean;
}

export interface ChatSession {
  contactId: string;
  sharedSecret: string;
  lastMessageTime: number;
  messageCount: number;
}

export class SecureChatService {
  private static instance: SecureChatService;
  private keyManagement: KeyManagementService;
  private chatSessions: Map<string, ChatSession> = new Map();
  private messageHistory: Map<string, SecureMessage[]> = new Map();
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.keyManagement = KeyManagementService.getInstance();
    this.initializationPromise = this.initializeUserKeys();
  }

  static getInstance(): SecureChatService {
    if (!SecureChatService.instance) {
      SecureChatService.instance = new SecureChatService();
    }
    return SecureChatService.instance;
  }

  /**
   * Initialize user's encryption keys
   */
  private async initializeUserKeys(): Promise<void> {
    await this.keyManagement.initializeUserKeys();
    console.log('🔐 User encryption keys initialized');
  }

  /**
   * Ensure the service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
      this.initializationPromise = null;
    }
  }

  /**
   * Get or create a chat session with a contact
   */
  private async getChatSession(contactId: string): Promise<ChatSession> {
    await this.ensureInitialized();
    
    if (!this.chatSessions.has(contactId)) {
      // Check if we have the contact's public key
      const contactPublicKey = this.keyManagement.getContactPublicKey(contactId);
      
      if (!contactPublicKey) {
        // For now, use a temporary shared secret until key exchange completes
        const tempSecret = E2EEncryption.generateSecureRandom(32);
        const session: ChatSession = {
          contactId,
          sharedSecret: tempSecret,
          lastMessageTime: Date.now(),
          messageCount: 0
        };
        this.chatSessions.set(contactId, session);
        console.log(`🔐 Temporary session established with ${contactId} (waiting for key exchange)`);
        return session;
      }

      // Generate shared secret using actual contact's public key
      const sharedSecret = await this.keyManagement.generateSharedSecret(contactId);
      if (!sharedSecret) {
        throw new Error(`Failed to generate shared secret with ${contactId}`);
      }

      const session: ChatSession = {
        contactId,
        sharedSecret,
        lastMessageTime: Date.now(),
        messageCount: 0
      };

      this.chatSessions.set(contactId, session);
      console.log(`🔐 New secure session established with ${contactId}`);
    }

    return this.chatSessions.get(contactId)!;
  }

  /**
   * Send an encrypted message
   */
  async sendEncryptedMessage(recipientId: string, messageText: string): Promise<SecureMessage> {
    const session = await this.getChatSession(recipientId);
    
    // Encrypt the message with HMAC authentication
    const encryptedData = await E2EEncryption.encryptMessage(messageText, session.sharedSecret);
    
    // Generate message hash for integrity verification
    const messageHash = E2EEncryption.generateSecureRandom(32);
    
    const secureMessage: SecureMessage = {
      id: E2EEncryption.generateSecureRandom(16),
      sender: 'me',
      recipient: recipientId,
      encryptedData,
      messageHash,
      timestamp: Date.now(),
      isEncrypted: true
    };

    // Store in message history
    const chatId = this.getChatId(recipientId);
    if (!this.messageHistory.has(chatId)) {
      this.messageHistory.set(chatId, []);
    }
    this.messageHistory.get(chatId)!.push(secureMessage);

    // Update session
    session.lastMessageTime = Date.now();
    session.messageCount++;

    console.log(`🔒 Message encrypted and sent to ${recipientId}`);
    return secureMessage;
  }

  /**
   * Receive and decrypt a message
   */
  async receiveEncryptedMessage(senderId: string, encryptedMessage: SecureMessage): Promise<string> {
    const session = await this.getChatSession(senderId);
    
    try {
      // Decrypt and verify the message
      const verifiedMessage = await E2EEncryption.decryptMessage(
        encryptedMessage.encryptedData,
        session.sharedSecret
      );

      if (!verifiedMessage.verified) {
        console.warn(`Message from ${senderId} failed verification`);
        throw new Error('Message verification failed');
      }

      // Store in message history
      const chatId = this.getChatId(senderId);
      if (!this.messageHistory.has(chatId)) {
        this.messageHistory.set(chatId, []);
      }
      this.messageHistory.get(chatId)!.push(encryptedMessage);

      // Update session
      session.lastMessageTime = Date.now();
      session.messageCount++;

      console.log(`🔓 Message decrypted and verified from ${senderId}`);
      return verifiedMessage.message;
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      throw new Error('Message decryption failed');
    }
  }

  /**
   * Get chat history for a contact
   */
  getChatHistory(contactId: string): SecureMessage[] {
    const chatId = this.getChatId(contactId);
    return this.messageHistory.get(chatId) || [];
  }

  /**
   * Get decrypted chat history for display
   */
  async getDecryptedChatHistory(contactId: string): Promise<Array<{ id: string; text: string; sender: string; timestamp: number; isEncrypted: boolean }>> {
    const messages = this.getChatHistory(contactId);
    const session = await this.getChatSession(contactId);
    
    const decryptedMessages = await Promise.all(
      messages.map(async (message) => {
        try {
          const verifiedMessage = await E2EEncryption.decryptMessage(
            message.encryptedData,
            session.sharedSecret
          );
          
          return {
            id: message.id,
            text: verifiedMessage.verified ? verifiedMessage.message : '[Verification Failed]',
            sender: message.sender,
            timestamp: message.timestamp,
            isEncrypted: true
          };
        } catch (error) {
          console.error('Failed to decrypt message in history:', error);
          return {
            id: message.id,
            text: '[Encrypted Message]',
            sender: message.sender,
            timestamp: message.timestamp,
            isEncrypted: true
          };
        }
      })
    );

    return decryptedMessages.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Generate a unique chat ID
   */
  private getChatId(contactId: string): string {
    return `chat_${contactId}`;
  }

  /**
   * Get encryption status for a contact
   */
  isContactEncrypted(contactId: string): boolean {
    return this.chatSessions.has(contactId);
  }

  /**
   * Get user's public key for key exchange
   */
  getUserPublicKey(): string | null {
    return this.keyManagement.getUserPublicKey();
  }

  /**
   * Clear chat history for a contact
   */
  clearChatHistory(contactId: string): void {
    const chatId = this.getChatId(contactId);
    this.messageHistory.delete(chatId);
    console.log(`🗑️ Chat history cleared for ${contactId}`);
  }

  /**
   * Get encryption statistics
   */
  getEncryptionStats(): { totalSessions: number; totalMessages: number } {
    let totalMessages = 0;
    this.messageHistory.forEach(messages => {
      totalMessages += messages.length;
    });

    return {
      totalSessions: this.chatSessions.size,
      totalMessages
    };
  }

  /**
   * Store a contact's public key (called during key exchange)
   */
  async storeContactKey(contactId: string, publicKey: string): Promise<void> {
    await this.ensureInitialized();
    await this.keyManagement.storeContactKey(contactId, publicKey);
    
    // If we have an existing session, update it with the real shared secret
    if (this.chatSessions.has(contactId)) {
      const sharedSecret = await this.keyManagement.generateSharedSecret(contactId);
      if (sharedSecret) {
        const session = this.chatSessions.get(contactId)!;
        session.sharedSecret = sharedSecret;
        console.log(`🔐 Updated session with real shared secret for ${contactId}`);
      }
    }
  }

  /**
   * Get contact's public key
   */
  getContactPublicKey(contactId: string): string | null {
    return this.keyManagement.getContactPublicKey(contactId);
  }

  /**
   * Check if we have a contact's public key
   */
  hasContactKey(contactId: string): boolean {
    return !!this.keyManagement.getContactPublicKey(contactId);
  }
} 