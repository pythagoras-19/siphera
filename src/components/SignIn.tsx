import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const SignIn: React.FC = () => {
  const { isAuthenticated, user, isLoading, signIn } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      console.log('Signing in...');
      await signIn(formData.username, formData.password);
      setMessage('Signed in successfully!');
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'An error occurred during sign in');
    }
  };

  // Redirect to home when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  if (isLoading) {
    return <div className="auth-loading">Loading...</div>;
  }

  return (
    <div className="auth-container">
      <div className="auth-center-col">
        <div className="auth-logo">Siphera</div>
        <div className="auth-tagline">THE PRIVACY FIRST ENTERPRISE UC</div>
        <div className="auth-card">
          <h2>Sign In</h2>
        
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>

            <button type="submit" className="auth-button">
              Sign In
            </button>
          </form>

          <div className="auth-toggle">
            <Link to="/sign-up" className="auth-link">
              Don't have an account? Sign Up
            </Link>
          </div>

          {message && <div className="auth-message">{message}</div>}
          {error && <div className="auth-error">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default SignIn; 