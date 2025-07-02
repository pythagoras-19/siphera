import React, { useState, useEffect } from 'react';
import './SecuritySettings.css';
import { SecureChatService } from '../services/SecureChatService';

const SecuritySettings: React.FC = () => {
  const [stats, setStats] = useState({ totalSessions: 0, totalMessages: 0 });
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const secureChatService = SecureChatService.getInstance();

  useEffect(() => {
    loadSecurityInfo();
  }, []);

  const loadSecurityInfo = () => {
    setIsLoading(true);
    try {
      const encryptionStats = secureChatService.getEncryptionStats();
      const userPublicKey = secureChatService.getUserPublicKey();
      
      setStats(encryptionStats);
      setPublicKey(userPublicKey);
    } catch (error) {
      console.error('Failed to load security info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatKey = (key: string) => {
    if (key.length <= 20) return key;
    return `${key.substring(0, 10)}...${key.substring(key.length - 10)}`;
  };

  if (isLoading) {
    return (
      <div className="security-settings">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Loading security information...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="security-settings">
      <div className="security-header">
        <h2>🔐 Security & Encryption</h2>
        <p>End-to-End Encryption Status</p>
      </div>

      <div className="security-stats">
        <div className="stat-card">
          <div className="stat-icon">🔒</div>
          <div className="stat-content">
            <h3>Active Sessions</h3>
            <p className="stat-value">{stats.totalSessions}</p>
            <p className="stat-description">Encrypted chat sessions</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💬</div>
          <div className="stat-content">
            <h3>Secure Messages</h3>
            <p className="stat-value">{stats.totalMessages}</p>
            <p className="stat-description">End-to-end encrypted</p>
          </div>
        </div>
      </div>

      <div className="security-info-section">
        <h3>🔑 Your Encryption Keys</h3>
        <div className="key-info">
          <div className="key-item">
            <span className="key-label">Public Key:</span>
            <span className="key-value">{publicKey ? formatKey(publicKey) : 'Not available'}</span>
          </div>
        </div>
      </div>

      <div className="security-features">
        <h3>🛡️ Security Features</h3>
        <div className="feature-list">
          <div className="feature-item">
            <span className="feature-icon">🔐</span>
            <div className="feature-content">
              <h4>AES-256 Encryption</h4>
              <p>All messages are encrypted using industry-standard AES-256 encryption</p>
            </div>
          </div>
          
          <div className="feature-item">
            <span className="feature-icon">🔑</span>
            <div className="feature-content">
              <h4>Key Exchange</h4>
              <p>Secure key exchange protocol for establishing encrypted sessions</p>
            </div>
          </div>
          
          <div className="feature-item">
            <span className="feature-icon">🔄</span>
            <div className="feature-content">
              <h4>Perfect Forward Secrecy</h4>
              <p>New encryption keys for each session to prevent future compromise</p>
            </div>
          </div>
          
          <div className="feature-item">
            <span className="feature-icon">✅</span>
            <div className="feature-content">
              <h4>Message Integrity</h4>
              <p>Cryptographic verification ensures messages haven't been tampered with</p>
            </div>
          </div>
        </div>
      </div>

      <div className="security-notice">
        <div className="notice-header">
          <span className="notice-icon">ℹ️</span>
          <h4>Security Notice</h4>
        </div>
        <p>
          Siphera uses end-to-end encryption to protect your messages. 
          Only you and your intended recipient can read the messages. 
          Not even Siphera can access your encrypted conversations.
        </p>
      </div>
    </div>
  );
};

export default SecuritySettings; 