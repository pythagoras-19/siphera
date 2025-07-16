import { WebSocketService } from './WebSocketService';

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
    const keyId = this.generateKeyId();
    const timestamp = Date.now();
    
    // Use deterministic key generation
    const senderKey = await this.generateDeterministicKey(userId, timestamp, keyId);
    
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
   * Get sender key by specific keyId (for decrypting specific messages)
   */
  async getSenderKeyById(keyId: string): Promise<SenderKey | null> {
    try {
      console.log('🔍 Getting sender key by ID:', keyId);
      
      // First, try to get the key from memory storage
      const memoryKey = this.keyIdStorage.get(keyId);
      if (memoryKey) {
        console.log('✅ Found sender key in memory:', {
          id: memoryKey.id,
          userId: memoryKey.userId,
          createdAt: memoryKey.createdAt
        });
        return memoryKey;
      }
      
      // If not in memory, try to regenerate deterministically
      // Extract timestamp from keyId: sender_key_1752689621785_uej4q276n
      const parts = keyId.split('_');
      if (parts.length >= 3) {
        const timestamp = parseInt(parts[2]);
        
        // For deterministic key generation, we need the userId
        // Since the keyId doesn't contain userId, we need to get it from the current user
        const currentUser = WebSocketService.getInstance().getCurrentUser();
        const userId = currentUser?.id || 'default';
        
        console.log('🔑 Generating deterministic key with:', {
          userId,
          timestamp,
          keyId,
          seed: `${userId}_${timestamp}`
        });
        
        // Generate deterministic key based on timestamp and userId
        const key = await this.generateDeterministicKey(userId, timestamp, keyId);
        console.log('✅ Generated sender key:', {
          id: key.id,
          userId: key.userId,
          createdAt: key.createdAt
        });
        
        // Store the regenerated key for future use
        this.keyIdStorage.set(keyId, key);
        return key;
      }
    } catch (error) {
      console.error('Error getting sender key by ID:', error);
    }
    return null;
  }

  /**
   * Generate a deterministic key based on timestamp and userId
   */
  private async generateDeterministicKey(userId: string, timestamp: number, keyId: string): Promise<SenderKey> {
    // Create a deterministic seed from userId and timestamp
    const seed = `${userId}_${timestamp}`;
    const encoder = new TextEncoder();
    const seedData = encoder.encode(seed);
    
    // Use PBKDF2 to derive a key from the seed
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      seedData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('siphera_sender_salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    return {
      id: keyId,
      key,
      userId,
      createdAt: timestamp
    };
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
    this.keyIdStorage.set(senderKey.id, senderKey);
  }

  // Memory storage for CryptoKey objects
  private memoryStorage: Map<string, SenderKey> = new Map();
  private keyIdStorage: Map<string, SenderKey> = new Map();

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
    try {
      console.log('🔓 Attempting to decrypt content with sender key:', {
        keyId: senderKey.id,
        contentLength: encryptedContent.length
      });

      const combined = new Uint8Array(
        atob(encryptedContent).split('').map(char => char.charCodeAt(0))
      );

      const iv = combined.slice(0, 12);
      const encryptedData = combined.slice(12);

      console.log('🔓 Decryption parameters:', {
        ivLength: iv.length,
        encryptedDataLength: encryptedData.length,
        totalLength: combined.length
      });

      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        senderKey.key,
        encryptedData
      );

      const decoder = new TextDecoder();
      const result = decoder.decode(decryptedData);
      
      console.log('✅ Successfully decrypted content:', result);
      return result;
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw error;
    }
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
      
      // Clean up keyId storage for this user
      this.keyIdStorage.forEach((key, keyId) => {
        if (key.userId === userId) {
          this.keyIdStorage.delete(keyId);
        }
      });
    } catch (error) {
      console.warn('Error deleting sender key:', error);
    }
  }
} 