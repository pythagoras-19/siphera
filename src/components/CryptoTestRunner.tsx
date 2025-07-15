import React, { useState } from 'react';
import { CryptoBackendTests } from '../services/tests/CryptoBackendTests';
import { SecureKeyStorageFactory } from '../services/SecureKeyStorageFactory';

const CryptoTestRunner: React.FC = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [securityAssessment, setSecurityAssessment] = useState<any>(null);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const results = await CryptoBackendTests.runAllTests();
      setTestResults(results);
      CryptoBackendTests.printResults(results.results);
    } catch (error) {
      console.error('Test execution failed:', error);
      setTestResults({ passed: 0, failed: 1, results: [{ test: 'Test Execution', passed: false, error: error instanceof Error ? error.message : 'Unknown error' }] });
    } finally {
      setIsRunning(false);
    }
  };

  const runSecurityAssessment = async () => {
    try {
      const factory = SecureKeyStorageFactory.getInstance();
      await factory.autoConfigure();
      const assessment = await factory.getSecurityAssessment();
      setSecurityAssessment(assessment);
    } catch (error) {
      console.error('Security assessment failed:', error);
    }
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'maximum': return 'text-green-600';
      case 'high': return 'text-blue-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">🔬 Crypto Backend Test Suite</h2>
      
      <div className="space-y-4">
        <div className="flex space-x-4">
          <button
            onClick={runTests}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </button>
          
          <button
            onClick={runSecurityAssessment}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Security Assessment
          </button>
        </div>

        {testResults && (
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Test Results</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{testResults.passed}</div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{testResults.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>
            
            <div className="space-y-2">
              {testResults.results.map((result: any, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className={result.passed ? 'text-green-500' : 'text-red-500'}>
                    {result.passed ? '✅' : '❌'}
                  </span>
                  <span className="text-sm">{result.test}</span>
                  {!result.passed && result.error && (
                    <span className="text-xs text-red-500">({result.error})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {securityAssessment && (
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Security Assessment</h3>
            
            <div className="mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold">Overall Security Level:</span>
                <span className={`text-lg font-bold ${getSecurityLevelColor(securityAssessment.overallLevel)}`}>
                  {securityAssessment.overallLevel.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="border rounded p-3">
                <h4 className="font-semibold mb-2">Crypto Backend</h4>
                <div className="text-sm">
                  <div><strong>Name:</strong> {securityAssessment.cryptoBackend.name}</div>
                  <div><strong>Level:</strong> <span className={getSecurityLevelColor(securityAssessment.cryptoBackend.securityLevel)}>{securityAssessment.cryptoBackend.securityLevel}</span></div>
                </div>
              </div>
              
              <div className="border rounded p-3">
                <h4 className="font-semibold mb-2">Storage Backend</h4>
                <div className="text-sm">
                  <div><strong>Name:</strong> {securityAssessment.storageBackend.name}</div>
                  <div><strong>Level:</strong> <span className={getSecurityLevelColor(securityAssessment.storageBackend.securityLevel)}>{securityAssessment.storageBackend.securityLevel}</span></div>
                </div>
              </div>
              
              <div className="border rounded p-3">
                <h4 className="font-semibold mb-2">Key Management</h4>
                <div className="text-sm">
                  <div><strong>Name:</strong> {securityAssessment.keyManagement.name}</div>
                  <div><strong>Level:</strong> <span className={getSecurityLevelColor(securityAssessment.keyManagement.securityLevel)}>{securityAssessment.keyManagement.securityLevel}</span></div>
                </div>
              </div>
            </div>

            {securityAssessment.risks.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-red-600 mb-2">⚠️ Security Risks</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {securityAssessment.risks.map((risk: string, index: number) => (
                    <li key={index} className="text-red-600">{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {securityAssessment.recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-blue-600 mb-2">💡 Recommendations</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {securityAssessment.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-blue-600">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CryptoTestRunner; 