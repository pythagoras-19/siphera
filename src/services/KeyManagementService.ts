import { E2EEncryption, KeyPair } from '../utils/encryption';
import { SecureKeyStorage, StoredKeys, ContactKey } from './SecureKeyStorage';

export class KeyManagementService {
  private static instance: KeyManagementService;
  private secureStorage: SecureKeyStorage;
  private userKeyPair: KeyPair | null = null;
  private contactKeys: Map<string, ContactKey> = new Map();

  private constructor() {
    this.secureStorage = SecureKeyStorage.getInstance();
    this.loadKeysFromStorage();
  }

  static getInstance(): KeyManagementService {
    if (!KeyManagementService.instance) {
      KeyManagementService.instance = new KeyManagementService();
    }
    return KeyManagementService.instance;
  }

  /**
   * Initialize or load user's key pair
   */
  async initializeUserKeys(): Promise<KeyPair> {
    if (!this.userKeyPair) {
      // Try to load from secure storage first
      const stored = await this.secureStorage.getKeys();
      if (stored?.userKeyPair) {
        this.userKeyPair = stored.userKeyPair;
        this.contactKeys.clear();
        stored.contactKeys.forEach(contactKey => {
          this.contactKeys.set(contactKey.userId, contactKey);
        });
        console.log('🔐 User keys loaded from secure storage');
      } else {
        // Generate new keys
        this.userKeyPair = E2EEncryption.generateKeyPair();
        console.log('🔐 New user keys generated');
        await this.saveKeysToStorage();
      }
    }
    return this.userKeyPair;
  }

  /**
   * Get user's public key for sharing
   */
  getUserPublicKey(): string | null {
    return this.userKeyPair?.publicKey || null;
  }

  /**
   * Get user's private key for decryption
   */
  getUserPrivateKey(): string | null {
    return this.userKeyPair?.privateKey || null;
  }

  /**
   * Store a contact's public key
   */
  async storeContactKey(userId: string, publicKey: string): Promise<void> {
    const contactKey: ContactKey = {
      userId,
      publicKey,
      lastUpdated: Date.now()
    };

    this.contactKeys.set(userId, contactKey);
    await this.saveKeysToStorage();
    console.log(`🔑 Contact key stored for ${userId}`);
  }

  /**
   * Get a contact's public key
   */
  getContactKey(userId: string): string | null {
    const contactKey = this.contactKeys.get(userId);
    return contactKey?.publicKey || null;
  }

  /**
   * Check if we have a contact's public key
   */
  hasContactKey(userId: string): boolean {
    return this.contactKeys.has(userId);
  }

  /**
   * Request a contact's public key (for demo purposes)
   */
  requestContactKey(contactId: string): void {
    // In a real implementation, this would send a request to the contact
    // For now, we'll simulate key exchange
    this.simulateKeyExchange(contactId);
  }

  /**
   * Generate a shared secret with a contact using their public key
   */
  generateSharedSecret(contactId: string): string | null {
    const contactPublicKey = this.getContactKey(contactId);
    const userPrivateKey = this.getUserPrivateKey();

    if (!contactPublicKey || !userPrivateKey) {
      console.warn(`Missing keys for contact ${contactId}`);
      return null;
    }

    const sharedSecret = E2EEncryption.generateSharedSecret(
      userPrivateKey,
      contactPublicKey
    );

    console.log(`🔐 Shared secret generated with ${contactId}`);
    return sharedSecret;
  }

  /**
   * Get all contact keys
   */
  getAllContactKeys(): ContactKey[] {
    return Array.from(this.contactKeys.values());
  }

  /**
   * Simulate key exchange for demo purposes
   */
  private async simulateKeyExchange(contactId: string): Promise<void> {
    // Generate a simulated public key for the contact
    const simulatedKeyPair = E2EEncryption.generateKeyPair();
    await this.storeContactKey(contactId, simulatedKeyPair.publicKey);
    console.log(`🔑 Simulated key exchange completed with ${contactId}`);
  }

  /**
   * Save keys to secure storage
   */
  private async saveKeysToStorage(): Promise<void> {
    try {
      const storedKeys: StoredKeys = {
        userKeyPair: this.userKeyPair!,
        contactKeys: Array.from(this.contactKeys.values()),
        lastBackup: Date.now()
      };

      await this.secureStorage.storeKeys(storedKeys);
      console.log('💾 Keys saved to secure storage');
    } catch (error) {
      console.error('Failed to save keys to secure storage:', error);
    }
  }

  /**
   * Load keys from secure storage
   */
  private async loadKeysFromStorage(): Promise<void> {
    try {
      const stored = await this.secureStorage.getKeys();
      if (stored) {
        this.userKeyPair = stored.userKeyPair;
        this.contactKeys.clear();
        stored.contactKeys.forEach(contactKey => {
          this.contactKeys.set(contactKey.userId, contactKey);
        });
        console.log('📂 Keys loaded from secure storage');
      }
    } catch (error) {
      console.error('Failed to load keys from secure storage:', error);
    }
  }

  /**
   * Clear all stored keys (for testing/reset)
   */
  async clearAllKeys(): Promise<void> {
    this.userKeyPair = null;
    this.contactKeys.clear();
    await this.secureStorage.clearKeys();
    console.log('🗑️ All keys cleared');
  }

  /**
   * Get encryption statistics
   */
  getStats(): { 
    hasUserKeys: boolean; 
    contactCount: number; 
    lastBackup: number | null;
    securityLevel: string;
    storageType: string;
  } {
    return this.secureStorage.getStats();
  }

  /**
   * Get security recommendations
   */
  getSecurityRecommendations(): string[] {
    return this.secureStorage.getSecurityRecommendations();
  }

  /**
   * Export keys for backup (encrypted)
   */
  async exportKeys(password: string): Promise<string> {
    return await this.secureStorage.exportKeys(password);
  }

  /**
   * Import keys from backup
   */
  async importKeys(encryptedBackup: string, password: string): Promise<boolean> {
    const success = await this.secureStorage.importKeys(encryptedBackup, password);
    if (success) {
      // Reload keys after import
      await this.loadKeysFromStorage();
    }
    return success;
  }
} 