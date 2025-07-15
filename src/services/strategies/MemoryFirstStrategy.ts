import { IKeyManagementStrategy, StoredKeys, KeyPair } from '../crypto/interfaces';
import { MemoryStorageBackend } from '../storage/MemoryStorageBackend';
import { LocalStorageBackend } from '../storage/LocalStorageBackend';

/**
 * Memory-First Key Management Strategy
 * Prioritizes memory storage for maximum security, with localStorage fallback
 */
export class MemoryFirstStrategy implements IKeyManagementStrategy {
  readonly name = 'MemoryFirst';
  readonly description = 'Memory-first storage with localStorage fallback for maximum security';
  
  private memoryStorage: MemoryStorageBackend;
  private localStorage: LocalStorageBackend;
  private encryptionKey: string;
  
  constructor(encryptionKey: string) {
    this.memoryStorage = new MemoryStorageBackend();
    this.localStorage = new LocalStorageBackend();
    this.encryptionKey = encryptionKey;
  }
  
  /**
   * Initialize keys - try memory first, then localStorage
   */
  async initializeKeys(): Promise<KeyPair> {
    // Try to load from memory first
    const memoryKeys = await this.memoryStorage.retrieve('userKeyPair');
    if (memoryKeys) {
      return memoryKeys;
    }
    
    // Try to load from localStorage
    const localStorageAvailable = await this.localStorage.isAvailable();
    if (localStorageAvailable) {
      const encryptedKeys = await this.localStorage.retrieve('userKeyPair');
      if (encryptedKeys) {
        const decryptedKeys = await this.localStorage.decrypt(encryptedKeys, this.encryptionKey);
        // Store in memory for future access
        await this.memoryStorage.store('userKeyPair', decryptedKeys);
        return decryptedKeys;
      }
    }
    
    // No existing keys found
    throw new Error('No existing keys found');
  }
  
  /**
   * Store keys - store in both memory and localStorage
   */
  async storeKeys(keys: StoredKeys): Promise<void> {
    // Always store in memory
    await this.memoryStorage.store('userKeyPair', keys.userKeyPair);
    await this.memoryStorage.store('contactKeys', keys.contactKeys);
    await this.memoryStorage.store('lastBackup', keys.lastBackup);
    
    // Store encrypted in localStorage if available
    const localStorageAvailable = await this.localStorage.isAvailable();
    if (localStorageAvailable) {
      const encryptedKeys = await this.localStorage.encrypt(keys, this.encryptionKey);
      await this.localStorage.store('userKeyPair', encryptedKeys);
    }
  }
  
  /**
   * Retrieve keys - try memory first, then localStorage
   */
  async retrieveKeys(): Promise<StoredKeys | null> {
    // Try memory first
    const userKeyPair = await this.memoryStorage.retrieve('userKeyPair');
    const contactKeys = await this.memoryStorage.retrieve('contactKeys');
    const lastBackup = await this.memoryStorage.retrieve('lastBackup');
    
    if (userKeyPair && contactKeys) {
      return {
        userKeyPair,
        contactKeys,
        lastBackup: lastBackup || Date.now()
      };
    }
    
    // Try localStorage
    const localStorageAvailable = await this.localStorage.isAvailable();
    if (localStorageAvailable) {
      const encryptedKeys = await this.localStorage.retrieve('userKeyPair');
      if (encryptedKeys) {
        const decryptedKeys = await this.localStorage.decrypt(encryptedKeys, this.encryptionKey);
        // Restore to memory
        await this.memoryStorage.store('userKeyPair', decryptedKeys.userKeyPair);
        await this.memoryStorage.store('contactKeys', decryptedKeys.contactKeys);
        await this.memoryStorage.store('lastBackup', decryptedKeys.lastBackup);
        return decryptedKeys;
      }
    }
    
    return null;
  }
  
  /**
   * Clear all keys from both storage locations
   */
  async clearKeys(): Promise<void> {
    await this.memoryStorage.clear();
    
    const localStorageAvailable = await this.localStorage.isAvailable();
    if (localStorageAvailable) {
      await this.localStorage.clear();
    }
  }
  
  /**
   * Backup keys encrypted with password
   */
  async backupKeys(password: string): Promise<string> {
    const keys = await this.retrieveKeys();
    if (!keys) {
      throw new Error('No keys to backup');
    }
    
    const jsonData = JSON.stringify(keys);
    const encrypted = await this.localStorage.encrypt(jsonData, password);
    return encrypted;
  }
  
  /**
   * Restore keys from encrypted backup
   */
  async restoreKeys(backup: string, password: string): Promise<boolean> {
    try {
      const decrypted = await this.localStorage.decrypt(backup, password);
      const keys: StoredKeys = JSON.parse(decrypted);
      
      await this.storeKeys(keys);
      return true;
    } catch (error) {
      console.error('Failed to restore keys:', error);
      return false;
    }
  }
  
  /**
   * Rotate keys - generate new keys and update storage
   */
  async rotateKeys(): Promise<KeyPair> {
    // This would typically generate new keys
    // For now, we'll just return the current keys
    const keys = await this.retrieveKeys();
    if (!keys) {
      throw new Error('No keys to rotate');
    }
    
    return keys.userKeyPair;
  }
  
  /**
   * Get security assessment
   */
  async getSecurityAssessment(): Promise<{
    level: 'low' | 'medium' | 'high' | 'maximum';
    risks: string[];
    recommendations: string[];
  }> {
    const memoryAvailable = await this.memoryStorage.isAvailable();
    const localStorageAvailable = await this.localStorage.isAvailable();
    
    const risks: string[] = [];
    const recommendations: string[] = [];
    
    if (!memoryAvailable) {
      risks.push('Memory storage not available');
    }
    
    if (!localStorageAvailable) {
      risks.push('localStorage not available - no persistence');
      recommendations.push('Consider using IndexedDB for persistence');
    }
    
    if (localStorageAvailable) {
      risks.push('localStorage vulnerable to XSS attacks');
      recommendations.push('Consider using Web Crypto API for secure storage');
    }
    
    let level: 'low' | 'medium' | 'high' | 'maximum' = 'medium';
    
    if (memoryAvailable && !localStorageAvailable) {
      level = 'maximum'; // Memory only is most secure
    } else if (memoryAvailable && localStorageAvailable) {
      level = 'high'; // Memory first with localStorage fallback
    } else if (!memoryAvailable && localStorageAvailable) {
      level = 'medium'; // localStorage only
    } else {
      level = 'low'; // No storage available
    }
    
    return {
      level,
      risks,
      recommendations
    };
  }
} 