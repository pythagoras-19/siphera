import React, { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import ContactList from './components/ContactList';

function App() {
  const [activeView, setActiveView] = useState<'chat' | 'contacts' | 'calls' | 'settings'>('chat');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  return (
    <div className="App">
      <Header />
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
            <div className="settings-view">
              <h2>Settings</h2>
              <p>App settings and preferences</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
