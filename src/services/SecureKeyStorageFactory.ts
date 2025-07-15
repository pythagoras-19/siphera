import { 
  ICryptoBackend, 
  IStorageBackend, 
  IKeyManagementStrategy, 
  CryptoConfig,
  SecurityAssessment 
} from './crypto/interfaces';
import { WebCryptoBackend } from './crypto/WebCryptoBackend';
import { CryptoJSBackend } from './crypto/CryptoJSBackend';
import { MemoryStorageBackend } from './storage/MemoryStorageBackend';
import { LocalStorageBackend } from './storage/LocalStorageBackend';
import { MemoryFirstStrategy } from './strategies/MemoryFirstStrategy';

/**
 * Secure Key Storage Factory
 * Automatically selects the best available crypto and storage backends
 */
export class SecureKeyStorageFactory {
  private static instance: SecureKeyStorageFactory;
  private config: CryptoConfig | null = null;
  
  private constructor() {}
  
  static getInstance(): SecureKeyStorageFactory {
    if (!SecureKeyStorageFactory.instance) {
      SecureKeyStorageFactory.instance = new SecureKeyStorageFactory();
    }
    return SecureKeyStorageFactory.instance;
  }
  
  /**
   * Detect and configure the best available backends
   */
  async autoConfigure(): Promise<CryptoConfig> {
    const cryptoBackend = await this.detectBestCryptoBackend();
    const storageBackend = await this.detectBestStorageBackend();
    const keyManagementStrategy = await this.createKeyManagementStrategy(storageBackend);
    
    this.config = {
      cryptoBackend,
      storageBackend,
      keyManagementStrategy,
      keyDerivationIterations: 100000,
      encryptionAlgorithm: 'AES-GCM',
      keySize: 256,
      enableBackup: true,
      backupEncryption: true,
      autoKeyRotation: false,
      keyRotationInterval: 30
    };
    
    console.log(`🔧 Auto-configured SecureKeyStorage:`);
    console.log(`   Crypto: ${cryptoBackend.name} v${cryptoBackend.version}`);
    console.log(`   Storage: ${storageBackend.name} (${storageBackend.securityLevel})`);
    console.log(`   Strategy: ${keyManagementStrategy.name}`);
    
    return this.config;
  }
  
  /**
   * Get the current configuration
   */
  getConfig(): CryptoConfig | null {
    return this.config;
  }
  
  /**
   * Detect the best available crypto backend
   */
  private async detectBestCryptoBackend(): Promise<ICryptoBackend> {
    // Try Web Crypto API first
    try {
      const webCrypto = new WebCryptoBackend();
      // Test if it works
      await webCrypto.generateRandomBytes(16);
      console.log('✅ Web Crypto API available');
      return webCrypto;
    } catch (error) {
      console.warn('⚠️ Web Crypto API not available, falling back to CryptoJS');
    }
    
    // Fallback to CryptoJS
    try {
      const cryptoJS = new CryptoJSBackend();
      await cryptoJS.generateRandomBytes(16);
      console.log('✅ CryptoJS backend available');
      return cryptoJS;
    } catch (error) {
      throw new Error('No crypto backend available');
    }
  }
  
  /**
   * Detect the best available storage backend
   */
  private async detectBestStorageBackend(): Promise<IStorageBackend> {
    // Memory storage is always available
    const memoryStorage = new MemoryStorageBackend();
    
    // Check if localStorage is available
    const localStorage = new LocalStorageBackend();
    const localStorageAvailable = await localStorage.isAvailable();
    
    if (localStorageAvailable) {
      console.log('✅ localStorage available');
      return localStorage;
    } else {
      console.log('⚠️ localStorage not available, using memory-only storage');
      return memoryStorage;
    }
  }
  
  /**
   * Create key management strategy based on available storage
   */
  private async createKeyManagementStrategy(storageBackend: IStorageBackend): Promise<IKeyManagementStrategy> {
    const encryptionKey = await this.generateMasterKey();
    return new MemoryFirstStrategy(encryptionKey);
  }
  
  /**
   * Generate a master key for encryption
   */
  private async generateMasterKey(): Promise<string> {
    // In production, this should be derived from user password
    // For now, we'll use a fixed key (NOT SECURE FOR PRODUCTION)
    return 'siphera_master_key_v2';
  }
  
  /**
   * Get security assessment of current configuration
   */
  async getSecurityAssessment(): Promise<SecurityAssessment> {
    if (!this.config) {
      await this.autoConfigure();
    }
    
    const config = this.config!;
    const cryptoAssessment = await this.assessCryptoBackend(config.cryptoBackend);
    const storageAssessment = await this.assessStorageBackend(config.storageBackend);
    const strategyAssessment = await config.keyManagementStrategy.getSecurityAssessment();
    
    // Determine overall security level
    const levels = [
      cryptoAssessment.level,
      storageAssessment.level,
      strategyAssessment.level
    ];
    
    const overallLevel = this.calculateOverallSecurityLevel(levels);
    
    // Combine risks and recommendations
    const allRisks = [
      ...cryptoAssessment.risks,
      ...storageAssessment.risks,
      ...strategyAssessment.risks
    ];
    
    const allRecommendations = [
      ...cryptoAssessment.recommendations,
      ...storageAssessment.recommendations,
      ...strategyAssessment.recommendations
    ];
    
    return {
      overallLevel,
      cryptoBackend: {
        name: config.cryptoBackend.name,
        securityLevel: cryptoAssessment.level,
        recommendations: cryptoAssessment.recommendations
      },
      storageBackend: {
        name: config.storageBackend.name,
        securityLevel: storageAssessment.level,
        recommendations: storageAssessment.recommendations
      },
      keyManagement: {
        name: config.keyManagementStrategy.name,
        securityLevel: strategyAssessment.level,
        recommendations: strategyAssessment.recommendations
      },
      risks: allRisks,
      recommendations: allRecommendations
    };
  }
  
