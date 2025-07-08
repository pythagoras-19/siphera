import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = createServer(app);

// Configuration
const PORT = parseInt(process.env.PORT || '3007', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3005';

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: CORS_ORIGIN,
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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  // Handle chat messages
  socket.on('message:send', (data) => {
    console.log('Message received:', data);
    socket.broadcast.emit('message:received', data);
  });

  // Handle WebRTC signaling
  socket.on('webrtc:offer', (data) => {
    socket.broadcast.emit('webrtc:offer', data);
  });

  socket.on('webrtc:answer', (data) => {
    socket.broadcast.emit('webrtc:answer', data);
  });

  socket.on('webrtc:ice-candidate', (data) => {
    socket.broadcast.emit('webrtc:ice-candidate', data);
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