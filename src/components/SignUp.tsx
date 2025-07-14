import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

const SignUp: React.FC = () => {
  const { isAuthenticated, user, isLoading, signUp, confirmSignUp } = useAuth();
  const navigate = useNavigate();
  
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
      if (isConfirming) {
        console.log('Confirming sign up with code:', formData.code);
        await confirmSignUp(formData.username, formData.code);

        // After successful confirmation, create user in backend:
        console.log('About to POST to /api/users', formData);
       // console.log('REACT_APP_API_URL', process.env.REACT_APP_API_URL);
        await fetch(`${process.env.REACT_APP_API_URL}/api/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            givenName: formData.givenName,
            familyName: formData.familyName,
            phoneNumber: formData.phoneNumber,
            // ...any other fields for later
          }),
        });
        console.log('POST to /api/users finished');

        setMessage('Account confirmed successfully! You can now sign in.');
        setIsConfirming(false);
        setTimeout(() => {
          navigate('/sign-in');
        }, 2000);
      } else {
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
      }
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.message || 'An error occurred during sign up');
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

  return (
    <div className="auth-container">
      <div className="auth-center-col">
        <div className="auth-logo">Siphera</div>
        <div className="auth-tagline">THE PRIVACY FIRST ENTERPRISE UC</div>
        <div className="auth-card">
          <h2>{isConfirming ? 'Confirm Account' : 'Sign Up'}</h2>
        
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
              {isConfirming ? 'Confirm' : 'Sign Up'}
            </button>
          </form>

          {!isConfirming && (
            <div className="auth-toggle">
              <Link to="/sign-in" className="auth-link">
                Already have an account? Sign In
              </Link>
            </div>
          )}

          {message && <div className="auth-message">{message}</div>}
          {error && <div className="auth-error">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default SignUp; 