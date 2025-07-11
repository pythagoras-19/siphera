import { CognitoIdentityProviderClient, AdminGetUserCommand, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import { dynamoDBService, User } from './DynamoDBService';

export interface CognitoUser {
  userId: string;
  username: string;
  email: string;
  emailVerified: boolean;
  status: string;
  attributes: Record<string, string>;
}

export class UserService {
  private cognitoClient: CognitoIdentityProviderClient;
  private readonly USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || '';

  constructor() {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  /**
   * Create a new user in DynamoDB after successful Cognito signup
   */
  async createUserFromCognito(cognitoUserId: string, username: string, email: string): Promise<User> {
    try {
      // Check if user already exists in DynamoDB
      const existingUser = await dynamoDBService.getUser(cognitoUserId);
      if (existingUser) {
        console.log(`👤 User already exists in DynamoDB: ${username}`);
        return existingUser;
      }

      // Create new user in DynamoDB
      const newUser: Omit<User, 'createdAt' | 'updatedAt'> = {
        userId: cognitoUserId,
        username,
        email,
        displayName: username,
        status: 'offline',
        lastSeen: Date.now(),
        contacts: [],
        discoverable: true, // <-- Set discoverable true by default
      };

      const user = await dynamoDBService.createUser(newUser);
      console.log(`👤 User created in DynamoDB: ${username} (${cognitoUserId})`);
      return user;
    } catch (error) {
      console.error('Error creating user from Cognito:', error);
      throw error;
    }
  }

  /**
   * Get user from DynamoDB by Cognito user ID
   */
  async getUserByCognitoId(cognitoUserId: string): Promise<User | null> {
    try {
      return await dynamoDBService.getUser(cognitoUserId);
    } catch (error) {
      console.error('Error getting user by Cognito ID:', error);
      return null;
    }
  }

  /**
   * Get user from DynamoDB by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      return await dynamoDBService.getUserByUsername(username);
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  /**
   * Update user status (online/offline/away)
   */
  async updateUserStatus(userId: string, status: User['status']): Promise<void> {
    try {
      await dynamoDBService.updateUserStatus(userId, status);
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  /**
   * Update user profile information
   */
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
    try {
      await dynamoDBService.updateUserProfile(userId, updates);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Add a contact to user's contact list
   */
  async addContact(userId: string, contactId: string): Promise<void> {
    try {
      await dynamoDBService.addContact(userId, contactId);
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  }

  /**
   * Remove a contact from user's contact list
   */
  async removeContact(userId: string, contactId: string): Promise<void> {
    try {
      await dynamoDBService.removeContact(userId, contactId);
    } catch (error) {
      console.error('Error removing contact:', error);
      throw error;
    }
  }

  /**
   * Get all users (for admin purposes)
   */
  async getAllUsers(): Promise<User[]> {
    try {
      return await dynamoDBService.getAllUsers();
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  /**
   * Get user's contacts
   */
  async getUserContacts(userId: string): Promise<User[]> {
    try {
      const user = await dynamoDBService.getUser(userId);
      if (!user || !user.contacts.length) {
        return [];
      }

      const contacts: User[] = [];
      for (const contactId of user.contacts) {
        const contact = await dynamoDBService.getUser(contactId);
        if (contact) {
          contacts.push(contact);
        }
      }

      return contacts;
    } catch (error) {
      console.error('Error getting user contacts:', error);
      return [];
    }
  }

  /**
   * Search users by username or display name
   */
  async searchUsers(query: string, currentUserId: string): Promise<User[]> {
    try {
      const allUsers = await dynamoDBService.getAllUsers();
      const searchTerm = query.toLowerCase();

      return allUsers
        .filter(user => 
          user.userId !== currentUserId && // Exclude current user
          (user.username.toLowerCase().includes(searchTerm) ||
           (user.displayName && user.displayName.toLowerCase().includes(searchTerm)))
        )
        .slice(0, 20); // Limit results
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Verify user exists in Cognito (for authentication)
   */
  async verifyCognitoUser(username: string): Promise<CognitoUser | null> {
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: this.USER_POOL_ID,
        Username: username,
      });

      const response = await this.cognitoClient.send(command) as any;
      
      if (response.User) {
        const attributes: Record<string, string> = {};
        response.User.Attributes?.forEach((attr: any) => {
          if (attr.Name && attr.Value) {
            attributes[attr.Name] = attr.Value;
          }
        });

        return {
          userId: response.User.Username || '',
          username: response.User.Username || '',
          email: attributes.email || '',
          emailVerified: attributes.email_verified === 'true',
          status: response.User.UserStatus || '',
          attributes,
        };
      }

      return null;
    } catch (error) {
      console.error('Error verifying Cognito user:', error);
      return null;
    }
  }

  /**
   * Get user's public key for encryption
   */
  async getUserPublicKey(userId: string): Promise<string | null> {
    try {
      const user = await dynamoDBService.getUser(userId);
      return user?.publicKey || null;
    } catch (error) {
      console.error('Error getting user public key:', error);
      return null;
    }
  }

  /**
   * Update user's public key
   */
  async updateUserPublicKey(userId: string, publicKey: string): Promise<void> {
    try {
      await dynamoDBService.updateUserProfile(userId, { publicKey });
      console.log(`🔑 Public key updated for user: ${userId}`);
    } catch (error) {
      console.error('Error updating user public key:', error);
      throw error;
    }
  }

  /**
   * Get all discoverable users
   */
  async getAllDiscoverableUsers(currentUserId: string): Promise<User[]> {
    return await dynamoDBService.getAllDiscoverableUsers(currentUserId);
  }
}

// Export singleton instance
export const userService = new UserService(); 