import React, { useState, useEffect } from 'react';
import './HomePage.css';

interface HomePageProps {
  onLaunchApp: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onLaunchApp }) => {
  const [currentFeature, setCurrentFeature] = useState(0);

  const features = [
    {
      icon: '🔐',
      title: 'End-to-End Encryption',
      description: 'Your messages are protected with military-grade AES-256 encryption. Only you and your intended recipient can read them.',
      color: '#4caf50'
    },
    {
      icon: '💬',
      title: 'Real-Time Messaging',
      description: 'Instant messaging with typing indicators, read receipts, and seamless conversation flow.',
      color: '#4a90e2'
    },
    {
      icon: '👥',
      title: 'Contact Management',
      description: 'Organize your contacts with smart search, status indicators, and easy group management.',
      color: '#ff9800'
    },
    {
      icon: '📞',
      title: 'Voice & Video Calls',
      description: 'Crystal clear voice and video calls with advanced audio processing and noise cancellation.',
      color: '#9c27b0'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Welcome to <span className="gradient-text">Siphera</span>
            </h1>
            <p className="hero-subtitle">
              The next generation of unified communications. Secure, modern, and designed for the future.
            </p>
            <div className="hero-features">
              <div className="feature-tag">
                <span className="feature-icon">🔒</span>
                End-to-End Encrypted
              </div>
              <div className="feature-tag">
                <span className="feature-icon">⚡</span>
                Real-Time
              </div>
              <div className="feature-tag">
                <span className="feature-icon">🎨</span>
                Modern Design
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="app-preview">
              <div className="preview-header">
                <div className="preview-logo">📞</div>
                <div className="preview-title">Siphera</div>
              </div>
              <div className="preview-content">
                <div className="preview-message received">
                  <div className="message-bubble">Hey! How's the new project going?</div>
                </div>
                <div className="preview-message sent">
                  <div className="message-bubble">Great! Just finished the encryption module 🔐</div>
                </div>
                <div className="preview-message received">
                  <div className="message-bubble">Amazing! Can't wait to see it in action</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <h2 className="section-title">Why Choose Siphera?</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`feature-card ${currentFeature === index ? 'active' : ''}`}
                style={{ '--accent-color': feature.color } as React.CSSProperties}
              >
                <div className="feature-icon-large">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="security-section">
        <div className="security-container">
          <div className="security-content">
            <h2 className="section-title">Enterprise-Grade Security</h2>
            <p className="security-description">
              Your privacy is our priority. Siphera uses state-of-the-art encryption to ensure your communications remain private and secure.
            </p>
            <div className="security-features">
              <div className="security-item">
                <div className="security-icon">🔐</div>
                <div className="security-text">
                  <h4>AES-256 Encryption</h4>
                  <p>Military-grade encryption for all messages</p>
                </div>
              </div>
              <div className="security-item">
                <div className="security-icon">🔑</div>
                <div className="security-text">
                  <h4>Perfect Forward Secrecy</h4>
                  <p>New keys for each session</p>
                </div>
              </div>
              <div className="security-item">
                <div className="security-icon">✅</div>
                <div className="security-text">
                  <h4>Message Integrity</h4>
                  <p>Cryptographic verification prevents tampering</p>
                </div>
              </div>
            </div>
          </div>
          <div className="security-visual">
            <div className="encryption-animation">
              <div className="lock-icon">🔒</div>
              <div className="encryption-lines">
                <div className="line"></div>
                <div className="line"></div>
                <div className="line"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Ready to Experience Secure Communication?</h2>
          <p className="cta-description">
            Join thousands of users who trust Siphera for their daily communications.
          </p>
          <div className="cta-buttons">
            <button className="cta-button primary" onClick={onLaunchApp}>Launch App</button>
            <button className="cta-button secondary">Learn More</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="homepage-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>Siphera</h4>
            <p>Unified communications for the modern world</p>
          </div>
          <div className="footer-section">
            <h4>Features</h4>
            <ul>
              <li>Secure Messaging</li>
              <li>Voice & Video Calls</li>
              <li>Contact Management</li>
              <li>File Sharing</li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Security</h4>
            <ul>
              <li>End-to-End Encryption</li>
              <li>Privacy Policy</li>
              <li>Security Whitepaper</li>
              <li>Bug Bounty</li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li>Help Center</li>
              <li>Contact Us</li>
              <li>Community</li>
              <li>Status</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 Siphera. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage; 