import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { userService } from './services/UserService';
import { dynamoDBService } from './services/DynamoDBService';
import { securityConfig } from './config/security';

// Load environment variables and validate configuration
console.log('Backend starting...');
console.log('Environment:', securityConfig.server.nodeEnv);
console.log('AWS Region:', securityConfig.aws.region);

// Create Express app
const app = express();
const server = createServer(app);

// Configuration
const PORT = securityConfig.server.port;
const CORS_ORIGIN = securityConfig.server.corsOrigin;

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: [CORS_ORIGIN, 'http://localhost:3001', 'http://localhost:3005'], // Allow multiple common dev ports
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: [CORS_ORIGIN, 'http://localhost:3001', 'http://localhost:3005'],
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Siphera Backend',
    version: '1.0.0',
  });
});

// Store connected users
const connectedUsers = new Map<string, { socketId: string; userId: string; userName: string; publicKey?: string }>();

// API Routes for user management
app.get('/api/users', async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    return res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

app.get('/api/users/:userId', async (req, res) => {
  try {
    const user = await userService.getUserByCognitoId(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    return res.json({ success: true, user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

app.get('/api/users/:userId/contacts', async (req, res) => {
  try {
    const contacts = await userService.getUserContacts(req.params.userId);
    return res.json({ success: true, contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch contacts' });
  }
});

app.post('/api/users/:userId/contacts', async (req, res) => {
  try {
    const { contactId } = req.body;
    await userService.addContact(req.params.userId, contactId);
    return res.json({ success: true, message: 'Contact added successfully' });
  } catch (error) {
    console.error('Error adding contact:', error);
    return res.status(500).json({ success: false, error: 'Failed to add contact' });
  }
});

app.delete('/api/users/:userId/contacts/:contactId', async (req, res) => {
  try {
    await userService.removeContact(req.params.userId, req.params.contactId);
    return res.json({ success: true, message: 'Contact removed successfully' });
  } catch (error) {
    console.error('Error removing contact:', error);
    return res.status(500).json({ success: false, error: 'Failed to remove contact' });
  }
});

app.get('/api/users/search/:query', async (req, res) => {
  try {
    const currentUserId = req.query.currentUserId as string;
    if (!currentUserId) {
      return res.status(400).json({ success: false, error: 'currentUserId is required' });
    }
    
    const users = await userService.searchUsers(req.params.query, currentUserId);
    return res.json({ success: true, users });
  } catch (error) {
    console.error('Error searching users:', error);
    return res.status(500).json({ success: false, error: 'Failed to search users' });
  }
});

app.put('/api/users/:userId/status', async (req, res) => {
  try {
    const { status } = req.body;
    await userService.updateUserStatus(req.params.userId, status);
    return res.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

app.put('/api/users/:userId/profile', async (req, res) => {
  try {
    const updates = req.body;
    await userService.updateUserProfile(req.params.userId, updates);
    return res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

app.post('/api/users', async (req, res) => {
  console.log('Received POST /api/users with body:', req.body);
  try {
    const { username, email, givenName, familyName, phoneNumber } = req.body;
    if (!username || !email) {
      res.status(400).json({ success: false, error: 'username and email are required' });
      return;
    }
    // Use username as userId for simplicity (replace with Cognito ID if available)
    const userId = username;
    const now = Date.now();
    const newUser = {
      userId,
      username,
      email,
      displayName: `${givenName || ''} ${familyName || ''}`.trim() || username,
      status: 'offline' as 'offline',
      lastSeen: now,
      createdAt: now,
      updatedAt: now,
      contacts: [],
      discoverable: true,
      givenName,
      familyName,
      phoneNumber,
    };
    await dynamoDBService.createUser(newUser);
    console.log(`👤 User created via API: ${username} (${userId})`);
    res.json({ success: true });
    return;
  } catch (error: any) {
    console.error('Error creating user via API:', error);
    if (error && error.stack) {
      console.error('Error stack:', error.stack);
    }
    console.error('Request body was:', req.body);
    res.status(500).json({ success: false, error: 'Failed to create user', details: error && error.message ? error.message : String(error) });
    return;
  }
});

// Message management endpoints
app.get('/api/messages/:senderId/:recipientId', async (req, res) => {
  try {
    const { senderId, recipientId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = await dynamoDBService.getMessages(senderId, recipientId, limit);
    return res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

app.put('/api/messages/:messageId/read', async (req, res) => {
  try {
    await dynamoDBService.markMessageAsRead(req.params.messageId);
    return res.json({ success: true, message: 'Message marked as read' });
  } catch (error) {
    console.error('Error marking message as read:', error);
    return res.status(500).json({ success: false, error: 'Failed to mark message as read' });
  }
});

// Chat session management
app.post('/api/sessions', async (req, res) => {
  try {
    const { participants } = req.body;
    const session = await dynamoDBService.createChatSession(participants);
    return res.json({ success: true, session });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return res.status(500).json({ success: false, error: 'Failed to create chat session' });
  }
});

app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const session = await dynamoDBService.getChatSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    return res.json({ success: true, session });
  } catch (error) {
    console.error('Error fetching chat session:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch chat session' });
  }
});

app.get('/api/users/:userId/sessions', async (req, res) => {
  try {
    const sessions = await dynamoDBService.getUserChatSessions(req.params.userId);
    return res.json({ success: true, sessions });
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch user sessions' });
  }
});

app.get('/api/contacts', async (req, res) => {
  try {
    const currentUserId = req.query.currentUserId as string;
    if (!currentUserId) {
      return res.status(400).json({ success: false, error: 'currentUserId is required' });
    }
    // Log access
    console.log(`[CONTACTS] userId=${currentUserId} ip=${req.ip} at=${new Date().toISOString()}`);
    const users = await userService.getAllDiscoverableUsers(currentUserId);
    return res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching discoverable contacts:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch contacts' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle user joining
  socket.on('user:join', async (data: { userId: string; userName: string; publicKey?: string }) => {
    console.log('User joined:', data);
    
    try {
      // Update user status in DynamoDB
      await userService.updateUserStatus(data.userId, 'online');
      
      // Store user info
      connectedUsers.set(data.userId, {
        socketId: socket.id,
        userId: data.userId,
        userName: data.userName,
        publicKey: data.publicKey
      });

      // Join user to their personal room
      socket.join(`user:${data.userId}`);
      
      // Broadcast user status to all clients
      io.emit('user:status', {
        id: data.userId,
        name: data.userName,
        status: 'online',
        lastSeen: Date.now(),
        publicKey: data.publicKey
      });

      console.log(`👤 ${data.userName} (${data.userId}) joined the chat`);
    } catch (error) {
      console.error('Error handling user join:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    
    // Find and remove user
    let disconnectedUser = null;
    for (const [userId, userInfo] of connectedUsers.entries()) {
      if (userInfo.socketId === socket.id) {
        disconnectedUser = userInfo;
        connectedUsers.delete(userId);
        break;
      }
    }

    if (disconnectedUser) {
      try {
        // Update user status in DynamoDB
        await userService.updateUserStatus(disconnectedUser.userId, 'offline');
        
        // Broadcast user offline status
        io.emit('user:status', {
          id: disconnectedUser.userId,
          name: disconnectedUser.userName,
          status: 'offline',
          lastSeen: Date.now()
        });

        console.log(`👤 ${disconnectedUser.userName} (${disconnectedUser.userId}) left the chat`);
      } catch (error) {
        console.error('Error handling user disconnect:', error);
      }
    }
  });

  // Handle chat messages
  socket.on('message:send', async (data: any) => {
    console.log('Message received:', data);
    
    try {
      // Save message to DynamoDB - only store encrypted content
      const message = await dynamoDBService.saveMessage({
        senderId: data.sender,
        recipientId: data.recipient,
        content: data.encryptedContent || data.encryptedData?.encryptedText || '', // Store only encrypted content
        encryptedContent: data.encryptedContent || data.encryptedData?.encryptedText || '',
        timestamp: Date.now(),
        isEncrypted: true, // Always true for E2E encryption
        isRead: false,
        messageType: data.messageType || 'text',
        metadata: {
          iv: data.encryptedData?.iv || '',
          hmac: data.encryptedData?.hmac || '',
          ...data.metadata
        },
      });

      // Route message to specific recipient
      const recipientUser = connectedUsers.get(data.recipient);
      if (recipientUser) {
        // Send to recipient's room
        io.to(`user:${data.recipient}`).emit('message:received', {
          ...data,
          messageId: message.messageId,
        });
        console.log(`📤 Message routed to ${recipientUser.userName} (${data.recipient})`);
      } else {
        // Recipient not online, message stored in DynamoDB for later delivery
        console.log(`📤 Recipient ${data.recipient} not online, message stored for later delivery`);
      }

      // Send confirmation back to sender
      socket.emit('message:sent', {
        messageId: message.messageId,
        timestamp: message.timestamp,
      });
    } catch (error) {
      console.error('Error handling message:', error);
      socket.emit('message:error', {
        error: 'Failed to send message',
        originalMessage: data,
      });
    }
  });

  // Handle key exchange
  socket.on('key:request', (data: { recipient: string; requester: string }) => {
    const recipientUser = connectedUsers.get(data.recipient);
    const requesterUser = connectedUsers.get(data.requester);
    
    if (recipientUser && requesterUser) {
      // Send key request to recipient
      io.to(`user:${data.recipient}`).emit('key:request', {
        requester: data.requester,
        requesterName: requesterUser.userName,
        requesterPublicKey: requesterUser.publicKey
      });
      console.log(`🔑 Key request sent from ${data.requester} to ${data.recipient}`);
    }
  });

  socket.on('key:response', (data: { recipient: string; sender: string; publicKey: string }) => {
    const recipientUser = connectedUsers.get(data.recipient);
    
    if (recipientUser) {
      // Send public key response to requester
      io.to(`user:${data.recipient}`).emit('key:response', {
        sender: data.sender,
        senderName: connectedUsers.get(data.sender)?.userName,
        publicKey: data.publicKey
      });
      console.log(`🔑 Key response sent from ${data.sender} to ${data.recipient}`);
    }
  });

  // Handle WebRTC signaling
  socket.on('webrtc:offer', (data) => {
    const recipientUser = connectedUsers.get(data.recipient);
    if (recipientUser) {
      io.to(`user:${data.recipient}`).emit('webrtc:offer', data);
    }
  });

  socket.on('webrtc:answer', (data) => {
    const recipientUser = connectedUsers.get(data.recipient);
    if (recipientUser) {
      io.to(`user:${data.recipient}`).emit('webrtc:answer', data);
    }
  });

  socket.on('webrtc:ice-candidate', (data) => {
    const recipientUser = connectedUsers.get(data.recipient);
    if (recipientUser) {
      io.to(`user:${data.recipient}`).emit('webrtc:ice-candidate', data);
    }
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Siphera Backend running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for WebRTC signaling`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app; 