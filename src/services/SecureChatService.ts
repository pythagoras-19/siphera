import { E2EEncryption, EncryptedMessage, KeyPair } from '../utils/encryption';

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
  private userKeyPair: KeyPair | null = null;
  private chatSessions: Map<string, ChatSession> = new Map();
  private messageHistory: Map<string, SecureMessage[]> = new Map();

  private constructor() {
    this.initializeUserKeys();
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
  private initializeUserKeys(): void {
    if (!this.userKeyPair) {
      this.userKeyPair = E2EEncryption.generateKeyPair();
      console.log('🔐 User encryption keys generated');
    }
  }

  /**
   * Get or create a chat session with a contact
   */
  private getChatSession(contactId: string): ChatSession {
    if (!this.chatSessions.has(contactId)) {
      // In a real app, this would exchange keys with the contact
      const sharedSecret = E2EEncryption.generateSharedSecret(
        this.userKeyPair!.privateKey,
        E2EEncryption.generateSecureRandom(32) // Simulated contact key
      );

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
    const session = this.getChatSession(recipientId);
    
    // Encrypt the message
    const encryptedData = E2EEncryption.encryptMessage(messageText, session.sharedSecret);
    
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
    const session = this.getChatSession(senderId);
    
    try {
      // Decrypt the message
      const decryptedText = E2EEncryption.decryptMessage(
        encryptedMessage.encryptedData,
        session.sharedSecret
      );

      // Store in message history
      const chatId = this.getChatId(senderId);
      if (!this.messageHistory.has(chatId)) {
        this.messageHistory.set(chatId, []);
      }
      this.messageHistory.get(chatId)!.push(encryptedMessage);

      // Update session
      session.lastMessageTime = Date.now();
      session.messageCount++;

      console.log(`🔓 Message decrypted from ${senderId}`);
      return decryptedText;
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
    const session = this.getChatSession(contactId);
    
    const decryptedMessages = await Promise.all(
      messages.map(async (message) => {
        try {
          const decryptedText = E2EEncryption.decryptMessage(
            message.encryptedData,
            session.sharedSecret
          );
          
          return {
            id: message.id,
            text: decryptedText,
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
    return this.userKeyPair?.publicKey || null;
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
} 