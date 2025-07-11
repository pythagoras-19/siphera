import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';
import './CallsPage.css';

const CallsPage: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleBackToHome = () => {
    navigate('/app');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  return (
    <div className="App">
      <Header onBackToHome={handleBackToHome} onSignOut={handleSignOut} />
      <div className="main-container">
        <Sidebar 
          activeView="calls" 
          setActiveView={(view) => {
            if (view === 'chat') navigate('/chat');
            if (view === 'contacts') navigate('/contacts');
            if (view === 'settings') navigate('/settings');
          }} 
        />
        <div className="content-area">
          <div className="calls-view">
            <h2>Call History</h2>
            <p>Recent calls will appear here</p>
            <div className="calls-placeholder">
              <div className="calls-icon">📞</div>
              <p>No recent calls</p>
              <p>Start a conversation to see call history</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallsPage; 