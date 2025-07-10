import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';
import SecuritySettings from './SecuritySettings';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleBackToHome = () => {
    navigate('/app');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="App">
      <Header onBackToHome={handleBackToHome} onSignOut={handleSignOut} />
      <div className="main-container">
        <Sidebar 
          activeView="settings" 
          setActiveView={(view) => {
            if (view === 'chat') navigate('/chat');
            if (view === 'contacts') navigate('/contacts');
            if (view === 'calls') navigate('/calls');
          }} 
        />
        <div className="content-area">
          <SecuritySettings />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 