import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import ContactList from './ContactList';
import KeyDebugger from './KeyDebugger';
import './ChatPage.css';

const ChatPage: React.FC = () => {
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [showContacts, setShowContacts] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  // Check for selectedContact from navigation state
  useEffect(() => {
    if (location.state?.selectedContact) {
      setSelectedContact(location.state.selectedContact);
    }
  }, [location.state]);

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  const handleContactSelect = (contact: string) => {
    setSelectedContact(contact);
    setShowContacts(false);
  };

  const handleShowContacts = () => {
    setShowContacts(true);
  };

  return (
    <div className="App">
      <Header onBackToHome={handleBackToHome} onSignOut={handleSignOut} />
      <div className="main-container">
        <Sidebar 
          activeView="chat" 
          setActiveView={(view) => {
            if (view === 'contacts') navigate('/contacts');
            if (view === 'calls') navigate('/calls');
            if (view === 'settings') navigate('/settings');
          }} 
        />
        <div className="content-area">
          {showContacts ? (
            <ContactList onContactSelect={handleContactSelect} />
          ) : (
            <ChatArea 
              selectedContact={selectedContact} 
              onShowContacts={handleShowContacts}
            />
          )}
        </div>
      </div>
      <KeyDebugger />
    </div>
  );
};

export default ChatPage; 