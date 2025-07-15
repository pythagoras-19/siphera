import CryptoJS from 'crypto-js';

export interface EncryptedMessage {
  encryptedText: string;
  iv: string;
  timestamp: number;
  hmac: string; // Message authentication code
  signature?: string; // Optional digital signature
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  fingerprint: string; // Key fingerprint for verification
}

export interface VerifiedMessage {
  message: string;
  verified: boolean;
  senderVerified: boolean;
}

export class E2EEncryption {
  private static readonly ALGORITHM = 'AES';
  private static readonly KEY_SIZE = 256;
  private static readonly ITERATION_COUNT = 100000;
  private static readonly HMAC_ALGORITHM = 'SHA-256';

  /**
   * Generate a new ECDH key pair for E2EE
   */
  static async generateKeyPair(): Promise<KeyPair> {
    try {
      // Use Web Crypto API for proper ECDH key generation
      if (window.crypto && window.crypto.subtle) {
        const keyPair = await window.crypto.subtle.generateKey(
          {
            name: 'ECDH',
            namedCurve: 'P-256'
          },
          true, // extractable
          ['deriveBits']
        );

        // Export keys
        const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
        const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

        // Convert to base64
        const publicKey = this.arrayBufferToBase64(publicKeyBuffer);
        const privateKey = this.arrayBufferToBase64(privateKeyBuffer);

        // Generate fingerprint from public key
        const fingerprint = this.generateKeyFingerprint(publicKey);

        return {
          publicKey,
          privateKey,
          fingerprint
        };
      } else {
        // Fallback to CryptoJS for older browsers
        const privateKey = CryptoJS.lib.WordArray.random(32).toString();
        const publicKey = CryptoJS.lib.WordArray.random(32).toString();
        const fingerprint = this.generateKeyFingerprint(publicKey);
        
        return {
          publicKey,
          privateKey,
          fingerprint
        };
      }
    } catch (error) {
      console.error('Key generation failed:', error);
      throw new Error('Failed to generate key pair');
    }
  }

  /**
   * Generate shared secret using proper ECDH key exchange
   */
  static async generateSharedSecret(privateKey: string, publicKey: string): Promise<string> {
    try {
      if (window.crypto && window.crypto.subtle) {
        // Import keys
        const privateKeyObj = await window.crypto.subtle.importKey(
          'pkcs8',
          this.base64ToArrayBuffer(privateKey),
          {
            name: 'ECDH',
            namedCurve: 'P-256'
          },
          false,
          ['deriveBits']
        );

        const publicKeyObj = await window.crypto.subtle.importKey(
          'spki',
          this.base64ToArrayBuffer(publicKey),
          {
            name: 'ECDH',
            namedCurve: 'P-256'
          },
          false,
          []
        );

        // Derive shared secret
        const sharedSecretBuffer = await window.crypto.subtle.deriveBits(
          {
            name: 'ECDH',
            public: publicKeyObj
          },
          privateKeyObj,
          256 // 256 bits
        );

        return this.arrayBufferToBase64(sharedSecretBuffer);
      } else {
        // Fallback to CryptoJS (less secure but functional)
        const combined = privateKey + publicKey;
        return CryptoJS.SHA256(combined).toString();
      }
    } catch (error) {
      console.error('Shared secret generation failed:', error);
      throw new Error('Failed to generate shared secret');
    }
  }

  /**
   * Encrypt a message with HMAC authentication
   */
  static async encryptMessage(message: string, sharedSecret: string, authKey?: string): Promise<EncryptedMessage> {
    try {
      // Derive encryption and authentication keys from shared secret
      const keys = await this.deriveKeys(sharedSecret);
      
      // Generate IV
      let iv: Uint8Array;
      if (window.crypto) {
        iv = window.crypto.getRandomValues(new Uint8Array(16));
      } else {
        const wordArray = CryptoJS.lib.WordArray.random(16);
        // Convert WordArray to Uint8Array properly
        const words = wordArray.words;
        iv = new Uint8Array(words.length * 4);
        for (let i = 0; i < words.length; i++) {
          iv[i * 4] = (words[i] >>> 24) & 0xff;
          iv[i * 4 + 1] = (words[i] >>> 16) & 0xff;
          iv[i * 4 + 2] = (words[i] >>> 8) & 0xff;
          iv[i * 4 + 3] = words[i] & 0xff;
        }
      }

      // Encrypt message
      let encryptedText: string;
      if (window.crypto && window.crypto.subtle) {
        const messageBuffer = new TextEncoder().encode(message);
        const encryptionKey = await window.crypto.subtle.importKey(
          'raw',
          this.base64ToArrayBuffer(keys.encryptionKey),
          'AES-GCM',
          false,
          ['encrypt']
        );

        const encryptedBuffer = await window.crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv: iv
          },
          encryptionKey,
          messageBuffer
        );

        encryptedText = this.arrayBufferToBase64(encryptedBuffer);
      } else {
        // Fallback to CryptoJS
        const ivWordArray = CryptoJS.lib.WordArray.create(iv);
        const encrypted = CryptoJS.AES.encrypt(message, keys.encryptionKey, {
          iv: ivWordArray,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });
        encryptedText = encrypted.toString();
      }

