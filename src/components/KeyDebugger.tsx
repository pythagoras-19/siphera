import React, { useState, useEffect } from 'react';
import { KeyManagementService } from '../services/KeyManagementService';

const KeyDebugger: React.FC = () => {
  const [keyInfo, setKeyInfo] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const keyManagement = KeyManagementService.getInstance();
    const stats = keyManagement.getStats();
    const recommendations = keyManagement.getSecurityRecommendations();
    
    // Get the raw localStorage data for comparison
    const rawData = localStorage.getItem('siphera_e2e_keys');
    const parsedData = rawData ? JSON.parse(rawData) : null;
    
    setKeyInfo({
      stats,
      recommendations,
      rawData: parsedData,
      hasUserKeys: !!parsedData?.userKeyPair,
      contactCount: parsedData?.contactKeys?.length || 0,
      userPublicKey: keyManagement.getUserPublicKey()?.substring(0, 20) + '...',
      userPrivateKey: keyManagement.getUserPrivateKey()?.substring(0, 20) + '...'
    });
  }, []);

  if (!isVisible) {
    return (
      <button 
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '10px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 1000
        }}
      >
        🔑 Show Keys
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      maxHeight: '600px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '15px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      overflowY: 'auto',
      fontSize: '12px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px',
        borderBottom: '1px solid #dee2e6',
        paddingBottom: '10px'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>🔐 Key Management Debug</h3>
        <button 
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            color: '#6c757d'
          }}
        >
          ×
        </button>
      </div>

      {keyInfo ? (
        <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
          {/* Security Level */}
          <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e7f3ff', borderRadius: '5px' }}>
            <strong>🛡️ Security Level:</strong> {keyInfo.stats.securityLevel}<br/>
            <strong>💾 Storage Type:</strong> {keyInfo.stats.storageType}<br/>
            <strong>📊 Contact Keys:</strong> {keyInfo.stats.contactCount}<br/>
            <strong>💾 Last Backup:</strong> {keyInfo.stats.lastBackup ? new Date(keyInfo.stats.lastBackup).toLocaleString() : 'Never'}
          </div>

          {/* Security Recommendations */}
          <div style={{ marginBottom: '15px' }}>
            <strong>🔒 Security Recommendations:</strong>
            <div style={{ marginTop: '5px' }}>
              {keyInfo.recommendations.map((rec: string, index: number) => (
                <div key={index} style={{ 
                  marginBottom: '3px', 
                  padding: '3px 0',
                  fontSize: '11px',
                  color: rec.includes('⚠️') ? '#856404' : rec.includes('✅') ? '#155724' : '#6c757d'
                }}>
                  {rec}
                </div>
              ))}
            </div>
          </div>

          {/* Keys Information */}
          <div style={{ marginBottom: '15px' }}>
            <strong>🔑 Keys Status:</strong>
            <div style={{ marginLeft: '10px', marginTop: '5px' }}>
              ✅ Has User Keys: {keyInfo.stats.hasUserKeys ? 'Yes' : 'No'}<br/>
              🔐 Security Level: {keyInfo.stats.securityLevel}<br/>
              💾 Storage: {keyInfo.stats.storageType}
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <strong>🔑 Public Key:</strong>
            <div style={{ 
              marginLeft: '10px', 
              fontFamily: 'monospace', 
              fontSize: '10px',
              wordBreak: 'break-all',
              backgroundColor: '#e9ecef',
              padding: '5px',
              borderRadius: '3px'
            }}>
              {keyInfo.userPublicKey}
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <strong>🔐 Private Key:</strong>
            <div style={{ 
              marginLeft: '10px', 
              fontFamily: 'monospace', 
              fontSize: '10px',
              wordBreak: 'break-all',
              backgroundColor: '#e9ecef',
              padding: '5px',
              borderRadius: '3px'
            }}>
              {keyInfo.userPrivateKey}
            </div>
          </div>

          {/* Contact Keys */}
          <div style={{ marginBottom: '15px' }}>
            <strong>👥 Contact Keys:</strong>
            {keyInfo.rawData?.contactKeys?.map((contact: any, index: number) => (
              <div key={index} style={{ 
                marginLeft: '10px', 
                marginTop: '5px',
                padding: '5px',
                backgroundColor: '#fff',
                borderRadius: '3px',
                border: '1px solid #dee2e6'
              }}>
                <div><strong>User:</strong> {contact.userId}</div>
                <div><strong>Public Key:</strong> {contact.publicKey.substring(0, 20)}...</div>
                <div><strong>Updated:</strong> {new Date(contact.lastUpdated).toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #dee2e6' }}>
            <button 
              onClick={async () => {
                const keyManagement = KeyManagementService.getInstance();
                await keyManagement.clearAllKeys();
                window.location.reload();
              }}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '11px',
                marginRight: '5px'
              }}
            >
              🗑️ Clear All Keys
            </button>
            
            <button 
              onClick={() => {
                const keyManagement = KeyManagementService.getInstance();
                const stats = keyManagement.getStats();
                console.log('Key Management Stats:', stats);
                console.log('Security Recommendations:', keyManagement.getSecurityRecommendations());
              }}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              📊 Log Stats
            </button>
          </div>
        </div>
      ) : (
        <div>Loading key information...</div>
      )}
    </div>
  );
};

export default KeyDebugger; 