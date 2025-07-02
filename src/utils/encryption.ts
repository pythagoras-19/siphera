import CryptoJS from 'crypto-js';

export interface EncryptedMessage {
  encryptedText: string;
  iv: string;
  timestamp: number;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export class E2EEncryption {
  private static readonly ALGORITHM = 'AES';
  private static readonly KEY_SIZE = 256;
  private static readonly ITERATION_COUNT = 1000;

  /**
   * Generate a new key pair for E2EE
   */
  static generateKeyPair(): KeyPair {
    // In a real implementation, this would use proper asymmetric encryption
    // For this demo, we'll use a simplified approach with AES
    const privateKey = CryptoJS.lib.WordArray.random(32).toString();
    const publicKey = CryptoJS.lib.WordArray.random(32).toString();
    
    return {
      publicKey,
      privateKey
    };
  }

  /**
   * Encrypt a message using AES-256
   */
  static encryptMessage(message: string, sharedSecret: string): EncryptedMessage {
    try {
      const iv = CryptoJS.lib.WordArray.random(16);
      const encrypted = CryptoJS.AES.encrypt(message, sharedSecret, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return {
        encryptedText: encrypted.toString(),
        iv: iv.toString(),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt a message using AES-256
   */
  static decryptMessage(encryptedMessage: EncryptedMessage, sharedSecret: string): string {
    try {
      const iv = CryptoJS.enc.Hex.parse(encryptedMessage.iv);
      const decrypted = CryptoJS.AES.decrypt(encryptedMessage.encryptedText, sharedSecret, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Generate a shared secret for two users
   */
  static generateSharedSecret(user1Key: string, user2Key: string): string {
    // In a real implementation, this would use proper key exchange (e.g., Diffie-Hellman)
    // For this demo, we'll combine the keys in a deterministic way
    const combined = user1Key + user2Key;
    return CryptoJS.SHA256(combined).toString();
  }

  /**
   * Hash a password for secure storage
   */
  static hashPassword(password: string): string {
    return CryptoJS.SHA256(password).toString();
  }

  /**
   * Generate a secure random string
   */
  static generateSecureRandom(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString();
  }

  /**
   * Verify message integrity
   */
  static verifyMessageIntegrity(encryptedMessage: EncryptedMessage, originalHash: string): boolean {
    const messageHash = CryptoJS.SHA256(
      encryptedMessage.encryptedText + encryptedMessage.iv + encryptedMessage.timestamp
    ).toString();
    return messageHash === originalHash;
  }
} 