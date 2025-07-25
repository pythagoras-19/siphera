import { User } from '../types/user';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://gbhftb5ndy.us-east-2.awsapprunner.com';

export interface UserSearchResult {
  success: boolean;
  users: User[];
}

export interface UserResponse {
  success: boolean;
  user: User;
}

export interface ContactsResponse {
  success: boolean;
  contacts: User[];
}

export interface MessageResponse {
  success: boolean;
  messages: any[];
}

export class UserService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get all users (for admin purposes)
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const response = await this.makeRequest<{ success: boolean; users: User[] }>('/api/users');
      return response.users;
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const response = await this.makeRequest<UserResponse>(`/api/users/${userId}`);
      return response.user;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  /**
   * Get user's contacts
   */
  async getUserContacts(userId: string): Promise<User[]> {
    try {
      const response = await this.makeRequest<ContactsResponse>(`/api/users/${userId}/contacts`);
      return response.contacts;
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }
  }

  /**
   * Add a contact to user's contact list
   */
  async addContact(userId: string, contactId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/api/users/${userId}/contacts`, {
        method: 'POST',
        body: JSON.stringify({ contactId }),
      });
      return true;
    } catch (error) {
      console.error('Error adding contact:', error);
      return false;
    }
  }

  /**
   * Remove a contact from user's contact list
   */
  async removeContact(userId: string, contactId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/api/users/${userId}/contacts/${contactId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error('Error removing contact:', error);
      return false;
    }
  }

  /**
   * Search users by username or display name
   */
  async searchUsers(query: string, currentUserId: string): Promise<User[]> {
    try {
      const response = await this.makeRequest<UserSearchResult>(
        `/api/users/search/${encodeURIComponent(query)}?currentUserId=${currentUserId}`
      );
      return response.users;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Update user status
   */
  async updateUserStatus(userId: string, status: 'online' | 'offline' | 'away'): Promise<boolean> {
    try {
      await this.makeRequest(`/api/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      return true;
    } catch (error) {
      console.error('Error updating user status:', error);
      return false;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<boolean> {
    try {
      await this.makeRequest(`/api/users/${userId}/profile`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  /**
   * Get chat messages between two users
   */
  async getMessages(senderId: string, recipientId: string, limit: number = 50): Promise<any[]> {
    try {
      const response = await this.makeRequest<MessageResponse>(
        `/api/messages/${senderId}/${recipientId}?limit=${limit}`
      );
      return response.messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/api/messages/${messageId}/read`, {
        method: 'PUT',
      });
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }

  /**
   * Create a new chat session
   */
  async createChatSession(participants: string[]): Promise<any> {
    try {
      const response = await this.makeRequest('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ participants }),
      });
      return response;
    } catch (error) {
      console.error('Error creating chat session:', error);
      return null;
    }
  }

  /**
   * Get chat session by ID
   */
  async getChatSession(sessionId: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/api/sessions/${sessionId}`);
      return response;
    } catch (error) {
      console.error('Error fetching chat session:', error);
      return null;
    }
  }

  /**
   * Get user's chat sessions
   */
  async getUserChatSessions(userId: string): Promise<any[]> {
    try {
      const response = await this.makeRequest<{ success: boolean; sessions: any[] }>(`/api/users/${userId}/sessions`);
      return response.sessions || [];
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }
  }
}

// Export singleton instance
export const userService = new UserService(); 