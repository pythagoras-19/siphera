import React from 'react';
import './App.css';
import './amplify-config'; // Import Amplify configuration
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomePage from './components/HomePage';
import Auth from './components/Auth';
import Header from './components/Header';
import ChatPage from './components/ChatPage';
import ContactsPage from './components/ContactsPage';
import CallsPage from './components/CallsPage';
import SettingsPage from './components/SettingsPage';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth" replace />;
}

// Welcome Screen Component (for /app route)
function WelcomeScreen() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLaunchApp = () => {
    navigate('/dashboard');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="App">
      <Header onSignOut={handleSignOut} />
      <HomePage onLaunchApp={handleLaunchApp} />
    </div>
  );
}

// Dashboard Component (for /dashboard route) - redirects to chat
function Dashboard() {
  const navigate = useNavigate();
  
  React.useEffect(() => {
    navigate('/chat', { replace: true });
  }, [navigate]);
  
  return null;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/app" element={<PrivateRoute><WelcomeScreen /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
          <Route path="/contacts" element={<PrivateRoute><ContactsPage /></PrivateRoute>} />
          <Route path="/calls" element={<PrivateRoute><CallsPage /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
