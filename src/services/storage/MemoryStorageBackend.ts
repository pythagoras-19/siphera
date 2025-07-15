import { IStorageBackend } from '../crypto/interfaces';

/**
 * Memory Storage Backend
 * Stores data only in memory - most secure but lost on page refresh
 */
export class MemoryStorageBackend implements IStorageBackend {
  readonly name = 'MemoryStorage';
  readonly securityLevel = 'maximum';
  
  private storage: Map<string, any> = new Map();
  
  /**
   * Store data in memory
   */
  async store(key: string, data: any): Promise<void> {
    this.storage.set(key, data);
  }
  
  /**
   * Retrieve data from memory
   */
  async retrieve(key: string): Promise<any | null> {
    return this.storage.get(key) || null;
  }
  
  /**
   * Remove data from memory
   */
  async remove(key: string): Promise<void> {
    this.storage.delete(key);
  }
  
  /**
   * Clear all data from memory
   */
  async clear(): Promise<void> {
    this.storage.clear();
  }
  
  /**
   * Encrypt data (no-op for memory storage)
   */
  async encrypt(data: any, encryptionKey: string): Promise<any> {
    // Memory storage doesn't need encryption since it's already secure
    return data;
  }
  
  /**
   * Decrypt data (no-op for memory storage)
   */
  async decrypt(encryptedData: any, encryptionKey: string): Promise<any> {
    // Memory storage doesn't need decryption
    return encryptedData;
  }
  
  /**
   * Check if memory storage is available
   */
  async isAvailable(): Promise<boolean> {
    return true; // Memory is always available
  }
  
  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<{
    type: string;
    securityLevel: string;
    persistence: boolean;
    capacity?: number;
  }> {
    return {
      type: 'Memory',
      securityLevel: 'maximum',
      persistence: false, // Lost on page refresh
      capacity: undefined // Unlimited
    };
  }
} 