import React from 'react';
import './Header.css';
import Logo from './Logo';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onBackToHome?: () => void;
  onSignOut?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onBackToHome, onSignOut }) => {
  const { user } = useAuth();
  const email = user?.email || user?.attributes?.email;
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
          {email && (
            <span className="header-user-email">{email}</span>
          )}
          {onSignOut && (
            <button 
              className="header-btn signout-btn" 
              onClick={onSignOut}
              title="Sign Out"
              data-tooltip="Sign Out"
            >
              <span className="btn-text">Sign out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header; 