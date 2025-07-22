import { E2EEncryption, KeyPair } from '../utils/encryption';
import { SecureKeyStorageFactory, SecureKeyStorage } from './SecureKeyStorageFactory';
import { ContactKey, StoredKeys } from './crypto/interfaces';

export class KeyManagementService {
  private static instance: KeyManagementService;
  private secureStorage!: SecureKeyStorage;
  private userKeyPair: KeyPair | null = null;
  private contactKeys: Map<string, ContactKey> = new Map();
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    this.initializationPromise = this.initializeSecureStorage();
  }

  static getInstance(): KeyManagementService {
    if (!KeyManagementService.instance) {
      KeyManagementService.instance = new KeyManagementService();
    }
    return KeyManagementService.instance;
  }

  /**
   * Initialize secure storage
   */
  private async initializeSecureStorage(): Promise<void> {
    try {
      const factory = SecureKeyStorageFactory.getInstance();
      await factory.autoConfigure();
      this.secureStorage = await factory.createSecureKeyStorage();
      console.log('🔐 SecureKeyStorage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SecureKeyStorage:', error);
      throw error;
    }
  }

  /**
   * Ensure secure storage is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.secureStorage && this.initializationPromise) {
      await this.initializationPromise;
    }
    if (!this.secureStorage) {
      throw new Error('SecureKeyStorage failed to initialize');
    }
  }

  /**
   * Initialize or load user's key pair
   */
  async initializeUserKeys(): Promise<KeyPair> {
    if (this.userKeyPair) {
      return this.userKeyPair;
    }

    // Ensure secure storage is ready
    await this.ensureInitialized();

    try {
      // Try to load existing keys
      const storedKeys = await this.secureStorage.getKeys();
      if (storedKeys?.userKeyPair) {
        this.userKeyPair = storedKeys.userKeyPair as KeyPair;
        this.contactKeys = new Map(storedKeys.contactKeys.map((key: ContactKey) => [key.userId, key]));
        this.isInitialized = true;
        console.log('🔑 Loaded existing user keys');
        return this.userKeyPair;
      }
    } catch (error) {
      console.log('No existing keys found, generating new ones...');
    }

    // Generate new keys
    const newKeyPair = await E2EEncryption.generateKeyPair();
    this.userKeyPair = newKeyPair;
    this.isInitialized = true;

    // Store the new keys
    const keysToStore: StoredKeys = {
      userKeyPair: newKeyPair as KeyPair,
      contactKeys: [],
      lastBackup: Date.now()
    };

    await this.secureStorage.storeKeys(keysToStore);
    console.log('🔑 Generated and stored new user keys');

    return newKeyPair;
  }

  /**
   * Get user's public key
   */
  getUserPublicKey(): string | null {
    return this.userKeyPair?.publicKey || null;
  }

  /**
   * Get user's private key
   */
  getUserPrivateKey(): string | null {
    return this.userKeyPair?.privateKey || null;
  }

  /**
   * Store a contact's public key
   */
  async storeContactKey(userId: string, publicKey: string): Promise<void> {
    await this.ensureInitialized();
    
    const contactKey: ContactKey = {
      userId,
      publicKey,
      lastUpdated: Date.now()
    };

    this.contactKeys.set(userId, contactKey);

    // Update stored keys
    const storedKeys = await this.secureStorage.getKeys();
    if (storedKeys) {
      storedKeys.contactKeys = Array.from(this.contactKeys.values());
      await this.secureStorage.storeKeys(storedKeys);
    }

    console.log(`🔑 Stored public key for contact: ${userId}`);
  }

  /**
   * Get a contact's public key
   */
  getContactPublicKey(userId: string): string | null {
    return this.contactKeys.get(userId)?.publicKey || null;
  }

  /**
   * Generate shared secret with a contact
   */
  async generateSharedSecret(contactUserId: string): Promise<string | null> {
    const privateKey = this.getUserPrivateKey();
    const publicKey = this.getContactPublicKey(contactUserId);

    if (!privateKey || !publicKey) {
      console.warn(`Missing keys for contact: ${contactUserId}`, {
        hasPrivateKey: !!privateKey,
        hasPublicKey: !!publicKey,
        privateKeyLength: privateKey?.length || 0,
        publicKeyLength: publicKey?.length || 0
      });
      return null;
    }

    try {
      console.log(`🔐 Generating ECDH shared secret for ${contactUserId}:`, {
        privateKeyLength: privateKey.length,
        publicKeyLength: publicKey.length,
        privateKeyStart: privateKey.substring(0, 20) + '...',
        publicKeyStart: publicKey.substring(0, 20) + '...'
      });
      
      const sharedSecret = await E2EEncryption.generateSharedSecret(privateKey, publicKey);
      console.log(`✅ Generated ECDH shared secret for ${contactUserId}:`, {
        sharedSecretLength: sharedSecret.length,
        sharedSecretStart: sharedSecret.substring(0, 20) + '...'
      });
      return sharedSecret;
    } catch (error) {
      console.error(`❌ Failed to generate ECDH shared secret with ${contactUserId}:`, error);
      return null;
    }
  }

  /**
   * Get all contact keys
   */
  getAllContactKeys(): ContactKey[] {
    return Array.from(this.contactKeys.values());
  }

  /**
   * Remove a contact's key
   */
  async removeContactKey(userId: string): Promise<void> {
    await this.ensureInitialized();
    
    this.contactKeys.delete(userId);

    // Update stored keys
    const storedKeys = await this.secureStorage.getKeys();
    if (storedKeys) {
      storedKeys.contactKeys = Array.from(this.contactKeys.values());
      await this.secureStorage.storeKeys(storedKeys);
    }

    console.log(`🗑️ Removed key for contact: ${userId}`);
  }

  /**
   * Clear all keys
   */
  async clearAllKeys(): Promise<void> {
    await this.ensureInitialized();
    
    await this.secureStorage.clearKeys();
    this.userKeyPair = null;
    this.contactKeys.clear();
    this.isInitialized = false;
    console.log('🗑️ Cleared all keys');
  }

  /**
   * Regenerate user keys (useful for fixing corrupted keys)
   */
  async regenerateUserKeys(): Promise<KeyPair> {
    await this.ensureInitialized();
    
    console.log('🔄 Regenerating user keys...');
    
    // Clear existing keys
    this.userKeyPair = null;
    this.contactKeys.clear();
    
    // Generate new keys
    const newKeyPair = await this.initializeUserKeys();
    
    console.log('✅ User keys regenerated successfully');
    return newKeyPair;
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<any> {
    await this.ensureInitialized();
    
    const storageStats = await this.secureStorage.getStats();
    return {
      ...storageStats,
      isInitialized: this.isInitialized,
      hasUserKeys: !!this.userKeyPair,
      contactCount: this.contactKeys.size,
      userKeyPair: this.userKeyPair ? {
        publicKey: this.userKeyPair.publicKey.substring(0, 16) + '...',
        privateKey: this.userKeyPair.privateKey.substring(0, 16) + '...'
      } : null
    };
  }

  /**
   * Get security recommendations
   */
  async getSecurityRecommendations(): Promise<string[]> {
    await this.ensureInitialized();
    return await this.secureStorage.getSecurityRecommendations();
  }

  /**
   * Get security assessment
   */
  async getSecurityAssessment(): Promise<any> {
    await this.ensureInitialized();
    return await this.secureStorage.getSecurityAssessment();
  }

  /**
   * Export keys for backup
   */
  async exportKeys(password: string): Promise<string> {
    await this.ensureInitialized();
    return await this.secureStorage.exportKeys(password);
  }

  /**
   * Import keys from backup
   */
  async importKeys(encryptedBackup: string, password: string): Promise<boolean> {
    await this.ensureInitialized();
    
    const success = await this.secureStorage.importKeys(encryptedBackup, password);
    if (success) {
      // Reload keys after import
      const storedKeys = await this.secureStorage.getKeys();
      if (storedKeys) {
        this.userKeyPair = storedKeys.userKeyPair;
        this.contactKeys = new Map(storedKeys.contactKeys.map((key: ContactKey) => [key.userId, key]));
        this.isInitialized = true;
      }
    }
    return success;
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
} 