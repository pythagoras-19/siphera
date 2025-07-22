import { io, Socket } from 'socket.io-client';
import { SecureChatService } from './SecureChatService';
import { KeyManagementService } from './KeyManagementService';

export interface ChatMessage {
  messageId?: string; // Add this line for backend compatibility
  id?: string;
  senderId?: string; // Add this for backend compatibility
  recipientId?: string; // Add this for backend compatibility
  text?: string; // For WebSocket messages
  content?: string; // For backend API messages
  sender: string;
  recipient: string;
  timestamp: number;
  isEncrypted: boolean;
  metadata?: any; // For encryption metadata like IV
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
  private keyManagement: KeyManagementService;
  private messageCallbacks: Map<string, (message: ChatMessage) => void> = new Map();
  private userStatusCallbacks: Map<string, (user: User) => void> = new Map();
  private connectionCallbacks: Array<(connected: boolean) => void> = [];
  private currentUser: User | null = null;
  private isConnecting: boolean = false;

  private constructor() {
    this.secureChatService = SecureChatService.getInstance();
    this.keyManagement = KeyManagementService.getInstance();
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
    console.log('🔌 Attempting to connect to WebSocket server...', { userId, userName });
    
    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      console.log('⏳ Connection already in progress, waiting...');
      return;
    }
    
    if (this.socket?.connected) {
      console.log('✅ Already connected to WebSocket server');
      return;
    }

    this.isConnecting = true;

    try {
      // Connect to Socket.IO server
      this.socket = io('http://localhost:3007', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      console.log('🔌 Socket.IO instance created');

      this.currentUser = {
        id: userId,
        name: userName,
        status: 'online'
      };

      console.log('👤 Current user set:', this.currentUser);

      // Set up event listeners
      this.setupEventListeners();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not initialized'));
          return;
        }

        let timeoutId: NodeJS.Timeout;

        this.socket.on('connect', () => {
          console.log('✅ Connected to WebSocket server');
          this.notifyConnectionStatus(true);
          
          // Clear the timeout since connection succeeded
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          
                // Send user info to server
      const userPublicKey = this.keyManagement.getUserPublicKey();
      console.log('🔑 Sending public key to server:', {
        keyLength: userPublicKey?.length || 0,
        keyStart: userPublicKey?.substring(0, 20) + '...',
        keyEnd: userPublicKey?.substring(userPublicKey?.length - 20)
      });
      
      this.socket?.emit('user:join', {
        userId: this.currentUser?.id,
        userName: this.currentUser?.name,
        publicKey: userPublicKey // Include public key for key exchange
      });
          
          resolve();
        });

        this.socket.on('connect_error', (error: Error) => {
          console.error('❌ WebSocket connection error:', error);
          // Clear the timeout since we got an error
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          reject(error);
        });

        // Timeout after 10 seconds
        timeoutId = setTimeout(() => {
          console.error('⏰ WebSocket connection timeout');
          this.isConnecting = false;
          reject(new Error('Connection timeout'));
        }, 10000);
      });

    } catch (error) {
      console.error('❌ Failed to connect to WebSocket server:', error);
      this.isConnecting = false;
      throw error;
    } finally {
      this.isConnecting = false;
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
    console.log('🔍 sendMessage called - Connection status:', {
      socketExists: !!this.socket,
      isConnected: this.socket?.connected,
      currentUser: this.currentUser
    });

    if (!this.socket?.connected) {
      console.error('❌ WebSocket not connected. Socket:', this.socket);
      throw new Error('Not connected to server');
    }

    try {
      // Encrypt the message
      const secureMessage = await this.secureChatService.sendEncryptedMessage(recipientId, messageText);
      
      // Create chat message for transmission
      const chatMessage: ChatMessage = {
        id: secureMessage.id,
        text: messageText, // Keep plain text for local display
        content: secureMessage.encryptedData.encryptedText, // Send encrypted content
        sender: this.currentUser?.id || 'unknown',
        recipient: recipientId,
        timestamp: Date.now(),
        isEncrypted: true
      };

      // Send to server with encrypted data and sender reference
      this.socket.emit('message:send', {
        ...chatMessage,
        encryptedContent: secureMessage.encryptedData.encryptedText,
        encryptedData: secureMessage.encryptedData,
        senderReference: (secureMessage as any).senderReference // Include sender reference if available
      });

      console.log(`📤 Message sent to ${recipientId}:`, messageText);
      
      // Return the message immediately for UI responsiveness
      // The server will send confirmation via 'message:sent' event
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

    // Handle message confirmation events
    this.socket.on('message:sent', (data: { messageId: string; timestamp: number }) => {
      console.log('✅ Message sent confirmation received:', data);
    });

    this.socket.on('message:error', (data: { error: string; originalMessage: any }) => {
      console.error('❌ Message send error from server:', data.error, data.originalMessage);
    });

    // Handle key exchange events
    this.socket.on('key:request', (data: { requester: string; requesterName: string; requesterPublicKey: string }) => {
      console.log('🔑 Key request received from:', data.requester);
      
      // Store the requester's public key
      this.keyManagement.storeContactKey(data.requester, data.requesterPublicKey);
      
      // Send our public key back
      const ourPublicKey = this.keyManagement.getUserPublicKey();
      if (ourPublicKey) {
        this.socket?.emit('key:response', {
          recipient: data.requester,
          sender: this.currentUser?.id,
          publicKey: ourPublicKey
        });
        console.log('🔑 Key response sent to:', data.requester);
      }
    });

    this.socket.on('key:response', (data: { sender: string; senderName: string; publicKey: string }) => {
      console.log('🔑 Key response received from:', data.sender);
      
      // Store the sender's public key
      this.keyManagement.storeContactKey(data.sender, data.publicKey);
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

  /**
   * Send a key request to another user
   */
  sendKeyRequest(recipientId: string): void {
    if (!this.socket?.connected) {
      console.error('WebSocket not connected, cannot send key request');
      return;
    }

    if (!this.currentUser?.id) {
      console.error('No current user, cannot send key request');
      return;
    }

    this.socket.emit('key:request', {
      recipient: recipientId,
      requester: this.currentUser.id
    });
    
    console.log(`🔑 Key request sent to ${recipientId}`);
  }
} 