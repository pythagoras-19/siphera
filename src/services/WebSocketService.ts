import { io, Socket } from 'socket.io-client';
import { SecureChatService } from './SecureChatService';

export interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  recipient: string;
  timestamp: number;
  isEncrypted: boolean;
}

export interface User {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: number;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private secureChatService: SecureChatService;
  private messageCallbacks: Map<string, (message: ChatMessage) => void> = new Map();
  private userStatusCallbacks: Map<string, (user: User) => void> = new Map();
  private connectionCallbacks: Array<(connected: boolean) => void> = [];
  private currentUser: User | null = null;

  private constructor() {
    this.secureChatService = SecureChatService.getInstance();
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(userId: string, userName: string): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    try {
      // Connect to Socket.IO server
      this.socket = io('http://localhost:3007', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      this.currentUser = {
        id: userId,
        name: userName,
        status: 'online'
      };

      // Set up event listeners
      this.setupEventListeners();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not initialized'));
          return;
        }

        this.socket.on('connect', () => {
          console.log('🔌 Connected to WebSocket server');
          this.notifyConnectionStatus(true);
          
          // Send user info to server
          this.socket?.emit('user:join', {
            userId: this.currentUser?.id,
            userName: this.currentUser?.name
          });
          
          resolve();
        });

        this.socket.on('connect_error', (error: Error) => {
          console.error('WebSocket connection error:', error);
          reject(error);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);
      });

    } catch (error) {
      console.error('Failed to connect to WebSocket server:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.notifyConnectionStatus(false);
      console.log('🔌 Disconnected from WebSocket server');
    }
  }

  /**
   * Send a message to a specific user
   */
  async sendMessage(recipientId: string, messageText: string): Promise<ChatMessage> {
    if (!this.socket?.connected) {
      throw new Error('Not connected to server');
    }

    try {
      // Encrypt the message
      const secureMessage = await this.secureChatService.sendEncryptedMessage(recipientId, messageText);
      
      // Create chat message for transmission
      const chatMessage: ChatMessage = {
        id: secureMessage.id,
        text: messageText, // Send plain text for demo, in production this would be encrypted
        sender: this.currentUser?.id || 'unknown',
        recipient: recipientId,
        timestamp: Date.now(),
        isEncrypted: true
      };

      // Send to server
      this.socket.emit('message:send', {
        ...chatMessage,
        encryptedData: secureMessage.encryptedData
      });

      console.log(`📤 Message sent to ${recipientId}:`, messageText);
      return chatMessage;

    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Set up Socket.IO event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Handle incoming messages
    this.socket.on('message:received', async (data: any) => {
      console.log('📥 Message received:', data);
      
      try {
        // Decrypt the message if it's encrypted
        let decryptedText = data.text;
        if (data.encryptedData) {
          decryptedText = await this.secureChatService.receiveEncryptedMessage(
            data.sender,
            {
              id: data.id,
              sender: data.sender,
              recipient: data.recipient,
              encryptedData: data.encryptedData,
              messageHash: data.messageHash || '',
              timestamp: data.timestamp,
              isEncrypted: true
            }
          );
        }

        const chatMessage: ChatMessage = {
          id: data.id,
          text: decryptedText,
          sender: data.sender,
          recipient: data.recipient,
          timestamp: data.timestamp,
          isEncrypted: data.isEncrypted || false
        };

        // Notify all registered callbacks
        this.messageCallbacks.forEach(callback => {
          callback(chatMessage);
        });

      } catch (error) {
        console.error('Failed to process received message:', error);
      }
    });

    // Handle user status updates
    this.socket.on('user:status', (data: User) => {
      console.log('👤 User status update:', data);
      this.userStatusCallbacks.forEach(callback => {
        callback(data);
      });
    });

    // Handle connection status
    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      this.notifyConnectionStatus(false);
    });

    this.socket.on('reconnect', () => {
      console.log('🔌 Reconnected to server');
      this.notifyConnectionStatus(true);
      
      // Re-send user info
      if (this.currentUser) {
        this.socket?.emit('user:join', {
          userId: this.currentUser.id,
          userName: this.currentUser.name
        });
      }
    });
  }

  /**
   * Register a callback for incoming messages
   */
  onMessage(callback: (message: ChatMessage) => void): () => void {
    const id = Math.random().toString(36);
    this.messageCallbacks.set(id, callback);
    
    // Return unsubscribe function
    return () => {
      this.messageCallbacks.delete(id);
    };
  }

  /**
   * Register a callback for user status updates
   */
  onUserStatus(callback: (user: User) => void): () => void {
    const id = Math.random().toString(36);
    this.userStatusCallbacks.set(id, callback);
    
    // Return unsubscribe function
    return () => {
      this.userStatusCallbacks.delete(id);
    };
  }

  /**
   * Register a callback for connection status changes
   */
  onConnectionStatus(callback: (connected: boolean) => void): () => void {
    this.connectionCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all connection status callbacks
   */
  private notifyConnectionStatus(connected: boolean): void {
    this.connectionCallbacks.forEach(callback => {
      callback(connected);
    });
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get current user info
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }
} 