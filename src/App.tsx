import React from 'react';
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
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
}

function MainApp() {
  const [activeView, setActiveView] = React.useState<'chat' | 'contacts' | 'calls' | 'settings'>('chat');
  const [selectedContact, setSelectedContact] = React.useState<string | null>(null);
  const [showHomepage, setShowHomepage] = React.useState(true);
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLaunchApp = () => {
    setShowHomepage(false);
  };

  const handleBackToHome = () => {
    setShowHomepage(true);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
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
      <button className="signout-btn" onClick={handleSignOut} style={{ position: 'absolute', right: 24, top: 24, zIndex: 1000 }}>
        Sign Out
      </button>
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
      <Router>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/app" element={<PrivateRoute><MainApp /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
