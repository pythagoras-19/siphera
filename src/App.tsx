import React, { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import ContactList from './components/ContactList';
import SecuritySettings from './components/SecuritySettings';
import HomePage from './components/HomePage';

function App() {
  const [activeView, setActiveView] = useState<'chat' | 'contacts' | 'calls' | 'settings'>('chat');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [showHomepage, setShowHomepage] = useState(true);

  const handleLaunchApp = () => {
    setShowHomepage(false);
  };

  const handleBackToHome = () => {
    setShowHomepage(true);
  };

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

export default App;
