import React, { useState } from 'react';
import './App.css';
import './amplify-config'; // Import Amplify configuration
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import ContactList from './components/ContactList';
import SecuritySettings from './components/SecuritySettings';
import HomePage from './components/HomePage';
import Auth from './components/Auth';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeView, setActiveView] = useState<'chat' | 'contacts' | 'calls' | 'settings'>('chat');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [showHomepage, setShowHomepage] = useState(true);

  const handleLaunchApp = () => {
    setShowHomepage(false);
  };

  const handleBackToHome = () => {
    setShowHomepage(true);
  };

  // Show loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Show authentication if not authenticated
  if (!isAuthenticated) {
    return <Auth />;
  }

  // Show homepage or main app
  if (showHomepage) {
    return (
      <div className="App">
        <HomePage onLaunchApp={handleLaunchApp} />
      </div>
    );
  }

  return (
    <div className="App">
      <Header onBackToHome={handleBackToHome} />
      <div className="main-container">
        <Sidebar activeView={activeView} setActiveView={setActiveView} />
        <div className="content-area">
          {activeView === 'chat' && (
            <ChatArea selectedContact={selectedContact} />
          )}
          {activeView === 'contacts' && (
            <ContactList onContactSelect={setSelectedContact} />
          )}
          {activeView === 'calls' && (
            <div className="calls-view">
              <h2>Call History</h2>
              <p>Recent calls will appear here</p>
            </div>
          )}
          {activeView === 'settings' && (
            <SecuritySettings />
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
