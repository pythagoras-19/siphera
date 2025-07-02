import React from 'react';
import './Header.css';

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo-section">
          <div className="logo">
            <span className="logo-icon">📞</span>
          </div>
          <h1 className="app-title">Siphera</h1>
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