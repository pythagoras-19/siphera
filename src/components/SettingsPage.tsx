import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';
import SecuritySettings from './SecuritySettings';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [discoverable, setDiscoverable] = useState(user?.attributes?.discoverable ?? true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleBackToHome = () => {
    navigate('/app');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setDiscoverable(newValue);
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${user?.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discoverable: newValue }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Discoverability updated!');
      } else {
        setMessage('Failed to update discoverability.');
      }
    } catch (err) {
      setMessage('Error updating discoverability.');
    } finally {
      setSaving(false);
    }
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
          <div className="settings-section">
            <h2>Privacy Settings</h2>
            <label className="discoverable-toggle">
              <input
                type="checkbox"
                checked={discoverable}
                onChange={handleToggle}
                disabled={saving}
              />
              Allow others to find me (discoverable)
            </label>
            {message && <div className="settings-message">{message}</div>}
          </div>
          <SecuritySettings />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 