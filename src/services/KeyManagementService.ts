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
      
      // Set up global utilities after instance is created (to avoid recursion)
      if (typeof window !== 'undefined') {
        KeyManagementService.setupGlobalUtilities();
      }
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
   * Hot swap a contact's public key in memory (without persistence)
   * Useful for testing and immediate key updates
   */
  setContactKey(userId: string, publicKey: string): void {
    const contactKey: ContactKey = {
      userId,
      publicKey,
      lastUpdated: Date.now()
    };

    this.contactKeys.set(userId, contactKey);
    console.log(`🔑 Hot-swapped contact key for ${userId}:`, {
      keyLength: publicKey.length,
      keyPreview: publicKey.substring(0, 20) + '...'
    });
  }

  /**
   * Update contact key with both persistence and hot swap
   * This is the recommended method for updating contact keys
   */
  async updateContactKey(userId: string, publicKey: string): Promise<void> {
    // Hot swap in memory immediately
    this.setContactKey(userId, publicKey);
    
    // Also persist to localStorage for future sessions
    await this.storeContactKey(userId, publicKey);
    
    console.log(`✅ Contact key updated for ${userId} (memory + persistence)`);
  }

  /**
   * Global utility function for browser console access
   * Usage: window.updateContactKey('user@email.com', 'publicKeyString')
   */
  static setupGlobalUtilities(): void {
    if (typeof window !== 'undefined') {
      // Expose the service instance globally
      (window as any).KeyManagementService = KeyManagementService;
      (window as any).keyManagement = KeyManagementService.getInstance();
      
      (window as any).updateContactKey = async (userId: string, publicKey: string) => {
        const service = KeyManagementService.getInstance();
        await service.updateContactKey(userId, publicKey);
      };
      
      (window as any).getContactKey = (userId: string) => {
        const service = KeyManagementService.getInstance();
        return service.getContactPublicKey(userId);
      };
      
      (window as any).testECDH = async (userId: string) => {
        const service = KeyManagementService.getInstance();
        const sharedSecret = await service.generateSharedSecret(userId);
        console.log(`ECDH test for ${userId}:`, sharedSecret ? 'SUCCESS' : 'FAILED');
        return sharedSecret;
      };
      
      (window as any).regenerateUserKeys = async () => {
        const service = KeyManagementService.getInstance();
        const newKeys = await service.regenerateUserKeys();
        console.log('✅ User keys regenerated:', newKeys);
        return newKeys;
      };
      
      (window as any).testEncryption = async (userId: string, testMessage?: string) => {
        const service = KeyManagementService.getInstance();
        const message = testMessage || `Test message ${Date.now()}`;
        
        console.log('🧪 Testing full encryption/decryption flow...');
        console.log(`📝 Test message: "${message}"`);
        
        try {
          // Step 1: Generate shared secret
          const sharedSecret = await service.generateSharedSecret(userId);
          if (!sharedSecret) {
            console.error('❌ Failed to generate shared secret');
            return false;
          }
          console.log('✅ Shared secret generated:', sharedSecret.substring(0, 20) + '...');
          
          // Step 2: Encrypt message
          const { E2EEncryption } = await import('../utils/encryption');
          const encrypted = await E2EEncryption.encryptMessage(message, sharedSecret);
          console.log('✅ Message encrypted:', {
            encryptedText: encrypted.encryptedText.substring(0, 50) + '...',
            iv: encrypted.iv.substring(0, 20) + '...',
            salt: encrypted.salt.substring(0, 20) + '...',
            hmac: encrypted.hmac.substring(0, 20) + '...'
          });
          
          // Step 3: Decrypt message
          const decrypted = await E2EEncryption.decryptMessage(encrypted, sharedSecret);
          console.log('✅ Message decrypted:', decrypted);
          
          // Step 4: Verify
          const success = decrypted.verified && decrypted.message === message;
          console.log(success ? '🎉 ENCRYPTION/DECRYPTION TEST PASSED!' : '❌ TEST FAILED');
          console.log(`Original: "${message}"`);
          console.log(`Decrypted: "${decrypted.message}"`);
          console.log(`Verified: ${decrypted.verified}`);
          
          return success;
        } catch (error) {
          console.error('❌ Encryption test failed:', error);
          return false;
        }
      };
      
      console.log('🔧 Global utilities available:');
      console.log('  KeyManagementService - The service class');
      console.log('  keyManagement - Service instance');
      console.log('  updateContactKey(userId, publicKey) - Update contact key');
      console.log('  getContactKey(userId) - Get contact key');
      console.log('  testECDH(userId) - Test ECDH with contact');
      console.log('  testEncryption(userId, message?) - Test full encryption/decryption');
      console.log('  regenerateUserKeys() - Regenerate user keys');
    }
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
    
    // Clear existing keys from memory
    this.userKeyPair = null;
    this.contactKeys.clear();
    
    // Clear stored keys from localStorage
    await this.secureStorage.clearKeys();
    
    // Force generate new keys (bypass the existing key check)
    console.log('🔑 Generating new ECDH key pair...');
    const newKeyPair = await E2EEncryption.generateKeyPair();
    
    // Store the new keys
    this.userKeyPair = newKeyPair;
    this.isInitialized = true;
    
    const keysToStore: StoredKeys = {
      userKeyPair: newKeyPair as KeyPair,
      contactKeys: [],
      lastBackup: Date.now()
    };
    
    await this.secureStorage.storeKeys(keysToStore);
    
    console.log('✅ User keys regenerated successfully');
    console.log('🔑 New key lengths:', {
      publicKeyLength: newKeyPair.publicKey.length,
      privateKeyLength: newKeyPair.privateKey.length
    });
    
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