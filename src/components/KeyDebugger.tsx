import React, { useState, useEffect } from 'react';
import { KeyManagementService } from '../services/KeyManagementService';
import { SecureKeyStorageFactory } from '../services/SecureKeyStorageFactory';
import CryptoTestRunner from './CryptoTestRunner';

const KeyDebugger: React.FC = () => {
  const [keyInfo, setKeyInfo] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [securityAssessment, setSecurityAssessment] = useState<any>(null);
  const [showTestRunner, setShowTestRunner] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadKeyInfo();
      loadSecurityAssessment();
    }
  }, [isVisible]);

  const loadKeyInfo = async () => {
    try {
      const keyManagement = KeyManagementService.getInstance();
      const stats = await keyManagement.getStats();
      
      // Get the raw localStorage data for comparison
      const rawData = localStorage.getItem('siphera_e2e_keys');
      const parsedData = rawData ? JSON.parse(rawData) : null;
      
      setKeyInfo({
        stats,
        rawData: parsedData,
        hasUserKeys: !!parsedData?.userKeyPair,
        hasContactKeys: !!parsedData?.contactKeys?.length,
        lastBackup: parsedData?.lastBackup || null
      });
    } catch (error) {
      console.error('Failed to load key info:', error);
      setKeyInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const loadSecurityAssessment = async () => {
    try {
      const factory = SecureKeyStorageFactory.getInstance();
      await factory.autoConfigure();
      const assessment = await factory.getSecurityAssessment();
      setSecurityAssessment(assessment);
    } catch (error) {
      console.error('Failed to load security assessment:', error);
    }
  };

  const clearKeys = async () => {
    try {
      const keyManagement = KeyManagementService.getInstance();
      await keyManagement.clearAllKeys();
      await loadKeyInfo();
      alert('All keys cleared successfully!');
    } catch (error) {
      console.error('Failed to clear keys:', error);
      alert('Failed to clear keys: ' + (error instanceof Error ? error.message : 'Unknown error'));
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

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-purple-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-purple-600 z-50"
      >
        🔑 Key Debugger
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">🔑 Key Management Debugger</h2>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Key Information</h3>
              
              {keyInfo?.error ? (
                <div className="text-red-600 p-3 bg-red-50 rounded">
                  Error: {keyInfo.error}
                </div>
              ) : keyInfo?.stats ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <div className="text-2xl font-bold text-blue-600">
                        {keyInfo.stats.hasUserKeys ? '✅' : '❌'}
                      </div>
                      <div className="text-sm">User Keys</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {keyInfo.stats.contactCount}
                      </div>
                      <div className="text-sm">Contacts</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div><strong>Initialized:</strong> {keyInfo.stats.isInitialized ? 'Yes' : 'No'}</div>
                    <div><strong>Security Level:</strong> <span className={getSecurityLevelColor(keyInfo.stats.securityLevel)}>{keyInfo.stats.securityLevel}</span></div>
                    <div><strong>Storage Type:</strong> {keyInfo.stats.storageType}</div>
                    <div><strong>Crypto Backend:</strong> {keyInfo.stats.cryptoBackend}</div>
                    <div><strong>Strategy:</strong> {keyInfo.stats.strategy}</div>
                    {keyInfo.stats.lastBackup && (
                      <div><strong>Last Backup:</strong> {new Date(keyInfo.stats.lastBackup).toLocaleString()}</div>
                    )}
                  </div>

                  {keyInfo.stats.userKeyPair && (
                    <div className="p-3 bg-gray-50 rounded text-xs">
                      <div><strong>Public Key:</strong> {keyInfo.stats.userKeyPair.publicKey}</div>
                      <div><strong>Private Key:</strong> {keyInfo.stats.userKeyPair.privateKey}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500">Loading...</div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={loadKeyInfo}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  Refresh
                </button>
                <button
                  onClick={clearKeys}
                  className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                >
                  Clear All Keys
                </button>
                <button
                  onClick={() => setShowTestRunner(!showTestRunner)}
                  className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
                >
                  {showTestRunner ? 'Hide Tests' : 'Show Tests'}
                </button>
              </div>
            </div>

            {/* Security Assessment */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Security Assessment</h3>
              
              {securityAssessment ? (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <div className="text-lg font-semibold">Overall Security Level</div>
                    <div className={`text-3xl font-bold ${getSecurityLevelColor(securityAssessment.overallLevel)}`}>
                      {securityAssessment.overallLevel.toUpperCase()}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="p-2 bg-blue-50 rounded">
                      <strong>Crypto Backend:</strong> {securityAssessment.cryptoBackend.name} 
                      <span className={`ml-2 ${getSecurityLevelColor(securityAssessment.cryptoBackend.securityLevel)}`}>
                        ({securityAssessment.cryptoBackend.securityLevel})
                      </span>
                    </div>
                    
                    <div className="p-2 bg-green-50 rounded">
                      <strong>Storage Backend:</strong> {securityAssessment.storageBackend.name}
                      <span className={`ml-2 ${getSecurityLevelColor(securityAssessment.storageBackend.securityLevel)}`}>
                        ({securityAssessment.storageBackend.securityLevel})
                      </span>
                    </div>
                    
                    <div className="p-2 bg-purple-50 rounded">
                      <strong>Key Management:</strong> {securityAssessment.keyManagement.name}
                      <span className={`ml-2 ${getSecurityLevelColor(securityAssessment.keyManagement.securityLevel)}`}>
                        ({securityAssessment.keyManagement.securityLevel})
                      </span>
                    </div>
                  </div>

                  {securityAssessment.risks.length > 0 && (
                    <div>
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
              ) : (
                <div className="text-gray-500">Loading security assessment...</div>
              )}
            </div>
          </div>

          {/* Test Runner */}
          {showTestRunner && (
            <div className="mt-6">
              <CryptoTestRunner />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KeyDebugger; 