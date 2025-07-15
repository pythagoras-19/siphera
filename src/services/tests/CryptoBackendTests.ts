import { WebCryptoBackend } from '../crypto/WebCryptoBackend';
import { CryptoJSBackend } from '../crypto/CryptoJSBackend';
import { SecureKeyStorageFactory } from '../SecureKeyStorageFactory';

/**
 * Test suite for crypto backends
 */
export class CryptoBackendTests {
  
  /**
   * Run all tests
   */
  static async runAllTests(): Promise<{
    passed: number;
    failed: number;
    results: Array<{ test: string; passed: boolean; error?: string }>;
  }> {
    const results: Array<{ test: string; passed: boolean; error?: string }> = [];
    
    console.log('🧪 Running Crypto Backend Tests...\n');
    
    // Test Web Crypto API Backend
    if (await this.testWebCryptoAvailable()) {
      results.push(...await this.testWebCryptoBackend());
    } else {
      console.log('⚠️ Web Crypto API not available, skipping tests');
    }
    
    // Test CryptoJS Backend
    results.push(...await this.testCryptoJSBackend());
    
    // Test Factory
    results.push(...await this.testSecureKeyStorageFactory());
    
    // Test Integration
    results.push(...await this.testIntegration());
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    
    return { passed, failed, results };
  }
  
  /**
   * Check if Web Crypto API is available
   */
  private static async testWebCryptoAvailable(): Promise<boolean> {
    try {
      return !!(window.crypto && window.crypto.subtle);
    } catch {
      return false;
    }
  }
  
