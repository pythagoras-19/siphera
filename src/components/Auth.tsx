import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

const Auth: React.FC = () => {
  const { isAuthenticated, user, isLoading, signIn, signUp, signOut, confirmSignUp } = useAuth();
  const navigate = useNavigate();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    code: '',
    givenName: '',
    familyName: '',
    phoneNumber: '',
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
      console.log('trying to sign in');
      if (isConfirming) {
        console.log('Confirming sign up with code:', formData.code);
        await confirmSignUp(formData.username, formData.code);
        setMessage('Account confirmed successfully! You can now sign in.');
        setIsConfirming(false);
        setIsSignUp(false);
      } else if (isSignUp) {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        
        console.log('Starting sign up process...');
        
        // Prepare user attributes for Cognito
        const userAttributes: any = {
          email: formData.email,
        };
        
        // Add optional attributes if provided
        if (formData.givenName) userAttributes.given_name = formData.givenName;
        if (formData.familyName) userAttributes.family_name = formData.familyName;
        if (formData.phoneNumber) userAttributes.phone_number = formData.phoneNumber;
        
        console.log('Sign up attributes:', { username: formData.username, email: formData.email, userAttributes });
        
        const result = await signUp(formData.username, formData.email, formData.password, userAttributes);
        console.log('Sign up result:', result);
        
        setMessage('Account created! Please check your email for confirmation code.');
        console.log('Setting isConfirming to true');
        setIsConfirming(true);
      } else {
        console.log('Signing in...');
        await signIn(formData.username, formData.password);
        setMessage('Signed in successfully!');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'An error occurred');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setMessage('Signed out successfully!');
    } catch (err: any) {
      setError(err.message || 'Error signing out');
    }
  };

  // Redirect to /app when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('/app');
    }
  }, [isAuthenticated, user, navigate]);

  if (isLoading) {
    return <div className="auth-loading">Loading...</div>;
  }

  // Remove the authenticated user display since we're redirecting
  // if (isAuthenticated && user) {
  //   return (
  //     <div className="auth-container">
  //       <div className="auth-card">
  //         <h2>Welcome, {user.username}!</h2>
  //         <p>Email: {user.email}</p>
  //         <p>User ID: {user.id}</p>
  //         <button onClick={handleSignOut} className="auth-button">
  //           Sign Out
  //         </button>
  //         {message && <div className="auth-message">{message}</div>}
  //         {error && <div className="auth-error">{error}</div>}
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="auth-container">
      <div className="auth-center-col">
        <div className="auth-logo">Siphera</div>
        <div className="auth-tagline">THE PRIVACY FIRST ENTERPRISE UC</div>
        <div className="auth-card">
          <h2>{isConfirming ? 'Confirm Account' : isSignUp ? 'Sign Up' : 'Sign In'}</h2>
        
          <form onSubmit={handleSubmit}>
            {!isConfirming && (
              <>
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

                {isSignUp && (
                  <>
                    <div className="form-group">
                      <label htmlFor="email">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="givenName">First Name</label>
                      <input
                        type="text"
                        id="givenName"
                        name="givenName"
                        value={formData.givenName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="familyName">Last Name</label>
                      <input
                        type="text"
                        id="familyName"
                        name="familyName"
                        value={formData.familyName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="phoneNumber">Phone Number</label>
                      <input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="+1234567890"
                        required
                      />
                    </div>
                  </>
                )}

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

                {isSignUp && (
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                )}
              </>
            )}

            {isConfirming && (
              <div className="form-group">
                <label htmlFor="code">Confirmation Code</label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="Enter code from email"
                  required
                />
              </div>
            )}

            <button type="submit" className="auth-button">
              {isConfirming ? 'Confirm' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          {!isConfirming && (
            <div className="auth-toggle">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setMessage(null);
                }}
                className="auth-link"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          )}

          {message && <div className="auth-message">{message}</div>}
          {error && <div className="auth-error">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default Auth; 