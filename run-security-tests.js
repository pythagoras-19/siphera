#!/usr/bin/env node

/**
 * Security Test Runner for Siphera
 * Runs the crypto backend tests and security assessment from command line
 */

// Register ts-node for TypeScript support
require('ts-node').register({
  compilerOptions: {
    module: 'commonjs',
    target: 'es2020',
    lib: ['es2020', 'dom'],
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    skipLibCheck: true
  },
  moduleTypes: {
    "**/*": "cjs"
  }
});

// Mock browser environment for Node.js
global.window = {
  crypto: require('crypto').webcrypto,
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  }
};

global.document = {
  createElement: () => ({
    getContext: () => ({
      getImageData: () => ({ data: new Uint8Array(16) })
    })
  })
};

// Mock crypto-js for Node.js environment
global.CryptoJS = require('crypto-js');

async function runSecurityTests() {
  console.log('🔐 Siphera Security Test Suite');
  console.log('================================\n');

  try {
    // Import test modules
    const { CryptoBackendTests } = require('./src/services/tests/CryptoBackendTests.ts');
    const { SecureKeyStorageFactory } = require('./src/services/SecureKeyStorageFactory.ts');
    
    // Run crypto backend tests
    console.log('🧪 Running Crypto Backend Tests...\n');
    const testResults = await CryptoBackendTests.runAllTests();
    
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

    // Print detailed results
    CryptoBackendTests.printResults(testResults.results);

    // Run security assessment
    console.log('\n🔒 Running Security Assessment...\n');
    const factory = SecureKeyStorageFactory.getInstance();
    await factory.autoConfigure();
    const assessment = await factory.getSecurityAssessment();

    console.log('📋 Security Assessment Results:');
    console.log('================================');
    console.log(`Overall Security Level: ${assessment.overallLevel.toUpperCase()}`);
    console.log(`Crypto Backend: ${assessment.cryptoBackend.name} (${assessment.cryptoBackend.securityLevel})`);
    console.log(`Storage Backend: ${assessment.storageBackend.name} (${assessment.storageBackend.securityLevel})`);
    console.log(`Key Management: ${assessment.keyManagement.name} (${assessment.keyManagement.securityLevel})`);

    if (assessment.risks.length > 0) {
      console.log('\n⚠️ Security Risks:');
      assessment.risks.forEach(risk => console.log(`  • ${risk}`));
    }

    if (assessment.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      assessment.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }

    // Overall result
    console.log('\n🎯 Overall Result:');
    if (testResults.failed === 0 && assessment.overallLevel === 'high') {
      console.log('✅ All tests passed! Security level is HIGH.');
      process.exit(0);
    } else if (testResults.failed === 0) {
      console.log('⚠️ All tests passed, but security level could be improved.');
      process.exit(1);
    } else {
      console.log('❌ Some tests failed. Please review the results above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
runSecurityTests(); 