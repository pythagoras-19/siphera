import React from 'react';
import './Header.css';
import Logo from './Logo';

interface HeaderProps {
  onBackToHome?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onBackToHome }) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo-section">
          {onBackToHome && (
            <button className="back-btn" onClick={onBackToHome}>
              <span className="btn-icon">🏠</span>
            </button>
          )}
          <Logo size={44} showText={true} className="header-logo" />
        </div>
        <div className="header-actions">
          <button className="header-btn">
            <span className="btn-icon">🔍</span>
          </button>
          <button className="header-btn">
            <span className="btn-icon">⚙️</span>
          </button>
          <button className="header-btn profile-btn">
            <span className="btn-icon">👤</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 