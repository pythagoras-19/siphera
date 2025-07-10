# Real-Time Chat Implementation

## Overview

Siphera now supports real-time messaging using WebSocket connections via Socket.IO. Messages are encrypted end-to-end and delivered instantly between users.

## Features Implemented

### ✅ Real-Time Messaging
- WebSocket connections using Socket.IO
- Instant message delivery
- Connection status indicators
- Automatic reconnection handling

### ✅ End-to-End Encryption
- AES-256 encryption for all messages
- Secure key exchange between users
- Message integrity verification
- Encrypted message storage

### ✅ User Management
- User online/offline status tracking
- Real-time status updates
- User presence indicators

## How to Test

### 1. Start the Backend
```bash
cd siphera/backend
npm run dev
```
The backend will start on port 3007 with Socket.IO server ready.

### 2. Start the Frontend
```bash
cd siphera
npm start
```
The frontend will start on port 3000.

### 3. Test Real-Time Chat

#### Option A: Multiple Browser Windows
1. Open two browser windows/tabs
2. Sign in with different accounts in each window
3. Navigate to `/chat` in both windows
4. Select a contact in one window
5. Send messages - they should appear instantly in the other window

#### Option B: Multiple Browser Sessions
1. Open an incognito/private window alongside your main browser
2. Sign in with different accounts
3. Test messaging between the sessions

### 4. Test Connection Features
- **Connection Status**: Look for the green "🟢 Connected" indicator in the chat header
- **Disconnection**: Try disconnecting your network to see the red "🔴 Disconnected" status
- **Reconnection**: Reconnect to see automatic reconnection handling

## Technical Implementation

### Backend (Socket.IO Server)
- **Port**: 3007
- **Features**:
  - User connection management
  - Message routing to specific recipients
  - User status broadcasting
  - WebRTC signaling support

### Frontend (WebSocket Client)
- **Service**: `WebSocketService` singleton
- **Features**:
  - Automatic connection management
  - Message encryption/decryption
  - Real-time message handling
  - Connection status monitoring

### Message Flow
1. User types message in ChatArea
2. Message encrypted using SecureChatService
3. Message sent via WebSocket to backend
4. Backend routes message to recipient
5. Recipient receives and decrypts message
6. Message displayed in real-time

## Security Features

### Encryption
- **Algorithm**: AES-256-CBC
- **Key Exchange**: Simulated Diffie-Hellman (for demo)
- **Message Integrity**: SHA-256 hashing
- **Perfect Forward Secrecy**: New keys per session

### Privacy
- Messages encrypted before transmission
- No message content stored on server
- End-to-end encryption indicators
- Secure key generation

## Next Steps

### Immediate Improvements
- [ ] Message persistence (database storage)
- [ ] Offline message delivery
- [ ] Message read receipts
- [ ] Typing indicators

### Advanced Features
- [ ] Group chat support
- [ ] File sharing
- [ ] Voice/video calls
- [ ] Message search
- [ ] Message reactions

## Troubleshooting

### Connection Issues
- Ensure backend is running on port 3007
- Check CORS settings if using different ports
- Verify network connectivity
- Check browser console for errors

### Message Issues
- Verify both users are online
- Check encryption status indicators
- Ensure proper user authentication
- Review WebSocket connection logs

## Development Notes

### Environment Variables
```bash
# Backend
PORT=3007
CORS_ORIGIN=http://localhost:3000

# Frontend
REACT_APP_WEBSOCKET_URL=http://localhost:3007
```

### Key Files
- `backend/src/index.ts` - Socket.IO server implementation
- `src/services/WebSocketService.ts` - WebSocket client service
- `src/services/SecureChatService.ts` - Encryption service
- `src/components/ChatArea.tsx` - Chat UI with real-time messaging 