  /**
   * Test Web Crypto API Backend
   */
  private static async testWebCryptoBackend(): Promise<Array<{ test: string; passed: boolean; error?: string }>> {
    const results: Array<{ test: string; passed: boolean; error?: string }> = [];
    
    try {
      const backend = new WebCryptoBackend();
      
      // Test key generation
      try {
        const keyPair = await backend.generateKeyPair();
        const isValid = await backend.isValidKeyPair(keyPair);
        results.push({
          test: 'WebCrypto: Key pair generation',
          passed: isValid
        });
      } catch (error) {
        results.push({
          test: 'WebCrypto: Key pair generation',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Test shared secret generation
      try {
        const keyPair1 = await backend.generateKeyPair();
        const keyPair2 = await backend.generateKeyPair();
        const sharedSecret = await backend.generateSharedSecret(keyPair1.privateKey, keyPair2.publicKey);
        results.push({
          test: 'WebCrypto: Shared secret generation',
          passed: !!sharedSecret && sharedSecret.length > 0
        });
      } catch (error) {
        results.push({
          test: 'WebCrypto: Shared secret generation',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Test encryption/decryption with HMAC
      try {
        const keyPair1 = await backend.generateKeyPair();
        const keyPair2 = await backend.generateKeyPair();
        const sharedSecret = await backend.generateSharedSecret(keyPair1.privateKey, keyPair2.publicKey);
        const testMessage = 'Hello, World!';
        const encrypted = await backend.encryptMessage(testMessage, sharedSecret);
        const verifiedMessage = await backend.decryptMessage(encrypted, sharedSecret);
        results.push({
          test: 'WebCrypto: Encryption/Decryption with HMAC',
          passed: verifiedMessage.verified && verifiedMessage.message === testMessage
        });
      } catch (error) {
        results.push({
          test: 'WebCrypto: Encryption/Decryption with HMAC',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Test key validation
      try {
        const keyPair = await backend.generateKeyPair();
        const isValid = await backend.isValidKeyPair(keyPair);
        const isValidPublic = await backend.isValidPublicKey(keyPair.publicKey);
        results.push({
          test: 'WebCrypto: Key validation',
          passed: isValid && isValidPublic
        });
      } catch (error) {
        results.push({
          test: 'WebCrypto: Key validation',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
    } catch (error) {
      results.push({
        test: 'WebCrypto: Backend initialization',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return results;
  }
  
  /**
   * Test CryptoJS Backend
   */
  private static async testCryptoJSBackend(): Promise<Array<{ test: string; passed: boolean; error?: string }>> {
    const results: Array<{ test: string; passed: boolean; error?: string }> = [];
    
    try {
      const backend = new CryptoJSBackend();
      
      // Test key generation
      try {
        const keyPair = await backend.generateKeyPair();
        const isValid = await backend.isValidKeyPair(keyPair);
        results.push({
          test: 'CryptoJS: Key pair generation',
          passed: isValid
        });
      } catch (error) {
        results.push({
          test: 'CryptoJS: Key pair generation',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Test shared secret generation
      try {
        const keyPair1 = await backend.generateKeyPair();
        const keyPair2 = await backend.generateKeyPair();
        const sharedSecret = await backend.generateSharedSecret(keyPair1.privateKey, keyPair2.publicKey);
        results.push({
          test: 'CryptoJS: Shared secret generation',
          passed: !!sharedSecret && sharedSecret.length > 0
        });
      } catch (error) {
        results.push({
          test: 'CryptoJS: Shared secret generation',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Test encryption/decryption with HMAC
      try {
        const keyPair1 = await backend.generateKeyPair();
        const keyPair2 = await backend.generateKeyPair();
        const sharedSecret = await backend.generateSharedSecret(keyPair1.privateKey, keyPair2.publicKey);
        const testMessage = 'Hello, World!';
        const encrypted = await backend.encryptMessage(testMessage, sharedSecret);
        const verifiedMessage = await backend.decryptMessage(encrypted, sharedSecret);
        results.push({
          test: 'CryptoJS: Encryption/Decryption with HMAC',
          passed: verifiedMessage.verified && verifiedMessage.message === testMessage
        });
      } catch (error) {
        results.push({
          test: 'CryptoJS: Encryption/Decryption with HMAC',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Test key validation
      try {
        const keyPair = await backend.generateKeyPair();
        const isValid = await backend.isValidKeyPair(keyPair);
        const isValidPublic = await backend.isValidPublicKey(keyPair.publicKey);
        results.push({
          test: 'CryptoJS: Key validation',
          passed: isValid && isValidPublic
        });
      } catch (error) {
        results.push({
          test: 'CryptoJS: Key validation',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
    } catch (error) {
      results.push({
        test: 'CryptoJS: Backend initialization',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return results;
  }
  
  /**
   * Test SecureKeyStorageFactory
   */
  private static async testSecureKeyStorageFactory(): Promise<Array<{ test: string; passed: boolean; error?: string }>> {
    const results: Array<{ test: string; passed: boolean; error?: string }> = [];
    
    try {
      const factory = SecureKeyStorageFactory.getInstance();
      
      // Test auto-configuration
      try {
        const config = await factory.autoConfigure();
        results.push({
          test: 'Factory: Auto-configuration',
          passed: !!(config.cryptoBackend && config.storageBackend && config.keyManagementStrategy)
        });
      } catch (error) {
        results.push({
          test: 'Factory: Auto-configuration',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Test security assessment
      try {
        const assessment = await factory.getSecurityAssessment();
        results.push({
          test: 'Factory: Security assessment',
          passed: !!(assessment.overallLevel && assessment.recommendations)
        });
      } catch (error) {
        results.push({
          test: 'Factory: Security assessment',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Test SecureKeyStorage creation
      try {
        const secureStorage = await factory.createSecureKeyStorage();
        const stats = await secureStorage.getStats();
        results.push({
          test: 'Factory: SecureKeyStorage creation',
          passed: !!(stats && typeof stats === 'object')
        });
      } catch (error) {
        results.push({
          test: 'Factory: SecureKeyStorage creation',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
    } catch (error) {
      results.push({
        test: 'Factory: Initialization',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return results;
  }
  
  /**
   * Test integration between components
   */
  private static async testIntegration(): Promise<Array<{ test: string; passed: boolean; error?: string }>> {
    const results: Array<{ test: string; passed: boolean; error?: string }> = [];
    
    try {
      const factory = SecureKeyStorageFactory.getInstance();
      const secureStorage = await factory.createSecureKeyStorage();
      
      // Test key storage and retrieval
      try {
        const testKeys = {
          userKeyPair: { publicKey: 'test-public', privateKey: 'test-private' },
          contactKeys: [],
          lastBackup: Date.now()
        };
        
        await secureStorage.storeKeys(testKeys);
        const retrievedKeys = await secureStorage.getKeys();
        
        results.push({
          test: 'Integration: Key storage and retrieval',
          passed: !!(retrievedKeys && retrievedKeys.userKeyPair)
        });
      } catch (error) {
        results.push({
          test: 'Integration: Key storage and retrieval',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Test backup and restore
      try {
        const testKeys = {
          userKeyPair: { publicKey: 'test-public', privateKey: 'test-private' },
          contactKeys: [],
          lastBackup: Date.now()
        };
        
        await secureStorage.storeKeys(testKeys);
        const backup = await secureStorage.exportKeys('test-password');
        const restored = await secureStorage.importKeys(backup, 'test-password');
        
        results.push({
          test: 'Integration: Backup and restore',
          passed: restored
        });
      } catch (error) {
        results.push({
          test: 'Integration: Backup and restore',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
    } catch (error) {
      results.push({
        test: 'Integration: Setup',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return results;
  }
  
  /**
   * Print test results
   */
  static printResults(results: Array<{ test: string; passed: boolean; error?: string }>): void {
    console.log('\n📋 Test Results:');
    console.log('================');
    
    results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.test}`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
  }
} 