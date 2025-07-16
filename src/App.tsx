import React from 'react';
import './App.css';
import './amplify-config'; // Import Amplify configuration
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomePage from './components/HomePage';
import KeyDebugger from './components/KeyDebugger';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import Header from './components/Header';
import ChatPage from './components/ChatPage';
import ContactsPage from './components/ContactsPage';
import CallsPage from './components/CallsPage';
import SettingsPage from './components/SettingsPage';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/sign-in" replace />;
}

// Welcome Screen Component (for home route)
function WelcomeScreen() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLaunchApp = () => {
    navigate('/chat');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  return (
    <div className="App">
      <Header onSignOut={handleSignOut} />
      <HomePage onLaunchApp={handleLaunchApp} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/" element={<PrivateRoute><WelcomeScreen /></PrivateRoute>} />
          <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
          <Route path="/contacts" element={<PrivateRoute><ContactsPage /></PrivateRoute>} />
          <Route path="/calls" element={<PrivateRoute><CallsPage /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/sign-in" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