  /**
   * Assess crypto backend security
   */
  private async assessCryptoBackend(cryptoBackend: ICryptoBackend): Promise<{
    level: 'low' | 'medium' | 'high' | 'maximum';
    risks: string[];
    recommendations: string[];
  }> {
    const risks: string[] = [];
    const recommendations: string[] = [];
    
    if (cryptoBackend.name === 'CryptoJS') {
      risks.push('Using CryptoJS instead of Web Crypto API');
      recommendations.push('Upgrade to browser with Web Crypto API support');
      recommendations.push('Consider using libsodium.js for better security');
      return { level: 'medium', risks, recommendations };
    }
    
    if (cryptoBackend.name === 'WebCryptoAPI') {
      recommendations.push('Web Crypto API provides excellent security');
      recommendations.push('Consider implementing key rotation');
      return { level: 'high', risks, recommendations };
    }
    
    return { level: 'low', risks, recommendations };
  }
  
  /**
   * Assess storage backend security
   */
  private async assessStorageBackend(storageBackend: IStorageBackend): Promise<{
    level: 'low' | 'medium' | 'high' | 'maximum';
    risks: string[];
    recommendations: string[];
  }> {
    const risks: string[] = [];
    const recommendations: string[] = [];
    
    if (storageBackend.name === 'LocalStorage') {
      risks.push('localStorage vulnerable to XSS attacks');
      recommendations.push('Consider using IndexedDB with encryption');
      recommendations.push('Implement Content Security Policy');
      return { level: 'medium', risks, recommendations };
    }
    
    if (storageBackend.name === 'MemoryStorage') {
      recommendations.push('Memory-only storage provides maximum security');
      recommendations.push('Keys will be lost on page refresh');
      return { level: 'maximum', risks, recommendations };
    }
    
    return { level: 'low', risks, recommendations };
  }
  
  /**
   * Calculate overall security level
   */
  private calculateOverallSecurityLevel(levels: string[]): 'low' | 'medium' | 'high' | 'maximum' {
    const levelScores = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'maximum': 4
    };
    
    const averageScore = levels.reduce((sum, level) => sum + levelScores[level as keyof typeof levelScores], 0) / levels.length;
    
    if (averageScore >= 3.5) return 'maximum';
    if (averageScore >= 2.5) return 'high';
    if (averageScore >= 1.5) return 'medium';
    return 'low';
  }
  
  /**
   * Create a new SecureKeyStorage instance with current configuration
   */
  async createSecureKeyStorage(): Promise<SecureKeyStorage> {
    if (!this.config) {
      await this.autoConfigure();
    }
    
    return new SecureKeyStorage(this.config!);
  }
}

/**
 * Updated SecureKeyStorage that uses the factory configuration
 */
export class SecureKeyStorage {
  private config: CryptoConfig;
  private memoryStorage: Map<string, any> = new Map();
  
  constructor(config: CryptoConfig) {
    this.config = config;
  }
  
  /**
   * Store keys using the configured strategy
   */
  async storeKeys(keys: any): Promise<void> {
    await this.config.keyManagementStrategy.storeKeys(keys);
  }
  
  /**
   * Retrieve keys using the configured strategy
   */
  async getKeys(): Promise<any | null> {
    return await this.config.keyManagementStrategy.retrieveKeys();
  }
  
  /**
   * Clear keys using the configured strategy
   */
  async clearKeys(): Promise<void> {
    await this.config.keyManagementStrategy.clearKeys();
  }
  
  /**
   * Get storage statistics
   */
  async getStats(): Promise<any> {
    const keys = await this.getKeys();
    const storageInfo = await this.config.storageBackend.getStorageInfo();
    
    return {
      hasUserKeys: !!keys?.userKeyPair,
      contactCount: keys?.contactKeys?.length || 0,
      lastBackup: keys?.lastBackup || null,
      securityLevel: this.config.storageBackend.securityLevel,
      storageType: storageInfo.type,
      cryptoBackend: this.config.cryptoBackend.name,
      strategy: this.config.keyManagementStrategy.name
    };
  }
  
  /**
   * Get security recommendations
   */
  async getSecurityRecommendations(): Promise<string[]> {
    const assessment = await this.getSecurityAssessment();
    return assessment.recommendations;
  }
  
  /**
   * Get security assessment
   */
  async getSecurityAssessment(): Promise<any> {
    const factory = SecureKeyStorageFactory.getInstance();
    return await factory.getSecurityAssessment();
  }
  
  /**
   * Export keys for backup
   */
  async exportKeys(password: string): Promise<string> {
    return await this.config.keyManagementStrategy.backupKeys(password);
  }
  
  /**
   * Import keys from backup
   */
  async importKeys(encryptedBackup: string, password: string): Promise<boolean> {
    return await this.config.keyManagementStrategy.restoreKeys(encryptedBackup, password);
  }
} 