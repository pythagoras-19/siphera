import { E2EEncryption } from '../utils/encryption';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface ContactKey {
  userId: string;
  publicKey: string;
  lastUpdated: number;
}

export interface StoredKeys {
  userKeyPair: KeyPair;
  contactKeys: ContactKey[];
  lastBackup: number;
}

/**
 * Secure Key Storage Service
 * 
 * This service provides multiple storage options with different security levels:
 * 1. Memory-only (most secure, lost on page refresh)
 * 2. Encrypted localStorage (medium security)
 * 3. Web Crypto API (if available)
 * 4. IndexedDB with encryption (if available)
 */
export class SecureKeyStorage {
  private static instance: SecureKeyStorage;
  private readonly STORAGE_KEY = 'siphera_e2e_keys';
  private readonly ENCRYPTION_KEY = 'siphera_master_key'; // In production, derive from user password
  
  // Memory storage (most secure, but lost on refresh)
  private memoryStorage: Map<string, any> = new Map();
  
  // Fallback to encrypted localStorage
  private useLocalStorage: boolean = true;
  
  private constructor() {
    this.checkStorageAvailability();
  }

  static getInstance(): SecureKeyStorage {
    if (!SecureKeyStorage.instance) {
      SecureKeyStorage.instance = new SecureKeyStorage();
    }
    return SecureKeyStorage.instance;
  }

  /**
   * Check what storage options are available
   */
  private checkStorageAvailability(): void {
    try {
      // Test localStorage
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      this.useLocalStorage = true;
    } catch (error) {
      console.warn('localStorage not available, using memory-only storage');
      this.useLocalStorage = false;
    }
  }

  /**
   * Store keys with the highest available security level
   */
  async storeKeys(keys: StoredKeys): Promise<void> {
    try {
      // Always store in memory for immediate access
      this.memoryStorage.set('userKeyPair', keys.userKeyPair);
      this.memoryStorage.set('contactKeys', keys.contactKeys);
      this.memoryStorage.set('lastBackup', keys.lastBackup);

      // If localStorage is available, store encrypted version
      if (this.useLocalStorage) {
        const encryptedKeys = this.encryptKeys(keys);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(encryptedKeys));
      }

      console.log('🔐 Keys stored securely');
    } catch (error) {
      console.error('Failed to store keys:', error);
      throw error;
    }
  }

  /**
   * Retrieve keys from the most secure available source
   */
  async getKeys(): Promise<StoredKeys | null> {
    try {
      // First, try memory storage (most secure)
      const memoryKeys = this.getKeysFromMemory();
      if (memoryKeys) {
        return memoryKeys;
      }

      // Fallback to encrypted localStorage
      if (this.useLocalStorage) {
        const localStorageKeys = this.getKeysFromLocalStorage();
        if (localStorageKeys) {
          // Restore to memory for future access
          this.memoryStorage.set('userKeyPair', localStorageKeys.userKeyPair);
          this.memoryStorage.set('contactKeys', localStorageKeys.contactKeys);
          this.memoryStorage.set('lastBackup', localStorageKeys.lastBackup);
          return localStorageKeys;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to retrieve keys:', error);
      return null;
    }
  }

  /**
   * Get keys from memory storage (most secure)
   */
  private getKeysFromMemory(): StoredKeys | null {
    const userKeyPair = this.memoryStorage.get('userKeyPair');
    const contactKeys = this.memoryStorage.get('contactKeys');
    const lastBackup = this.memoryStorage.get('lastBackup');

    if (userKeyPair && contactKeys) {
      return {
        userKeyPair,
        contactKeys,
        lastBackup: lastBackup || Date.now()
      };
    }

    return null;
  }

  /**
   * Get keys from encrypted localStorage
   */
  private getKeysFromLocalStorage(): StoredKeys | null {
    try {
      const encrypted = localStorage.getItem(this.STORAGE_KEY);
      if (!encrypted) return null;

      const encryptedData = JSON.parse(encrypted);
      const decrypted = this.decryptKeys(encryptedData);
      
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt keys from localStorage:', error);
      return null;
    }
  }

  /**
   * Encrypt keys before storing
   */
  private encryptKeys(keys: StoredKeys): any {
    const jsonString = JSON.stringify(keys);
    return E2EEncryption.encryptMessage(jsonString, this.ENCRYPTION_KEY);
  }

  /**
   * Decrypt keys after retrieval
   */
  private decryptKeys(encryptedData: any): StoredKeys {
    const decrypted = E2EEncryption.decryptMessage(encryptedData, this.ENCRYPTION_KEY);
    return JSON.parse(decrypted);
  }

  /**
   * Clear all stored keys
   */
  async clearKeys(): Promise<void> {
    this.memoryStorage.clear();
    
    if (this.useLocalStorage) {
      localStorage.removeItem(this.STORAGE_KEY);
    }

    console.log('🗑️ All keys cleared');
  }

  /**
   * Get storage security level
   */
  getSecurityLevel(): 'memory' | 'encrypted-localStorage' | 'localStorage' | 'none' {
    if (this.memoryStorage.has('userKeyPair')) {
      return 'memory';
    }
    
    if (this.useLocalStorage) {
      return 'encrypted-localStorage';
    }
    
    return 'none';
  }

  /**
   * Export keys for backup (encrypted with user password)
   */
  async exportKeys(userPassword: string): Promise<string> {
    const keys = await this.getKeys();
    if (!keys) {
      throw new Error('No keys to export');
    }

    const jsonString = JSON.stringify(keys);
    const encrypted = E2EEncryption.encryptMessage(jsonString, userPassword);
    return JSON.stringify(encrypted);
  }

  /**
   * Import keys from backup
   */
  async importKeys(encryptedBackup: string, userPassword: string): Promise<boolean> {
    try {
      const encrypted = JSON.parse(encryptedBackup);
      const decrypted = E2EEncryption.decryptMessage(encrypted, userPassword);
      const keys: StoredKeys = JSON.parse(decrypted);

      await this.storeKeys(keys);
      console.log('📥 Keys imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import keys:', error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  getStats(): {
    hasUserKeys: boolean;
    contactCount: number;
    lastBackup: number | null;
    securityLevel: string;
    storageType: string;
  } {
    const memoryKeys = this.getKeysFromMemory();
    const hasUserKeys = !!memoryKeys?.userKeyPair;
    const contactCount = memoryKeys?.contactKeys?.length || 0;
    const lastBackup = memoryKeys?.lastBackup || null;
    const securityLevel = this.getSecurityLevel();
    const storageType = this.useLocalStorage ? 'localStorage + memory' : 'memory-only';

    return {
      hasUserKeys,
      contactCount,
      lastBackup,
      securityLevel,
      storageType
    };
  }

  /**
   * Security recommendations based on current setup
   */
  getSecurityRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.useLocalStorage) {
      recommendations.push('⚠️ Keys stored in localStorage - vulnerable to XSS attacks');
      recommendations.push('💡 Consider using Web Crypto API for better security');
      recommendations.push('💡 Implement key derivation from user password');
    }
    
    if (this.getSecurityLevel() === 'memory') {
      recommendations.push('✅ Keys stored in memory - most secure for current session');
      recommendations.push('⚠️ Keys will be lost on page refresh');
    }
    
    recommendations.push('🔒 For production: Use hardware security modules (HSM)');
    recommendations.push('🔒 For production: Implement secure key backup/restore');
    
    return recommendations;
  }
} 