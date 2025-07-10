# 🛠️ Siphera - Secure Unified Communications Platform

A modern, WebRTC-first, end-to-end encrypted UCaaS platform with real-time messaging, voice, and video capabilities.

## 🚀 Features

- **🔐 End-to-End Encryption**: All messages and calls are encrypted using Signal Protocol
- **💬 Real-Time Messaging**: Instant messaging with message persistence
- **📞 WebRTC Voice/Video**: High-quality peer-to-peer communication
- **👥 User Management**: Complete user profiles, contacts, and status tracking
- **🌐 Cross-Platform**: Web app with mobile support planned
- **☁️ Cloud-Native**: Built on AWS with DynamoDB for scalability

## 🏗️ Architecture

### Backend Stack
- **Node.js** with TypeScript
- **Express.js** for REST APIs
- **Socket.IO** for real-time communication
- **AWS DynamoDB** for data persistence
- **AWS Cognito** for authentication
- **Docker** for containerization

### Frontend Stack
- **React** with TypeScript
- **React Router** for navigation
- **AWS Amplify** for authentication
- **Socket.IO Client** for real-time features
- **CSS Modules** for styling

## 📊 User Management System

Siphera includes a comprehensive user management system built on AWS DynamoDB:

### Database Schema

#### Users Table (`siphera-users-{env}`)
- `userId` (Primary Key): Cognito user ID
- `username`: Unique username
- `email`: User email address
- `displayName`: Display name
- `avatar`: Profile picture URL
- `status`: online/offline/away
- `lastSeen`: Last activity timestamp
- `contacts`: Array of contact user IDs
- `publicKey`: Public encryption key
- `createdAt`/`updatedAt`: Timestamps

#### Messages Table (`siphera-messages-{env}`)
- `messageId` (Primary Key): Unique message identifier
- `senderId`: Sender's user ID
- `recipientId`: Recipient's user ID
- `content`: Plain text content
- `encryptedContent`: Encrypted message content
- `timestamp`: Message timestamp
- `isEncrypted`: Encryption flag
- `isRead`: Read status
- `messageType`: text/file/image/voice
- `metadata`: Additional message data

#### Sessions Table (`siphera-sessions-{env}`)
- `sessionId` (Primary Key): Chat session identifier
- `participants`: Array of participant user IDs
- `lastMessageId`: Last message in session
- `lastMessageTime`: Last message timestamp
- `createdAt`/`updatedAt`: Timestamps

### API Endpoints

#### User Management
- `GET /api/users` - Get all users
- `GET /api/users/:userId` - Get user by ID
- `GET /api/users/:userId/contacts` - Get user's contacts
- `POST /api/users/:userId/contacts` - Add contact
- `DELETE /api/users/:userId/contacts/:contactId` - Remove contact
- `GET /api/users/search/:query` - Search users
- `PUT /api/users/:userId/status` - Update user status
- `PUT /api/users/:userId/profile` - Update user profile

#### Message Management
- `GET /api/messages/:senderId/:recipientId` - Get messages between users
- `PUT /api/messages/:messageId/read` - Mark message as read

#### Chat Sessions
- `POST /api/sessions` - Create chat session
- `GET /api/sessions/:sessionId` - Get session details
- `GET /api/users/:userId/sessions` - Get user's sessions

### Real-Time Features

#### Socket.IO Events
- `user:join` - User connects to chat
- `user:status` - User status updates
- `message:send` - Send message
- `message:received` - Receive message
- `message:sent` - Message delivery confirmation
- `message:error` - Message error
- `webrtc:offer` - WebRTC offer
- `webrtc:answer` - WebRTC answer
- `webrtc:ice-candidate` - WebRTC ICE candidate

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- AWS CLI configured
- AWS account with DynamoDB and Cognito access

### 1. Clone and Setup
```bash
git clone <repository-url>
cd siphera
cp env.example .env
# Edit .env with your AWS credentials and configuration
```

### 2. Deploy DynamoDB Tables
```bash
# Deploy DynamoDB tables using CloudFormation
./scripts/deploy-dynamodb.sh dev us-east-1
```

### 3. Start Development Environment
```bash
# Start backend and frontend with Docker
docker-compose -f docker-compose.dev.yml up --build
```

### 4. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:3007
- Health Check: http://localhost:3007/health

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
# Server Configuration
PORT=3007
CORS_ORIGIN=http://localhost:3000

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# AWS Cognito Configuration
COGNITO_USER_POOL_ID=your_user_pool_id_here
COGNITO_IDENTITY_POOL_ID=your_identity_pool_id_here
COGNITO_CLIENT_ID=your_client_id_here