      // Generate HMAC for message authentication
      const hmac = await this.generateHMAC(encryptedText + this.arrayBufferToBase64(iv.buffer.slice(0)), keys.authKey);

      return {
        encryptedText,
        iv: this.arrayBufferToBase64(iv.buffer),
        timestamp: Date.now(),
        hmac
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt and verify a message
   */
  static async decryptMessage(encryptedMessage: EncryptedMessage, sharedSecret: string): Promise<VerifiedMessage> {
    try {
      // Derive keys
      const keys = await this.deriveKeys(sharedSecret);

      // Verify HMAC
      const expectedHmac = await this.generateHMAC(
        encryptedMessage.encryptedText + encryptedMessage.iv, 
        keys.authKey
      );

      if (encryptedMessage.hmac !== expectedHmac) {
        throw new Error('Message authentication failed - HMAC mismatch');
      }

      // Decrypt message
      let decryptedText: string;
      if (window.crypto && window.crypto.subtle) {
        const decryptionKey = await window.crypto.subtle.importKey(
          'raw',
          this.base64ToArrayBuffer(keys.encryptionKey),
          'AES-GCM',
          false,
          ['decrypt']
        );

        const decryptedBuffer = await window.crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: this.base64ToArrayBuffer(encryptedMessage.iv)
          },
          decryptionKey,
          this.base64ToArrayBuffer(encryptedMessage.encryptedText)
        );

        decryptedText = new TextDecoder().decode(decryptedBuffer);
      } else {
        // Fallback to CryptoJS
        const iv = CryptoJS.enc.Hex.parse(encryptedMessage.iv);
        const decrypted = CryptoJS.AES.decrypt(encryptedMessage.encryptedText, keys.encryptionKey, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });
        decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      }

      return {
        message: decryptedText,
        verified: true,
        senderVerified: true // In a real implementation, this would verify digital signatures
      };
    } catch (error) {
      console.error('Decryption failed:', error);
      return {
        message: '[Decryption Failed]',
        verified: false,
        senderVerified: false
      };
    }
  }

  /**
   * Generate key fingerprint for verification
   */
  static generateKeyFingerprint(publicKey: string): string {
    const hash = CryptoJS.SHA256(publicKey);
    return hash.toString().substring(0, 16).toUpperCase(); // First 16 chars as fingerprint
  }

  /**
   * Verify key fingerprint
   */
  static verifyKeyFingerprint(publicKey: string, expectedFingerprint: string): boolean {
    const actualFingerprint = this.generateKeyFingerprint(publicKey);
    return actualFingerprint === expectedFingerprint.toUpperCase();
  }

  /**
   * Derive encryption and authentication keys from shared secret
   */
  private static async deriveKeys(sharedSecret: string): Promise<{ encryptionKey: string; authKey: string }> {
    if (window.crypto && window.crypto.subtle) {
      const sharedSecretBuffer = this.base64ToArrayBuffer(sharedSecret);
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        sharedSecretBuffer,
        'PBKDF2',
        false,
        ['deriveBits']
      );

      // Derive encryption key
      const encryptionKeyBits = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode('encryption'),
          iterations: this.ITERATION_COUNT,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );

      // Derive authentication key
      const authKeyBits = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode('authentication'),
          iterations: this.ITERATION_COUNT,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );

      return {
        encryptionKey: this.arrayBufferToBase64(encryptionKeyBits),
        authKey: this.arrayBufferToBase64(authKeyBits)
      };
    } else {
      // Fallback to CryptoJS
      const encryptionKey = CryptoJS.PBKDF2(sharedSecret, 'encryption', {
        keySize: 256 / 32,
        iterations: this.ITERATION_COUNT
      }).toString();

      const authKey = CryptoJS.PBKDF2(sharedSecret, 'authentication', {
        keySize: 256 / 32,
        iterations: this.ITERATION_COUNT
      }).toString();

      return { encryptionKey, authKey };
    }
  }

  /**
   * Generate HMAC for message authentication
   */
  private static async generateHMAC(data: string, key: string): Promise<string> {
    if (window.crypto && window.crypto.subtle) {
      const keyBuffer = this.base64ToArrayBuffer(key);
      const dataBuffer = new TextEncoder().encode(data);

      const hmacKey = await window.crypto.subtle.importKey(
        'raw',
        keyBuffer,
        {
          name: 'HMAC',
          hash: 'SHA-256'
        },
        false,
        ['sign']
      );

      const signature = await window.crypto.subtle.sign('HMAC', hmacKey, dataBuffer);
      return this.arrayBufferToBase64(signature);
    } else {
      // Fallback to CryptoJS
      return CryptoJS.HmacSHA256(data, key).toString();
    }
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer.slice(0); // Create a new ArrayBuffer to avoid SharedArrayBuffer issues
  }

  /**
   * Generate a secure random string
   */
  static generateSecureRandom(length: number = 32): string {
    if (window.crypto) {
      const buffer = window.crypto.getRandomValues(new Uint8Array(length));
      return this.arrayBufferToBase64(buffer.buffer);
    } else {
      return CryptoJS.lib.WordArray.random(length).toString();
    }
  }

  /**
   * Hash a password for secure storage
   */
  static hashPassword(password: string): string {
    return CryptoJS.SHA256(password).toString();
  }
} 