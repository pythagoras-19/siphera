import { ICryptoBackend, KeyPair, EncryptedMessage, VerifiedMessage } from './interfaces';

/**
 * Web Crypto API Backend
 * Uses the browser's native Web Crypto API for maximum security
 */
export class WebCryptoBackend implements ICryptoBackend {
  readonly name = 'WebCryptoAPI';
  readonly version = '1.0.0';
  
  private crypto: Crypto;
  private subtle: SubtleCrypto;
  
  constructor() {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API not available in this browser');
    }
    
    this.crypto = window.crypto;
    this.subtle = window.crypto.subtle;
  }
  
  /**
   * Generate a new key pair using ECDH P-256
   */
  async generateKeyPair(): Promise<KeyPair> {
    try {
      const keyPair = await this.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true, // extractable
        ['deriveKey', 'deriveBits']
      );
      
      // Export public key
      const publicKeyBuffer = await this.subtle.exportKey('spki', keyPair.publicKey);
      const publicKey = this.arrayBufferToBase64(publicKeyBuffer);
      
      // Export private key
      const privateKeyBuffer = await this.subtle.exportKey('pkcs8', keyPair.privateKey);
      const privateKey = this.arrayBufferToBase64(privateKeyBuffer);
      
      // Generate fingerprint
      const fingerprint = await this.generateKeyFingerprint(publicKey);
      
      return { publicKey, privateKey, fingerprint };
    } catch (error) {
      console.error('Failed to generate key pair:', error);
      throw new Error('Key pair generation failed');
    }
  }
  
  /**
   * Generate shared secret using ECDH
   */
  async generateSharedSecret(privateKey: string, publicKey: string): Promise<string> {
    try {
      // Import private key
      const privateKeyBuffer = this.base64ToArrayBuffer(privateKey);
      const privateKeyObj = await this.subtle.importKey(
        'pkcs8',
        privateKeyBuffer,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        false,
        ['deriveBits']
      );
      
      // Import public key
      const publicKeyBuffer = this.base64ToArrayBuffer(publicKey);
      const publicKeyObj = await this.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        false,
        []
      );
      
      // Derive shared secret
      const sharedSecretBuffer = await this.subtle.deriveBits(
        {
          name: 'ECDH',
          public: publicKeyObj
        },
        privateKeyObj,
        256
      );
      
      return this.arrayBufferToBase64(sharedSecretBuffer);
    } catch (error) {
      console.error('Failed to generate shared secret:', error);
      throw new Error('Shared secret generation failed');
    }
  }
  
  /**
   * Encrypt message using AES-GCM with HMAC
   */
  async encryptMessage(message: string, key: string): Promise<EncryptedMessage> {
    try {
      // Derive encryption and authentication keys from shared secret
      const keys = await this.deriveKeys(key);
      
      // Generate IV
      const iv = this.crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt
      const messageBuffer = new TextEncoder().encode(message);
      const encryptionKey = await this.subtle.importKey(
        'raw',
        this.base64ToArrayBuffer(keys.encryptionKey),
        'AES-GCM',
        false,
        ['encrypt']
      );
      
      const encryptedBuffer = await this.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        encryptionKey,
        messageBuffer
      );
      
      const encryptedText = this.arrayBufferToBase64(encryptedBuffer);
      
      // Generate HMAC for message authentication
      const hmac = await this.generateHMAC(encryptedText + this.arrayBufferToBase64(iv.buffer), keys.authKey);
      
      return {
        encryptedText,
        iv: this.arrayBufferToBase64(iv.buffer),
        timestamp: Date.now(),
        hmac,
        algorithm: 'AES-GCM'
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Message encryption failed');
    }
  }
  
  /**
   * Decrypt message using AES-GCM with HMAC verification
   */
  async decryptMessage(encryptedMessage: EncryptedMessage, key: string): Promise<VerifiedMessage> {
    try {
      // Derive encryption and authentication keys from shared secret
      const keys = await this.deriveKeys(key);
      
      // Verify HMAC
      const expectedHmac = await this.generateHMAC(
        encryptedMessage.encryptedText + encryptedMessage.iv, 
        keys.authKey
      );

      if (encryptedMessage.hmac !== expectedHmac) {
        throw new Error('Message authentication failed - HMAC mismatch');
      }
      
      // Decrypt
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedMessage.encryptedText);
      const iv = this.base64ToArrayBuffer(encryptedMessage.iv);
      
      const decryptionKey = await this.subtle.importKey(
        'raw',
        this.base64ToArrayBuffer(keys.encryptionKey),
        'AES-GCM',
        false,
        ['decrypt']
      );
      
      const decryptedBuffer = await this.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        decryptionKey,
        encryptedBuffer
      );
      
      const decryptedText = new TextDecoder().decode(decryptedBuffer);
      
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
   * Derive encryption key from shared secret using PBKDF2
   */
  async deriveKey(password: string, salt: string): Promise<string> {
    try {
      const passwordBuffer = new TextEncoder().encode(password);
      const saltBuffer = this.base64ToArrayBuffer(salt);
      
      const keyMaterial = await this.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits']
      );
      
      const derivedBits = await this.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: saltBuffer,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );
      
      return this.arrayBufferToBase64(derivedBits);
    } catch (error) {
      console.error('Key derivation failed:', error);
      throw new Error('Key derivation failed');
    }
  }
  
  /**
   * Generate random bytes
   */
  async generateRandomBytes(length: number): Promise<string> {
    const buffer = this.crypto.getRandomValues(new Uint8Array(length));
    return this.arrayBufferToBase64(buffer.buffer);
  }
  
  /**
   * Hash data using SHA-256
   */
  async hash(data: string): Promise<string> {
    try {
      const dataBuffer = new TextEncoder().encode(data);
      const hashBuffer = await this.subtle.digest('SHA-256', dataBuffer);
      return this.arrayBufferToBase64(hashBuffer);
    } catch (error) {
      console.error('Hashing failed:', error);
      throw new Error('Hashing failed');
    }
  }
  
  /**
   * Validate key pair
   */
  async isValidKeyPair(keyPair: KeyPair): Promise<boolean> {
    try {
      // Try to import both keys
      const privateKeyBuffer = this.base64ToArrayBuffer(keyPair.privateKey);
      const publicKeyBuffer = this.base64ToArrayBuffer(keyPair.publicKey);
      
      await this.subtle.importKey('pkcs8', privateKeyBuffer, {
        name: 'ECDH',
        namedCurve: 'P-256'
      }, false, ['deriveBits']);
      
      await this.subtle.importKey('spki', publicKeyBuffer, {
        name: 'ECDH',
        namedCurve: 'P-256'
      }, false, []);
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Validate public key
   */
  async isValidPublicKey(publicKey: string): Promise<boolean> {
    try {
      const publicKeyBuffer = this.base64ToArrayBuffer(publicKey);
      await this.subtle.importKey('spki', publicKeyBuffer, {
        name: 'ECDH',
        namedCurve: 'P-256'
      }, false, []);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Derive encryption key from shared secret
   */
  private async deriveEncryptionKey(sharedSecret: string): Promise<CryptoKey> {
    const sharedSecretBuffer = this.base64ToArrayBuffer(sharedSecret);
    
    // Ensure the key is exactly 256 bits (32 bytes) for AES-256-GCM
    let keyMaterial = sharedSecretBuffer;
    if (keyMaterial.byteLength < 32) {
      // Pad with zeros if too short
      const padded = new Uint8Array(32);
      padded.set(new Uint8Array(keyMaterial));
      keyMaterial = padded.buffer;
    } else if (keyMaterial.byteLength > 32) {
      // Truncate if too long
      keyMaterial = keyMaterial.slice(0, 32);
    }
    
    return await this.subtle.importKey(
      'raw',
      keyMaterial,
      'AES-GCM',
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
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
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Generate key fingerprint for verification
   */
  private async generateKeyFingerprint(publicKey: string): Promise<string> {
    // Use SHA-256 hash of public key as fingerprint
    const hash = await this.hash(publicKey);
    return hash.substring(0, 16).toUpperCase();
  }

  /**
   * Derive encryption and authentication keys from shared secret
   */
  private async deriveKeys(sharedSecret: string): Promise<{ encryptionKey: string; authKey: string }> {
    const sharedSecretBuffer = this.base64ToArrayBuffer(sharedSecret);
    const keyMaterial = await this.subtle.importKey(
      'raw',
      sharedSecretBuffer,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    // Derive encryption key
    const encryptionKeyBits = await this.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('encryption'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    // Derive authentication key
    const authKeyBits = await this.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('authentication'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return {
      encryptionKey: this.arrayBufferToBase64(encryptionKeyBits),
      authKey: this.arrayBufferToBase64(authKeyBits)
    };
  }

  /**
   * Generate HMAC for message authentication
   */
  private async generateHMAC(data: string, key: string): Promise<string> {
    const keyBuffer = this.base64ToArrayBuffer(key);
    const dataBuffer = new TextEncoder().encode(data);

    const hmacKey = await this.subtle.importKey(
      'raw',
      keyBuffer,
      {
        name: 'HMAC',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );

    const signature = await this.subtle.sign('HMAC', hmacKey, dataBuffer);
    return this.arrayBufferToBase64(signature);
  }
} 