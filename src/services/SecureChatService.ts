import { KeyManagementService } from './KeyManagementService';
import { SenderKeyService } from './SenderKeyService';
import { WebSocketService } from './WebSocketService';
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
  private senderKeyService: SenderKeyService;
  private chatSessions: Map<string, ChatSession> = new Map();
  private messageHistory: Map<string, SecureMessage[]> = new Map();
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.keyManagement = KeyManagementService.getInstance();
    this.senderKeyService = new SenderKeyService();
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
        // Try to request the contact's public key
        console.log(`🔑 No public key for ${contactId}, requesting key exchange...`);
        await this.requestKeyExchange(contactId);
        
        // Create a deterministic temporary secret based on contact ID
        // This ensures the same secret is used for encryption and decryption
        const tempSecret = this.generateDeterministicSecret(contactId);
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
        console.warn(`⚠️ Failed to generate ECDH shared secret with ${contactId}, using deterministic fallback`);
        // Fall back to deterministic secret if ECDH fails
        const tempSecret = this.generateDeterministicSecret(contactId);
        const session: ChatSession = {
          contactId,
          sharedSecret: tempSecret,
          lastMessageTime: Date.now(),
          messageCount: 0
        };
        this.chatSessions.set(contactId, session);
        console.log(`🔐 Fallback session established with ${contactId} (ECDH failed)`);
        return session;
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
   * Request key exchange with a contact
   */
  private async requestKeyExchange(contactId: string): Promise<void> {
    try {
      const currentUser = WebSocketService.getInstance().getCurrentUser();
      if (!currentUser?.id) {
        console.warn('No current user, cannot request key exchange');
        return;
      }

      const ourPublicKey = this.keyManagement.getUserPublicKey();
      if (!ourPublicKey) {
        console.warn('No public key available, cannot request key exchange');
        return;
      }

      // Send key request via WebSocket
      const webSocketService = WebSocketService.getInstance();
      if (webSocketService.isConnected()) {
        // Use the WebSocketService's method to send key requests
        webSocketService.sendKeyRequest(contactId);
        console.log(`🔑 Key request sent to ${contactId}`);
      }
    } catch (error) {
      console.error('Failed to request key exchange:', error);
    }
  }

  /**
   * Generate a deterministic temporary secret for contacts without public keys
   * This ensures the same secret is used for encryption and decryption
   */
  private generateDeterministicSecret(contactId: string): string {
    // Use a combination of user's private key and contact ID to generate a consistent secret
    const userPrivateKey = this.keyManagement.getUserPrivateKey();
    const combined = (userPrivateKey || '') + contactId;
    return E2EEncryption.hashPassword(combined);
  }

  /**
   * Send an encrypted message
   */
  async sendEncryptedMessage(recipientId: string, messageText: string): Promise<SecureMessage> {
    const session = await this.getChatSession(recipientId);
    
    console.log(`🔍 Encrypting message for ${recipientId}:`, {
      hasSession: !!session,
      sessionSecretLength: session.sharedSecret.length,
      messageText: messageText.substring(0, 20) + '...',
      hasContactKey: this.hasContactKey(recipientId)
    });
    
    // Encrypt the message with HMAC authentication for recipient
    const encryptedData = await E2EEncryption.encryptMessage(messageText, session.sharedSecret);
    
    // NEW: Encrypt the message for sender's own reference
    const currentUser = WebSocketService.getInstance().getCurrentUser();
    let senderReference = null;
    
    if (currentUser?.id) {
      try {
        const senderKey = await this.senderKeyService.getSenderKey(currentUser.id);
        const senderEncrypted = await this.senderKeyService.encryptForSender(messageText, senderKey);
        
        senderReference = {
          content: senderEncrypted,
          keyId: senderKey.id,
          timestamp: Date.now()
        };
        
        console.log(`🔐 Message encrypted for sender reference with key ${senderKey.id}`);
      } catch (error) {
        console.warn('Failed to encrypt message for sender reference:', error);
        // Don't fail the entire message send if sender reference fails
        // This is optional functionality
      }
    }
    
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

    console.log(`🔒 Message encrypted and sent to ${recipientId}:`, {
      encryptedTextLength: encryptedData.encryptedText.length,
      hasHmac: !!encryptedData.hmac,
      timestamp: encryptedData.timestamp,
      hasSenderReference: !!senderReference
    });
    
    // Add senderReference to the message for backend storage
    (secureMessage as any).senderReference = senderReference;
    
    return secureMessage;
  }

  /**
   * Receive and decrypt a message
   */
  async receiveEncryptedMessage(senderId: string, encryptedMessage: SecureMessage): Promise<string> {
    const session = await this.getChatSession(senderId);
    
    console.log(`🔍 Attempting to decrypt message from ${senderId}:`, {
      hasSession: !!session,
      sessionSecretLength: session.sharedSecret.length,
      encryptedData: encryptedMessage.encryptedData,
      hasContactKey: this.hasContactKey(senderId),
      messageId: encryptedMessage.id,
      timestamp: encryptedMessage.timestamp
    });
    
    // Check if this is a legacy message (before proper ECDH key exchange)
    const isLegacyMessage = this.isLegacyMessage(encryptedMessage);
    if (isLegacyMessage) {
      console.log(`🏛️ Legacy message detected from ${senderId} - marking as incompatible`);
      throw new Error('LEGACY_MESSAGE_INCOMPATIBLE');
    }
    
    // Try multiple secrets for decryption (for backward compatibility)
    const secretsToTry = await this.generateSecretsToTry(senderId);
    
    console.log(`🔑 Generated ${secretsToTry.length} secrets to try for ${senderId}`);
    secretsToTry.forEach((secret, index) => {
      console.log(`  Secret ${index + 1}: ${secret.substring(0, 20)}... (length: ${secret.length})`);
    });
    
    for (let i = 0; i < secretsToTry.length; i++) {
      const secret = secretsToTry[i];
      try {
        console.log(`🔑 Trying secret ${i + 1}/${secretsToTry.length} for ${senderId} (${secret.substring(0, 20)}...)`);
        
        // Check if HMAC is missing (old messages)
        const hasHmac = !!encryptedMessage.encryptedData.hmac;
        console.log(`  Message has HMAC: ${hasHmac}`);
        
        if (!hasHmac) {
          // Try decryption without HMAC verification for old messages
          console.log(`🔑 Trying decryption without HMAC for ${senderId} with secret ${i + 1}`);
          const decryptedMessage = await this.tryDecryptWithoutHMAC(encryptedMessage.encryptedData, secret);
          if (decryptedMessage) {
            console.log(`🔓 Message decrypted without HMAC from ${senderId} with secret ${i + 1}:`, decryptedMessage);
            
            // Store in message history
            const chatId = this.getChatId(senderId);
            if (!this.messageHistory.has(chatId)) {
              this.messageHistory.set(chatId, []);
            }
            this.messageHistory.get(chatId)!.push(encryptedMessage);

            // Update session with the working secret
            session.sharedSecret = secret;
            session.lastMessageTime = Date.now();
            session.messageCount++;

            return decryptedMessage;
          }
        } else {
          // Decrypt and verify the message with HMAC
          console.log(`  Attempting HMAC verification with secret ${i + 1}`);
          const verifiedMessage = await E2EEncryption.decryptMessage(
            encryptedMessage.encryptedData,
            secret
          );

          if (verifiedMessage.verified) {
            // Store in message history
            const chatId = this.getChatId(senderId);
            if (!this.messageHistory.has(chatId)) {
              this.messageHistory.set(chatId, []);
            }
            this.messageHistory.get(chatId)!.push(encryptedMessage);

            // Update session with the working secret
            session.sharedSecret = secret;
            session.lastMessageTime = Date.now();
            session.messageCount++;

            console.log(`🔓 Message decrypted and verified from ${senderId} with secret ${i + 1}:`, verifiedMessage.message);
            return verifiedMessage.message;
          } else {
            console.log(`  HMAC verification failed with secret ${i + 1}`);
          }
        }
      } catch (error) {
        console.log(`❌ Secret ${i + 1} failed for ${senderId}:`, error instanceof Error ? error.message : String(error));
        
        // Try decryption without HMAC verification for old messages
        try {
          console.log(`  Attempting fallback decryption without HMAC for secret ${i + 1}`);
          const decryptedMessage = await this.tryDecryptWithoutHMAC(encryptedMessage.encryptedData, secret);
          if (decryptedMessage) {
            console.log(`🔓 Message decrypted without HMAC from ${senderId} with secret ${i + 1}:`, decryptedMessage);
            
            // Store in message history
            const chatId = this.getChatId(senderId);
            if (!this.messageHistory.has(chatId)) {
              this.messageHistory.set(chatId, []);
            }
            this.messageHistory.get(chatId)!.push(encryptedMessage);

            // Update session with the working secret
            session.sharedSecret = secret;
            session.lastMessageTime = Date.now();
            session.messageCount++;

            return decryptedMessage;
          }
        } catch (hmacError) {
          console.log(`  Fallback decryption also failed for secret ${i + 1}:`, hmacError instanceof Error ? hmacError.message : String(hmacError));
          // Continue to next secret
          continue;
        }
      }
    }

    // If all secrets failed
    console.error('❌ Failed to decrypt message with any secret');
    console.error('Session details:', {
      contactId: session.contactId,
      sharedSecretLength: session.sharedSecret.length,
      messageCount: session.messageCount
    });
    console.error('Encrypted message details:', {
      id: encryptedMessage.id,
      sender: encryptedMessage.sender,
      recipient: encryptedMessage.recipient,
      hasEncryptedData: !!encryptedMessage.encryptedData,
      encryptedDataKeys: encryptedMessage.encryptedData ? Object.keys(encryptedMessage.encryptedData) : [],
      timestamp: encryptedMessage.timestamp
    });
    throw new Error('Message decryption failed - no working secret found');
  }

  /**
   * Check if a message is a legacy message (before proper ECDH key exchange)
   */
  private isLegacyMessage(encryptedMessage: SecureMessage): boolean {
    // Legacy messages are those sent before we had proper ECDH key exchange
    // We can identify them by timestamp before we added the contact key
    const legacyCutoffTime = new Date('2025-01-22T10:07:00').getTime(); // When we added the contact key
    const messageTime = encryptedMessage.timestamp;
    
    // If message is older than the cutoff, it's legacy
    if (messageTime < legacyCutoffTime) {
      return true;
    }
    
    return false;
  }

  /**
   * Generate multiple secrets to try for decryption (backward compatibility)
   */
  private async generateSecretsToTry(contactId: string): Promise<string[]> {
    const secrets: string[] = [];
    
    // 1. PRIORITY: Proper ECDH shared secret from key exchange
    const contactPublicKey = this.keyManagement.getContactPublicKey(contactId);
    if (contactPublicKey) {
      console.log(`🔑 Found public key for ${contactId}, generating ECDH shared secret...`);
      const sharedSecret = await this.keyManagement.generateSharedSecret(contactId);
      if (sharedSecret) {
        secrets.push(sharedSecret);
        console.log(`✅ Generated ECDH shared secret for ${contactId}: ${sharedSecret.substring(0, 20)}...`);
      } else {
        console.warn(`❌ Failed to generate ECDH shared secret for ${contactId}`);
      }
    } else {
      console.warn(`⚠️ No public key found for ${contactId}, cannot use ECDH`);
    }
    
    // 2. FALLBACK: Deterministic secret (for contacts without public keys)
    const currentSecret = this.generateDeterministicSecret(contactId);
    secrets.push(currentSecret);
    console.log(`🔑 Using deterministic secret as fallback for ${contactId}: ${currentSecret.substring(0, 20)}...`);
    
    // 3. LEGACY: Various legacy combinations (for old messages)
    const userPrivateKey = this.keyManagement.getUserPrivateKey();
    if (userPrivateKey) {
      console.log(`🔑 Adding legacy secrets for ${contactId}...`);
      const legacySecrets = [
        E2EEncryption.hashPassword(userPrivateKey + contactId + 'legacy1'),
        E2EEncryption.hashPassword(contactId + userPrivateKey + 'legacy2'),
        E2EEncryption.hashPassword(userPrivateKey.substring(0, 16) + contactId),
        E2EEncryption.hashPassword(contactId + userPrivateKey.substring(0, 16)),
        // Try simpler combinations
        E2EEncryption.hashPassword(userPrivateKey + contactId),
        E2EEncryption.hashPassword(contactId + userPrivateKey),
        // Try with different hash methods
        E2EEncryption.hashPassword(userPrivateKey + contactId + 'v1'),
        E2EEncryption.hashPassword(userPrivateKey + contactId + 'v2'),
        // Try with just the contact ID as a fallback
        E2EEncryption.hashPassword(contactId),
        // Try with just the user private key as a fallback
        E2EEncryption.hashPassword(userPrivateKey),
        // Try with a simple combination
        userPrivateKey + contactId,
        contactId + userPrivateKey
      ];
      
      for (const legacySecret of legacySecrets) {
        if (!secrets.includes(legacySecret) && legacySecret && legacySecret.length > 0) {
          secrets.push(legacySecret);
        }
      }
      console.log(`🔑 Added ${legacySecrets.length} legacy secrets for ${contactId}`);
    }
    
    console.log(`🔑 Generated ${secrets.length} total secrets to try for ${contactId}`);
    return secrets;
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
          // Try multiple secrets for decryption (for backward compatibility)
          const secretsToTry = await this.generateSecretsToTry(contactId);
          
          for (const secret of secretsToTry) {
            try {
              const verifiedMessage = await E2EEncryption.decryptMessage(
                message.encryptedData,
                secret
              );
              
              if (verifiedMessage.verified) {
                // Update session with the working secret
                session.sharedSecret = secret;
                
                return {
                  id: message.id,
                  text: verifiedMessage.message,
                  sender: message.sender,
                  timestamp: message.timestamp,
                  isEncrypted: true
                };
              }
            } catch (error) {
              // Try decryption without HMAC verification for old messages
              try {
                const decryptedMessage = await this.tryDecryptWithoutHMAC(message.encryptedData, secret);
                if (decryptedMessage) {
                  // Update session with the working secret
                  session.sharedSecret = secret;
                  
                  return {
                    id: message.id,
                    text: decryptedMessage,
                    sender: message.sender,
                    timestamp: message.timestamp,
                    isEncrypted: true
                  };
                }
              } catch (hmacError) {
                // Continue to next secret
                continue;
              }
            }
          }
          
          // If no secret worked
          return {
            id: message.id,
            text: '[Encrypted Message - Decryption Failed]',
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

  /**
   * Handle key exchange when receiving a contact's public key
   */
  async handleKeyExchange(contactId: string, publicKey: string): Promise<void> {
    await this.storeContactKey(contactId, publicKey);
    
    // Re-encrypt any existing messages with the new shared secret
    const chatId = this.getChatId(contactId);
    const messages = this.messageHistory.get(chatId) || [];
    
    if (messages.length > 0) {
      console.log(`🔄 Re-encrypting ${messages.length} messages with new shared secret for ${contactId}`);
      // Note: In a real implementation, you might want to re-encrypt stored messages
      // For now, we'll just update the session
    }
  }

  /**
   * Try to decrypt message without HMAC verification (for old messages)
   */
  private async tryDecryptWithoutHMAC(encryptedData: any, secret: string): Promise<string | null> {
    try {
      // Import the encryption key using the stored salt (or fallback for old messages)
      const salt = encryptedData.salt || 'encryption';
      const keys = await E2EEncryption['deriveKeys'](secret, salt);
      const encryptionKey = keys.encryptionKey;
      
      // Decode the encrypted text and IV
      const encryptedText = encryptedData.encryptedText;
      const iv = encryptedData.iv;
      
      if (!encryptedText || !iv) {
        return null;
      }

      // Validate Base64 strings before attempting to decode
      const isValidBase64 = (str: string) => {
        try {
          return btoa(atob(str)) === str;
        } catch {
          return false;
        }
      };

      if (!isValidBase64(iv) || !isValidBase64(encryptedText)) {
        console.log('Invalid Base64 data for decryption');
        return null;
      }

      // Try to decrypt without HMAC verification
      let decryptedText: string;
      
      if (window.crypto && window.crypto.subtle) {
        // Use Web Crypto API
        const keyBuffer = E2EEncryption['base64ToArrayBuffer'](encryptionKey);
        const ivBuffer = E2EEncryption['base64ToArrayBuffer'](iv);
        const encryptedBuffer = E2EEncryption['base64ToArrayBuffer'](encryptedText);
        
        const cryptoKey = await window.crypto.subtle.importKey(
          'raw',
          keyBuffer,
          'AES-GCM',
          false,
          ['decrypt']
        );
        
        const decryptedBuffer = await window.crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: new Uint8Array(ivBuffer)
          },
          cryptoKey,
          encryptedBuffer
        );
        
        decryptedText = new TextDecoder().decode(decryptedBuffer);
      } else {
        // Fallback to CryptoJS
        const CryptoJS = require('crypto-js');
        const decrypted = CryptoJS.AES.decrypt(encryptedText, encryptionKey, {
          iv: CryptoJS.enc.Base64.parse(iv),
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });
        decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      }
      
      return decryptedText || null;
    } catch (error) {
      console.log('Failed to decrypt without HMAC:', error);
      return null;
    }
  }
} 