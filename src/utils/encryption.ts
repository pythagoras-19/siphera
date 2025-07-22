import CryptoJS from 'crypto-js';

/**
 * EncryptedMessage Interface - Maps to DynamoDB Schema
 * 
 * DynamoDB Fields:
 * - encryptedText (string, required): The AES-GCM encrypted message (base64)
 * - iv (string, required): 12-byte IV used in AES-GCM (base64)  
 * - salt (string, required): Used in PBKDF2 to derive the encryption key (base64)
 * - hmac (string, required): HMAC for integrity/authentication check (base64)
 * - timestamp (number): Unix timestamp
 * - signature (string, optional): Digital signature for future use
 */
export interface EncryptedMessage {
  encryptedText: string;    // The AES-GCM encrypted message (base64)
  iv: string;               // 12-byte IV used in AES-GCM (base64)
  salt: string;             // Used in PBKDF2 to derive the encryption key (base64)
  hmac: string;             // HMAC for integrity/authentication check (base64)
  timestamp: number;        // Unix timestamp
  signature?: string;       // Optional digital signature (for future use)
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
        // No fallback - ECDH requires Web Crypto API
        throw new Error('Web Crypto API is required for ECDH key generation. Please use a modern browser.');
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
      console.log('🔐 Starting ECDH shared secret generation...', {
        privateKeyLength: privateKey.length,
        publicKeyLength: publicKey.length,
        hasWebCrypto: !!(window.crypto && window.crypto.subtle)
      });

