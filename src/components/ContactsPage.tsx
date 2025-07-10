import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';
import ContactList from './ContactList';
import './ContactsPage.css';

const ContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleBackToHome = () => {
    navigate('/app');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleContactSelect = (contact: string) => {
    // Navigate to chat page with the selected contact
    navigate('/chat', { state: { selectedContact: contact } });
  };

  return (
    <div className="App">
      <Header onBackToHome={handleBackToHome} onSignOut={handleSignOut} />
      <div className="main-container">
        <Sidebar 
          activeView="contacts" 
          setActiveView={(view) => {
            if (view === 'chat') navigate('/chat');
            if (view === 'calls') navigate('/calls');
            if (view === 'settings') navigate('/settings');
          }} 
        />
        <div className="content-area">
          <ContactList onContactSelect={handleContactSelect} />
        </div>
      </div>
    </div>
  );
};

export default ContactsPage; 