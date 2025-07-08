import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, AuthState, User } from '../services/authService';

interface AuthContextType extends AuthState {
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string, userAttributes?: any) => Promise<void>;
  signOut: () => Promise<void>;
  confirmSignUp: (username: string, code: string) => Promise<void>;
  forgotPassword: (username: string) => Promise<void>;
  confirmNewPassword: (username: string, code: string, newPassword: string) => Promise<void>;
  getJwtToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    // Check initial auth state
    const checkAuthState = async () => {
      try {
        const user = await authService.getCurrentUser();
        setAuthState({
          isAuthenticated: !!user,
          user,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error checking auth state:', error);
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });
      }
    };

    checkAuthState();

    // Set up auth state listener
    const cleanup = authService.onAuthStateChange((newAuthState) => {
      setAuthState(newAuthState);
    });

    return cleanup;
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      await authService.signIn(username, password);
      const user = await authService.getCurrentUser();
      setAuthState({
        isAuthenticated: true,
        user,
        isLoading: false,
      });
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const signUp = async (username: string, email: string, password: string, userAttributes?: any) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      await authService.signUp(username, email, password, userAttributes);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      await authService.signOut();
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const confirmSignUp = async (username: string, code: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      await authService.confirmSignUp(username, code);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const forgotPassword = async (username: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      await authService.forgotPassword(username);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const confirmNewPassword = async (username: string, code: string, newPassword: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      await authService.confirmNewPassword(username, code, newPassword);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const getJwtToken = async () => {
    return await authService.getJwtToken();
  };

  const value: AuthContextType = {
    ...authState,
    signIn,
    signUp,
    signOut,
    confirmSignUp,
    forgotPassword,
    confirmNewPassword,
    getJwtToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 