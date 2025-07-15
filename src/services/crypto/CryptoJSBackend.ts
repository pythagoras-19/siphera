import CryptoJS from 'crypto-js';
import { ICryptoBackend, KeyPair, EncryptedMessage } from './interfaces';

/**
 * CryptoJS Backend
 * Fallback implementation using CryptoJS library
 * Used when Web Crypto API is not available
 */
export class CryptoJSBackend implements ICryptoBackend {
  readonly name = 'CryptoJS';
  readonly version = '4.2.0';
  
  /**
   * Generate a new key pair (simplified for demo)
   * In production, this should use proper asymmetric encryption
   */
  async generateKeyPair(): Promise<KeyPair> {
    try {
      // Generate random keys (simplified approach)
      const privateKey = CryptoJS.lib.WordArray.random(32).toString();
      const publicKey = CryptoJS.lib.WordArray.random(32).toString();
      
      return { publicKey, privateKey };
    } catch (error) {
      console.error('Failed to generate key pair:', error);
      throw new Error('Key pair generation failed');
    }
  }
  
  /**
   * Generate shared secret (simplified for demo)
   * In production, this should use proper key exchange
   */
  async generateSharedSecret(privateKey: string, publicKey: string): Promise<string> {
    try {
      // Combine keys in a deterministic way (simplified)
      const combined = privateKey + publicKey;
      return CryptoJS.SHA256(combined).toString();
    } catch (error) {
      console.error('Failed to generate shared secret:', error);
      throw new Error('Shared secret generation failed');
    }
  }
  
  /**
   * Encrypt message using AES-256-CBC
   */
  async encryptMessage(message: string, key: string): Promise<EncryptedMessage> {
    try {
      const iv = CryptoJS.lib.WordArray.random(16);
      const encrypted = CryptoJS.AES.encrypt(message, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return {
        encryptedText: encrypted.toString(),
        iv: iv.toString(),
        timestamp: Date.now(),
        algorithm: 'AES-256-CBC'
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Message encryption failed');
    }
  }
  
  /**
   * Decrypt message using AES-256-CBC
   */
  async decryptMessage(encryptedMessage: EncryptedMessage, key: string): Promise<string> {
    try {
      const iv = CryptoJS.enc.Hex.parse(encryptedMessage.iv);
      const decrypted = CryptoJS.AES.decrypt(encryptedMessage.encryptedText, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Message decryption failed');
    }
  }
  
  /**
   * Derive key from password using PBKDF2
   */
  async deriveKey(password: string, salt: string): Promise<string> {
    try {
      const derived = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 100000
      });
      return derived.toString();
    } catch (error) {
      console.error('Key derivation failed:', error);
      throw new Error('Key derivation failed');
    }
  }
  
  /**
   * Generate random bytes
   */
  async generateRandomBytes(length: number): Promise<string> {
    return CryptoJS.lib.WordArray.random(length).toString();
  }
  
  /**
   * Hash data using SHA-256
   */
  async hash(data: string): Promise<string> {
    try {
      return CryptoJS.SHA256(data).toString();
    } catch (error) {
      console.error('Hashing failed:', error);
      throw new Error('Hashing failed');
    }
  }
  
  /**
   * Validate key pair (basic validation)
   */
  async isValidKeyPair(keyPair: KeyPair): Promise<boolean> {
    try {
      // Basic validation - check if keys are not empty and have reasonable length
      return !!(keyPair.privateKey && keyPair.publicKey && 
                keyPair.privateKey.length >= 32 && 
                keyPair.publicKey.length >= 32);
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Validate public key (basic validation)
   */
  async isValidPublicKey(publicKey: string): Promise<boolean> {
    try {
      // Basic validation - check if key is not empty and has reasonable length
      return !!(publicKey && publicKey.length >= 32);
    } catch (error) {
      return false;
    }
  }
} 