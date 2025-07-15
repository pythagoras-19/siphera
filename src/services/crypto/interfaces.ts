export interface KeyPair {
  publicKey: string;
  privateKey: string;
  fingerprint: string;
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

export interface EncryptedMessage {
  encryptedText: string;
  iv: string;
  timestamp: number;
  hmac: string; // Message authentication code
  algorithm?: string;
  keyId?: string;
}

export interface VerifiedMessage {
  message: string;
  verified: boolean;
  senderVerified: boolean;
}

/**
 * Crypto Backend Interface
 * Defines the contract for different cryptographic implementations
 */
export interface ICryptoBackend {
  readonly name: string;
  readonly version: string;
  
  // Key generation
  generateKeyPair(): Promise<KeyPair>;
  generateSharedSecret(privateKey: string, publicKey: string): Promise<string>;
  
  // Encryption/Decryption
  encryptMessage(message: string, key: string): Promise<EncryptedMessage>;
  decryptMessage(encryptedMessage: EncryptedMessage, key: string): Promise<VerifiedMessage>;
  
  // Key derivation
  deriveKey(password: string, salt: string): Promise<string>;
  
  // Utility functions
  generateRandomBytes(length: number): Promise<string>;
  hash(data: string): Promise<string>;
  
  // Validation
  isValidKeyPair(keyPair: KeyPair): Promise<boolean>;
  isValidPublicKey(publicKey: string): Promise<boolean>;
}

/**
 * Storage Backend Interface
 * Defines the contract for different storage implementations
 */
export interface IStorageBackend {
  readonly name: string;
  readonly securityLevel: 'low' | 'medium' | 'high' | 'maximum';
  
  // Basic operations
  store(key: string, data: any): Promise<void>;
  retrieve(key: string): Promise<any | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  
  // Security operations
  encrypt(data: any, encryptionKey: string): Promise<any>;
  decrypt(encryptedData: any, encryptionKey: string): Promise<any>;
  
  // Availability checks
  isAvailable(): Promise<boolean>;
  getStorageInfo(): Promise<{
    type: string;
    securityLevel: string;
    persistence: boolean;
    capacity?: number;
  }>;
}

/**
 * Key Management Strategy Interface
 * Defines how keys are managed and stored
 */
export interface IKeyManagementStrategy {
  readonly name: string;
  readonly description: string;
  
  // Key lifecycle
  initializeKeys(): Promise<KeyPair>;
  storeKeys(keys: StoredKeys): Promise<void>;
  retrieveKeys(): Promise<StoredKeys | null>;
  clearKeys(): Promise<void>;
  
  // Security operations
  backupKeys(password: string): Promise<string>;
  restoreKeys(backup: string, password: string): Promise<boolean>;
  
  // Key rotation
  rotateKeys(): Promise<KeyPair>;
  
  // Security assessment
  getSecurityAssessment(): Promise<{
    level: 'low' | 'medium' | 'high' | 'maximum';
    risks: string[];
    recommendations: string[];
  }>;
}

/**
 * Configuration for crypto and storage backends
 */
export interface CryptoConfig {
  cryptoBackend: ICryptoBackend;
  storageBackend: IStorageBackend;
  keyManagementStrategy: IKeyManagementStrategy;
  
  // Security settings
  keyDerivationIterations: number;
  encryptionAlgorithm: string;
  keySize: number;
  
  // Storage settings
  enableBackup: boolean;
  backupEncryption: boolean;
  autoKeyRotation: boolean;
  keyRotationInterval: number; // in days
}

/**
 * Security assessment result
 */
export interface SecurityAssessment {
  overallLevel: 'low' | 'medium' | 'high' | 'maximum';
  cryptoBackend: {
    name: string;
    securityLevel: string;
    recommendations: string[];
  };
  storageBackend: {
    name: string;
    securityLevel: string;
    recommendations: string[];
  };
  keyManagement: {
    name: string;
    securityLevel: string;
    recommendations: string[];
  };
  risks: string[];
  recommendations: string[];
} 