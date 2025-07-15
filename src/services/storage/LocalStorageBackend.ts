import { IStorageBackend } from '../crypto/interfaces';
import CryptoJS from 'crypto-js';

/**
 * LocalStorage Backend
 * Stores data in localStorage with encryption
 */
export class LocalStorageBackend implements IStorageBackend {
  readonly name = 'LocalStorage';
  readonly securityLevel = 'medium';
  
  /**
   * Store data in localStorage
   */
  async store(key: string, data: any): Promise<void> {
    try {
      const jsonData = JSON.stringify(data);
      localStorage.setItem(key, jsonData);
    } catch (error) {
      console.error('Failed to store data in localStorage:', error);
      throw new Error('Storage failed');
    }
  }
  
  /**
   * Retrieve data from localStorage
   */
  async retrieve(key: string): Promise<any | null> {
    try {
      const data = localStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to retrieve data from localStorage:', error);
      return null;
    }
  }
  
  /**
   * Remove data from localStorage
   */
  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove data from localStorage:', error);
      throw new Error('Removal failed');
    }
  }
  
  /**
   * Clear all data from localStorage
   */
  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      throw new Error('Clear failed');
    }
  }
  
  /**
   * Encrypt data before storage
   */
  async encrypt(data: any, encryptionKey: string): Promise<any> {
    try {
      const jsonData = JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(jsonData, encryptionKey);
      return encrypted.toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }
  
  /**
   * Decrypt data after retrieval
   */
  async decrypt(encryptedData: any, encryptionKey: string): Promise<any> {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
      const jsonData = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(jsonData);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }
  
  /**
   * Check if localStorage is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
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
      type: 'localStorage',
      securityLevel: 'medium',
      persistence: true,
      capacity: 5 * 1024 * 1024 // ~5MB typical limit
    };
  }
} 