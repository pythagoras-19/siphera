export interface SenderKey {
  id: string;
  key: CryptoKey;
  userId: string;
  createdAt: number;
}

export class SenderKeyService {
  private readonly STORAGE_PREFIX = 'siphera_sender_key_';

  constructor() {}

  /**
   * Generate a new sender key for a user
   */
  async generateSenderKey(userId: string): Promise<SenderKey> {
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );

    const senderKey: SenderKey = {
      id: this.generateKeyId(),
      key,
      userId,
      createdAt: Date.now()
    };

    await this.storeSenderKey(senderKey);
    return senderKey;
  }

  /**
   * Get or create sender key for a user
   */
  async getSenderKey(userId: string): Promise<SenderKey> {
    try {
      const existingKey = await this.retrieveSenderKey(userId);
      if (existingKey) {
        return existingKey;
      }
    } catch (error) {
      console.log('No existing sender key found, generating new one...');
    }

    return await this.generateSenderKey(userId);
  }

  /**
   * Store sender key securely
   */
  private async storeSenderKey(senderKey: SenderKey): Promise<void> {
    const keyData = {
      id: senderKey.id,
      userId: senderKey.userId,
      createdAt: senderKey.createdAt
    };

    // Store key metadata
    localStorage.setItem(`${this.STORAGE_PREFIX}meta_${senderKey.userId}`, JSON.stringify(keyData));
    
    // Store the actual key (CryptoKey objects can't be serialized directly)
    // We'll store the key in memory and keep a reference
    this.memoryStorage.set(senderKey.userId, senderKey);
  }

  // Memory storage for CryptoKey objects
  private memoryStorage: Map<string, SenderKey> = new Map();

  /**
   * Retrieve sender key from storage
   */
  private async retrieveSenderKey(userId: string): Promise<SenderKey | null> {
    try {
      // First check memory storage
      const memoryKey = this.memoryStorage.get(userId);
      if (memoryKey) {
        return memoryKey;
      }

      // Check if metadata exists in localStorage
      const metadata = localStorage.getItem(`${this.STORAGE_PREFIX}meta_${userId}`);
      if (!metadata) {
        return null;
      }

      // If metadata exists but no memory key, we need to regenerate
      // (CryptoKey objects can't be persisted across sessions)
      console.log('Sender key metadata found, but key lost. Regenerating...');
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Encrypt content with sender key
   */
  async encryptForSender(content: string, senderKey: SenderKey): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      senderKey.key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return btoa(String.fromCharCode(...Array.from(combined)));
  }

  /**
   * Decrypt content with sender key
   */
  async decryptForSender(encryptedContent: string, senderKey: SenderKey): Promise<string> {
    const combined = new Uint8Array(
      atob(encryptedContent).split('').map(char => char.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      senderKey.key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }

  /**
   * Generate a unique key ID
   */
  private generateKeyId(): string {
    return 'sender_key_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Check if user has a sender key
   */
  async hasSenderKey(userId: string): Promise<boolean> {
    try {
      const key = await this.retrieveSenderKey(userId);
      return key !== null;
    } catch {
      return false;
    }
  }

  /**
   * Delete sender key (for cleanup)
   */
  async deleteSenderKey(userId: string): Promise<void> {
    try {
      localStorage.removeItem(`${this.STORAGE_PREFIX}meta_${userId}`);
      this.memoryStorage.delete(userId);
    } catch (error) {
      console.warn('Error deleting sender key:', error);
    }
  }
} 