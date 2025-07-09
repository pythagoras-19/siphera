import { 
  signUp, 
  confirmSignUp, 
  signIn, 
  signOut, 
  getCurrentUser, 
  fetchAuthSession,
  resetPassword,
  confirmResetPassword,
  updatePassword
} from 'aws-amplify/auth';
import { type AuthUser } from '@aws-amplify/auth';

export interface User {
  id: string;
  email: string;
  username: string;
  attributes?: {
    email: string;
    email_verified: boolean;
    sub: string;
    [key: string]: any;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

class AuthService {
  /**
   * Sign up a new user
   */
  async signUp(username: string, email: string, password: string, userAttributes?: any) {
    try {
      console.log('AuthService: Starting signUp with:', { username, email, userAttributes });
      const { isSignUpComplete, userId } = await signUp({
        username,
        password,
        options: {
          userAttributes: {
            email,
            ...userAttributes,
          },
        },
      });
      console.log('AuthService: SignUp completed:', { isSignUpComplete, userId });
      return { isSignUpComplete, userId };
    } catch (error) {
      console.error('AuthService: Error signing up:', error);
      throw error;
    }
  }

  /**
   * Confirm sign up with verification code
   */
  async confirmSignUp(username: string, code: string): Promise<string> {
    try {
      const { isSignUpComplete } = await confirmSignUp({
        username,
        confirmationCode: code,
      });
      return isSignUpComplete ? 'User confirmed successfully' : 'Confirmation pending';
    } catch (error) {
      console.error('Error confirming sign up:', error);
      throw error;
    }
  }

  /**
   * Sign in user
   */
  async signIn(username: string, password: string) {
    try {
      const { isSignedIn } = await signIn({
        username,
        password,
      });
      return { isSignedIn };
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<string> {
    try {
      await signOut();
      return 'Signed out successfully';
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await getCurrentUser();
      return {
        id: user.userId,
        email: user.signInDetails?.loginId || '',
        username: user.username,
        attributes: {
          email: user.signInDetails?.loginId || '',
          email_verified: true,
          sub: user.userId,
        },
      };
    } catch (error) {
      console.log('No authenticated user');
      return null;
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession() {
    try {
      const session = await fetchAuthSession();
      return session;
    } catch (error) {
      console.log('No current session');
      return null;
    }
  }

  /**
   * Get JWT token for API calls
   */
  async getJwtToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch (error) {
      console.log('No JWT token available');
      return null;
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(username: string): Promise<string> {
    try {
      await resetPassword({ username });
      return 'Verification code sent to your email';
    } catch (error) {
      console.error('Error in forgot password:', error);
      throw error;
    }
  }

  /**
   * Confirm new password
   */
  async confirmNewPassword(username: string, code: string, newPassword: string): Promise<string> {
    try {
      await confirmResetPassword({
        username,
        confirmationCode: code,
        newPassword,
      });
      return 'Password changed successfully';
    } catch (error) {
      console.error('Error confirming new password:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<string> {
    try {
      await updatePassword({
        oldPassword,
        newPassword,
      });
      return 'Password changed successfully';
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Listen to authentication state changes
   */
  onAuthStateChange(callback: (authState: AuthState) => void): () => void {
    getCurrentUser()
      .then((user) => {
        if (user) {
          callback({
            isAuthenticated: true,
            user: {
              id: user.userId,
              email: user.signInDetails?.loginId || '',
              username: user.username,
              attributes: {
                email: user.signInDetails?.loginId || '',
                email_verified: true,
                sub: user.userId,
              },
            },
            isLoading: false,
          });
        } else {
          callback({
            isAuthenticated: false,
            user: null,
            isLoading: false,
          });
        }
      })
      .catch(() => {
        callback({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });
      });

    // Return cleanup function
    return () => {
      // Cleanup if needed
    };
  }
}

export const authService = new AuthService();
export default authService; 