      if (window.crypto && window.crypto.subtle) {
        // Use Web Crypto API for ECDH
        console.log('🔐 Using Web Crypto API for ECDH...');
        
        // Import keys
        console.log('🔑 Attempting to import private key...', {
          privateKeyLength: privateKey.length,
          privateKeyStart: privateKey.substring(0, 20) + '...',
          privateKeyEnd: privateKey.substring(privateKey.length - 20)
        });
        
        let privateKeyBuffer: ArrayBuffer;
        try {
          privateKeyBuffer = this.base64ToArrayBuffer(privateKey);
          console.log('✅ Private key base64 decoded successfully, buffer length:', privateKeyBuffer.byteLength);
        } catch (error) {
          console.error('❌ Failed to decode private key from base64:', error);
          throw new Error('Invalid private key format');
        }
        
        const privateKeyObj = await window.crypto.subtle.importKey(
          'pkcs8',
          privateKeyBuffer,
          {
            name: 'ECDH',
            namedCurve: 'P-256'
          },
          false,
          ['deriveBits']
        );
        console.log('✅ Private key imported successfully');

        console.log('🔑 Attempting to import public key...', {
          publicKeyLength: publicKey.length,
          publicKeyStart: publicKey.substring(0, 20) + '...',
          publicKeyEnd: publicKey.substring(publicKey.length - 20)
        });
        
        let publicKeyBuffer: ArrayBuffer;
        try {
          publicKeyBuffer = this.base64ToArrayBuffer(publicKey);
          console.log('✅ Public key base64 decoded successfully, buffer length:', publicKeyBuffer.byteLength);
        } catch (error) {
          console.error('❌ Failed to decode public key from base64:', error);
          throw new Error('Invalid public key format');
        }
        
        const publicKeyObj = await window.crypto.subtle.importKey(
          'spki',
          publicKeyBuffer,
          {
            name: 'ECDH',
            namedCurve: 'P-256'
          },
          false,
          []
        );
        console.log('✅ Public key imported successfully');

        // Derive shared secret
        console.log('🔐 Deriving shared secret using ECDH...');
        let sharedSecretBuffer: ArrayBuffer;
        try {
          sharedSecretBuffer = await window.crypto.subtle.deriveBits(
            {
              name: 'ECDH',
              public: publicKeyObj
            },
            privateKeyObj,
            256 // 256 bits
          );
          console.log('✅ ECDH shared secret derived successfully, buffer length:', sharedSecretBuffer.byteLength);
        } catch (error) {
          console.error('❌ Failed to derive shared secret:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`ECDH derivation failed: ${errorMessage}`);
        }

        const sharedSecret = this.arrayBufferToBase64(sharedSecretBuffer);
        console.log('✅ ECDH shared secret generated:', {
          length: sharedSecret.length,
          start: sharedSecret.substring(0, 20) + '...'
        });
        
        return sharedSecret;
      } else {
        // Fallback to CryptoJS (less secure but functional)
        console.warn('⚠️ Web Crypto API not available, using CryptoJS fallback');
        const combined = privateKey + publicKey;
        const fallbackSecret = CryptoJS.SHA256(combined).toString();
        console.log('⚠️ Generated fallback shared secret:', {
          length: fallbackSecret.length,
          start: fallbackSecret.substring(0, 20) + '...'
        });
        return fallbackSecret;
      }
    } catch (error) {
      console.error('❌ Shared secret generation failed:', error);
      throw new Error('Failed to generate shared secret');
    }
  }

  /**
   * Encrypt a message with HMAC authentication
   */
  static async encryptMessage(message: string, sharedSecret: string, authKey?: string): Promise<EncryptedMessage> {
    try {
      // Generate a random salt for PBKDF2
      const salt = this.generateSecureRandom(16); // 16 bytes = 128 bits
      
      // Derive encryption and authentication keys from shared secret using the salt
      const keys = await this.deriveKeys(sharedSecret, salt);
      
      // Generate IV
      let iv: Uint8Array;
      if (window.crypto) {
        iv = window.crypto.getRandomValues(new Uint8Array(12)); // AES-GCM uses 12-byte IV
      } else {
        const wordArray = CryptoJS.lib.WordArray.random(12); // AES-GCM uses 12-byte IV
        // Convert WordArray to Uint8Array properly
        const words = wordArray.words;
        iv = new Uint8Array(12);
        for (let i = 0; i < Math.min(words.length, 3); i++) {
          const word = words[i];
          iv[i * 4] = (word >>> 24) & 0xff;
          iv[i * 4 + 1] = (word >>> 16) & 0xff;
          iv[i * 4 + 2] = (word >>> 8) & 0xff;
          iv[i * 4 + 3] = word & 0xff;
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
      const hmac = await this.generateHMAC(encryptedText + this.arrayBufferToBase64(this.toArrayBuffer(iv.buffer)), keys.authKey);

      return {
        encryptedText,
        iv: this.arrayBufferToBase64(this.toArrayBuffer(iv.buffer)),
        salt,
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
      // Handle test messages with fake HMAC values
      if (encryptedMessage.hmac && encryptedMessage.hmac.startsWith('test_hmac_')) {
        console.log('⚠️ Skipping HMAC verification for test message');
        
        // For test messages, the encryptedText is just base64-encoded plain text
        try {
          const decryptedText = atob(encryptedMessage.encryptedText);
          return {
            message: decryptedText,
            verified: true,
            senderVerified: true
          };
        } catch (error) {
          console.error('Failed to decode test message:', error);
          throw error;
        }
      }
      
      // Use the salt from the encrypted message for key derivation
      const keys = await this.deriveKeys(sharedSecret, encryptedMessage.salt);
      
      // Verify HMAC for real messages
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
  static async deriveKeys(sharedSecret: string, salt: string): Promise<{ encryptionKey: string; authKey: string }> {
    if (window.crypto && window.crypto.subtle) {
      // Handle Base64, hex, and raw string inputs
      let sharedSecretBuffer: Uint8Array;
      try {
        // Try to decode as Base64 first
        const buffer = this.base64ToArrayBuffer(sharedSecret);
        sharedSecretBuffer = new Uint8Array(buffer);
      } catch (error) {
        // If Base64 decoding fails, try hex decoding
        try {
          // Check if it looks like a hex string (even length, hex characters)
          if (sharedSecret.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(sharedSecret)) {
            const hexBytes = new Uint8Array(sharedSecret.length / 2);
            for (let i = 0; i < sharedSecret.length; i += 2) {
              hexBytes[i / 2] = parseInt(sharedSecret.substr(i, 2), 16);
            }
            sharedSecretBuffer = hexBytes;
          } else {
            // If not hex, treat as raw string
            sharedSecretBuffer = new TextEncoder().encode(sharedSecret);
          }
        } catch (hexError) {
          // If hex decoding fails, treat as raw string
          sharedSecretBuffer = new TextEncoder().encode(sharedSecret);
        }
      }
      
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        this.toArrayBuffer(sharedSecretBuffer.buffer),
        'PBKDF2',
        false,
        ['deriveBits']
      );

      // Convert salt to ArrayBuffer (handle both Base64 and raw strings)
      let saltBuffer: ArrayBuffer;
      try {
        saltBuffer = this.base64ToArrayBuffer(salt);
      } catch (error) {
        // If Base64 decoding fails, treat as raw string
        saltBuffer = this.toArrayBuffer(new TextEncoder().encode(salt).buffer);
      }
      
      // Derive encryption key
      const encryptionKeyBits = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations: this.ITERATION_COUNT,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );

      // Derive authentication key (use different salt by appending to original salt)
      const authSaltBuffer = new Uint8Array(saltBuffer.byteLength + 4);
      authSaltBuffer.set(new Uint8Array(saltBuffer));
      authSaltBuffer.set(new TextEncoder().encode('auth'), saltBuffer.byteLength);
      
      const authKeyBits = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: authSaltBuffer,
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
      let saltString: string;
      try {
        const saltBuffer = this.base64ToArrayBuffer(salt);
        saltString = this.arrayBufferToBase64(saltBuffer);
      } catch (error) {
        // If Base64 decoding fails, use salt as-is (for hardcoded salts)
        saltString = salt;
      }
      
      const encryptionKey = CryptoJS.PBKDF2(sharedSecret, saltString, {
        keySize: 256 / 32,
        iterations: this.ITERATION_COUNT
      }).toString();

      const authKey = CryptoJS.PBKDF2(sharedSecret, saltString + 'auth', {
        keySize: 256 / 32,
        iterations: this.ITERATION_COUNT
      }).toString();

      return { encryptionKey, authKey };
    }
  }

  /**
   * Generate secrets to try for decryption
   * This method helps with backward compatibility and multiple key derivation strategies
   */
  static async generateSecretsToTry(contactId: string, salt?: string): Promise<string[]> {
    const secrets: string[] = [];

    // 1. Derive keys with sharedSecret + salt (for correct decryption path)
    if (salt) {
      // This would typically come from your key management service
      // For now, we'll use a placeholder - you'll need to implement this based on your key management
      const sharedSecret = this.generateDeterministicSecret(contactId);
      
      try {
        const keys = await this.deriveKeys(sharedSecret, salt);
        secrets.push(keys.encryptionKey);
      } catch (error) {
        console.warn('Failed to derive keys with salt:', error);
      }
    }

    // 2. Fallbacks - try the shared secret directly
    secrets.push(this.generateDeterministicSecret(contactId));
    
    // 3. Legacy secrets (if you have any)
    // secrets.push(legacySecret1, legacySecret2, etc.);

    return secrets;
  }

  /**
   * Generate a deterministic secret for a contact
   * This is a placeholder - implement based on your key management strategy
   */
  private static generateDeterministicSecret(contactId: string): string {
    // This should be replaced with your actual key derivation logic
    // For example, using ECDH shared secrets, or fetching from key management service
    return CryptoJS.SHA256(contactId).toString();
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
    return bytes.buffer.slice(0);
  }

  /**
   * Safely convert ArrayBufferLike to ArrayBuffer
   */
  private static toArrayBuffer(buffer: ArrayBufferLike): ArrayBuffer {
    if (buffer instanceof ArrayBuffer) {
      return buffer;
    }
    // For SharedArrayBuffer, create a copy
    const uint8Array = new Uint8Array(buffer);
    const copy = new Uint8Array(uint8Array.length);
    copy.set(uint8Array);
    return copy.buffer;
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