# DynamoDB Table Names
USERS_TABLE=siphera-users-dev
MESSAGES_TABLE=siphera-messages-dev
SESSIONS_TABLE=siphera-sessions-dev
```

#### Frontend (.env)
```bash
# API Configuration
REACT_APP_API_URL=http://localhost:3007
REACT_APP_WEBSOCKET_URL=ws://localhost:3007

# Amplify Configuration
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=your_user_pool_id_here
REACT_APP_USER_POOL_WEB_CLIENT_ID=your_client_id_here
REACT_APP_IDENTITY_POOL_ID=your_identity_pool_id_here
```

## 🧪 Testing

### Manual Testing
1. **User Registration**: Sign up with email and password
2. **User Login**: Sign in and verify authentication
3. **Real-Time Chat**: Send messages between users
4. **User Status**: Verify online/offline status updates
5. **Contact Management**: Add/remove contacts
6. **Message Persistence**: Verify messages are stored and retrieved

### API Testing
```bash
# Test health endpoint
curl http://localhost:3007/health

# Test user endpoints (requires authentication)
curl http://localhost:3007/api/users
```

## 📈 Production Deployment

### 1. Deploy Infrastructure
```bash
# Deploy DynamoDB tables for production
./scripts/deploy-dynamodb.sh prod us-east-1

# Deploy to AWS ECS/Fargate or similar
docker-compose -f docker-compose.yml up -d
```

### 2. Configure Domain and SSL
- Set up custom domain
- Configure SSL certificates
- Update CORS settings

### 3. Monitoring and Logging
- Set up CloudWatch monitoring
- Configure application logging
- Set up error tracking (Sentry)

## 🔒 Security Features

- **End-to-End Encryption**: All messages encrypted client-side
- **JWT Authentication**: Secure token-based authentication
- **CORS Protection**: Configured CORS policies
- **Input Validation**: Server-side validation for all inputs
- **Rate Limiting**: API rate limiting (to be implemented)
- **Audit Logging**: User activity logging (to be implemented)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

## 🛠️ Product Timeline

A modern, WebRTC-first, end-to-end encrypted UCaaS platform.

⸻

## 🚀 Phase 0: Foundation (Month 0–1)

**Goal:** Lay the infrastructure and cryptographic groundwork.
- Finalize architecture, stack, and feature scope
- Register domains and create brand assets
- Deploy AWS infrastructure (IAM, Cognito, S3, Lambda)
- Set up TURN/STUN (coturn or Twilio ICE)
- Build WebSocket signaling server (Node.js or Go)
- Choose E2EE approach (WebRTC + Signal Protocol)
- Scaffold React + React Native apps

⸻

## 🎯 Phase 1: MVP Launch (Months 2–4)

**Goal:** Deliver 1:1 encrypted voice, video, and messaging.
- Secure auth (JWT-based via Cognito/Auth0)
- Encrypted 1:1 voice & video using WebRTC (DTLS/SRTP)
- Encrypted 1:1 chat using Signal Protocol
- Push notifications (SNS/Firebase)
- File upload to S3 (with lifecycle policies)
- Basic React web app
- Basic React Native mobile app
- Internal alpha testing & bug fixes

⸻

## 🌱 Phase 2: Teams & Enterprise Beta (Months 5–8)

**Goal:** Enable secure collaboration at scale.
- Org and user provisioning (multi-tenant)
- Group chat and mentions
- Threaded messaging
- Group voice/video (via LiveKit or Mediasoup)
- Admin Portal v1 (user roles, org config)
- MFA and device management
- Offline messaging & retry queue
- Closed beta with pilot customers

⸻

## 🏛️ Phase 3: Enterprise UCaaS (Months 9–12)

**Goal:** Full enterprise compliance, scalability, and launch.
- SIP gateway integration for E911 (Twilio/Kamailio)
- E911 dispatch logic (location mapping, alerts)
- Call recording + transcription (S3 + Transcribe)
- Admin Portal v2 (RBAC, logs, billing)
- SCIM + SSO (SAML, OIDC)
- Stripe billing integration
- Calendar integrations (Google, Outlook)
- Public launch + investor/pitch deck

⸻

## 📅 Milestone Summary

| Month | Deliverable |
|-------|-------------|
| 1 | Infra, auth, E2EE core |
| 3 | MVP: 1:1 voice/video/chat |
| 5 | Beta: group features, admin panel |
| 8 | Enterprise controls, E911 integration |
| 12 | Public launch, full platform readiness |

⸻

This file is part of the core documentation for the Siphera GitHub repository. Stay lean, build secure, and scale smart.
