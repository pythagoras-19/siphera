import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatArea.css';
import { SecureChatService } from '../services/SecureChatService';
import { WebSocketService, ChatMessage } from '../services/WebSocketService';
import { MessageRetrievalService } from '../services/MessageRetrievalService';
import { useAuth } from '../contexts/AuthContext';

interface ChatAreaProps {
  selectedContact: string | null;
  onShowContacts?: () => void;
}



const ChatArea: React.FC<ChatAreaProps> = ({ selectedContact, onShowContacts }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [encryptionStatus, setEncryptionStatus] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const secureChatService = SecureChatService.getInstance();
  const webSocketService = WebSocketService.getInstance();
  const messageRetrievalService = MessageRetrievalService.getInstance();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Connect to WebSocket when component mounts (only once)
    const connectToWebSocket = async () => {
      console.log('🔍 User object for WebSocket connection:', {
        userId: user?.id,
        username: user?.username,
        email: user?.email,
        attributes: user?.attributes,
        isAuthenticated: !!user,
        userObject: user
      });
      
      // Use email as the primary identifier for WebSocket connection
      const userIdentifier = user?.email || user?.username || user?.id;
      
      if (!userIdentifier) {
        console.error('❌ No user identifier available for WebSocket connection');
        console.error('User object:', user);
        setIsConnected(false);
        return;
      }
      
      console.log('🔌 Attempting WebSocket connection with identifier:', userIdentifier);
      
      if (!webSocketService.isConnected()) {
        try {
          await webSocketService.connect(userIdentifier, userIdentifier);
          setIsConnected(true);
          console.log('✅ WebSocket connected successfully');
        } catch (error) {
          console.error('❌ Failed to connect to WebSocket:', error);
          setIsConnected(false);
        }
      } else {
        setIsConnected(true);
        console.log('✅ WebSocket already connected');
      }
    };

    connectToWebSocket();

    // Set up message listener
    const unsubscribe = webSocketService.onMessage(async (chatMessage: ChatMessage) => {
      // Only add messages for the currently selected contact
      if (selectedContact && 
          (chatMessage.sender === selectedContact || chatMessage.recipient === selectedContact)) {
        
        // Decrypt incoming message if it's encrypted
        let decryptedMessage = chatMessage;
        if (chatMessage.isEncrypted && chatMessage.content) {
          try {
            const decryptedText = await secureChatService.receiveEncryptedMessage(
              chatMessage.sender,
              {
                id: chatMessage.id || '',
                sender: chatMessage.sender,
                recipient: chatMessage.recipient,
                encryptedData: {
                  encryptedText: chatMessage.content,
                  iv: chatMessage.metadata?.iv || '',
                  salt: chatMessage.metadata?.salt || '',
                  timestamp: chatMessage.timestamp,
                  hmac: chatMessage.metadata?.hmac || ''
                },
                messageHash: '',
                timestamp: chatMessage.timestamp,
                isEncrypted: true
              }
            );
            
            decryptedMessage = {
              ...chatMessage,
              text: decryptedText,
              content: decryptedText
            };
          } catch (error) {
            console.error('Failed to decrypt incoming message:', error);
            decryptedMessage = {
              ...chatMessage,
              text: '[Encrypted Message - Decryption Failed]',
              content: '[Encrypted Message - Decryption Failed]'
            };
          }
        }
        
        setMessages(prev => [...prev, decryptedMessage]);
      }
    });

    // Set up connection status listener
    const unsubscribeConnection = webSocketService.onConnectionStatus((connected: boolean) => {
      setIsConnected(connected);
    });

    // Load existing chat history
    if (selectedContact) {
      loadChatHistory();
      checkEncryptionStatus();
    } else {
      setMessages([]);
      setIsEncrypted(false);
      setEncryptionStatus('');
    }

    // Cleanup on unmount
    return () => {
      unsubscribe();
      unsubscribeConnection();
    };
  }, [selectedContact, user]); // Re-run when user changes

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch messages from backend API
  const fetchMessages = async (senderId: string, recipientId: string) => {
    const response = await fetch(
      `http://localhost:3007/api/messages/${senderId}/${recipientId}`
    );
    const data = await response.json();
    return data.messages;
  };

  // Update loadChatHistory to use MessageRetrievalService for proper sender/recipient decryption
  const loadChatHistory = async () => {
    // Use email as the primary identifier for message fetching
    const userIdentifier = user?.email || user?.username;
    
    if (!selectedContact || !userIdentifier) return;
    setIsLoading(true);
    try {
      console.log('🔍 Fetching messages for:', {
        username: user?.username,
        userId: user?.id,
        email: user?.email,
        userIdentifier,
        selectedContact
      });
      
      // The backend getMessages function fetches messages in both directions when called with senderId and recipientId
      // But we need to ensure we get all messages by calling it with the current user as the first parameter
      const rawMessages = await fetchMessages(userIdentifier, selectedContact);
      
      console.log('Fetched raw messages:', {
        total: rawMessages.length,
        messages: rawMessages.map((msg: any) => ({
          messageId: msg.messageId,
          senderId: msg.senderId,
          recipientId: msg.recipientId,
          hasEncryptedData: !!msg.encryptedData,
          hasSenderReference: !!msg.senderReference
        }))
      });
      
      // Debug: Check if our test message is in the fetched messages
      const testMessage = rawMessages.find((msg: any) => 
        msg.senderId === 'mattchristiansenresearch@gmail.com' && 
        msg.recipientId === 'siphera.us@gmail.com'
      );
      if (testMessage) {
        console.log('✅ Found test message:', {
          messageId: testMessage.messageId,
          content: testMessage.content,
          senderId: testMessage.senderId,
          recipientId: testMessage.recipientId
        });
      } else {
        console.log('❌ Test message not found in fetched messages');
      }
      
      // Use MessageRetrievalService to decrypt messages based on sender/recipient role
      const decryptedMessages = await messageRetrievalService.decryptMessages(rawMessages);
      console.log('Decrypted messages:', decryptedMessages);
      
      // Convert to ChatMessage format for display and sort by timestamp (oldest first)
      const chatMessages: ChatMessage[] = decryptedMessages
        .map(msg => ({
          id: msg.messageId,
          sender: msg.senderId,
          recipient: msg.recipientId,
          text: msg.content,
          content: msg.content,
          timestamp: msg.timestamp,
          isEncrypted: msg.isEncrypted,
          metadata: {
            isSentByMe: msg.isSentByMe,
            canRead: msg.canRead
          }
        }))
        .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp ascending (oldest first)
      
      setMessages(chatMessages);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkEncryptionStatus = () => {
    if (!selectedContact) return;
    
    const encrypted = secureChatService.isContactEncrypted(selectedContact);
    setIsEncrypted(encrypted);
    setEncryptionStatus(encrypted ? '🔒 End-to-End Encrypted' : '🔓 Standard Chat');
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedContact || !isConnected) return;

    setIsLoading(true);
    try {
      // Send message via WebSocket
      const chatMessage = await webSocketService.sendMessage(selectedContact, message.trim());
      
      // For sent messages, use the plain text that's already available
      // The WebSocketService.sendMessage() returns a ChatMessage with:
      // - text: plain text for local display
      // - content: encrypted content for transmission
      const displayMessage = {
        ...chatMessage,
        text: chatMessage.text || message.trim(), // Use plain text for display
        content: chatMessage.text || message.trim() // Also set content to plain text for consistency
      };
      
      console.log('✅ Message sent successfully:', displayMessage.text);
      
      // Add message to local state with plain text
      setMessages(prev => [...prev, displayMessage]);
      setMessage('');
      
      // Update encryption status if needed
      if (!isEncrypted) {
        checkEncryptionStatus();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleBrowseContacts = () => {
    navigate('/contacts');
  };

  if (!selectedContact) {
    return (
      <div className="chat-area">
        <div className="no-chat-selected">
          <div className="no-chat-icon">💬</div>
          <h2>Welcome to Siphera</h2>
          <p>Select a contact to start chatting</p>
          <button className="show-contacts-btn" onClick={handleBrowseContacts}>
            Browse Contacts
          </button>
          <div className="security-info">
            <p>🔐 All messages are end-to-end encrypted</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <div className="chat-header">
        <div className="contact-info">
          <div className="contact-avatar">
            <span className="avatar-text">{selectedContact.charAt(0).toUpperCase()}</span>
          </div>
          <div className="contact-details">
            <h3 className="contact-name">{selectedContact}</h3>
            <div className="contact-status-row">
              <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </span>
              <span className={`encryption-status ${isEncrypted ? 'encrypted' : 'standard'}`}>
                {encryptionStatus}
              </span>
            </div>
          </div>
        </div>
        <div className="chat-actions">
          <button className="action-btn" title="Voice Call">📞</button>
          <button className="action-btn" title="Video Call">📹</button>
          <button className="action-btn" title="More Options">⋮</button>
        </div>
      </div>

      <div className="messages-container">
        {isLoading && (
          <div className="loading-indicator">
            <div className="loading-spinner"></div>
            <span>Loading secure messages...</span>
          </div>
        )}
        
        <div className="messages">
          {messages.length === 0 && !isLoading && (
            <div className="no-messages">No messages</div>
          )}
          {messages.map((msg, idx) => {
            // Use the metadata from MessageRetrievalService to determine if it's our message
            const isOwnMessage = msg.metadata?.isSentByMe || 
              msg.sender === user?.username || 
              msg.sender === user?.email;
            const canRead = msg.metadata?.canRead !== false; // Default to true if not specified
            
            return (
              <div key={`${msg.messageId || msg.id || 'msg'}-${idx}`} className={`message ${isOwnMessage ? 'me' : 'them'}`}>
                <div className="message-content">
                  <p className={!canRead ? 'message-unreadable' : ''}>
                    {msg.text || msg.content}
                  </p>
                  <div className="message-meta">
                    <span className="message-time">{formatTime(msg.timestamp)}</span>
                    {msg.isEncrypted && (
                      <span className="encryption-indicator" title="End-to-End Encrypted">
                        🔒
                      </span>
                    )}
                    {isOwnMessage && (
                      <span className="sent-indicator" title="Sent by you">
                        ✓
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="message-input-container">
        <div className="message-input-wrapper">
          <textarea
            className="message-input"
            placeholder={isEncrypted ? "Type a secure message..." : "Type a message..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
            disabled={isLoading}
          />
          <button 
            className={`send-btn ${isLoading ? 'loading' : ''}`} 
            onClick={handleSendMessage}
            disabled={isLoading}
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </div>
        <div className="security-notice">
          <span className="security-icon">🔐</span>
          <span className="security-text">
            {isConnected 
              ? (isEncrypted ? 'Messages are end-to-end encrypted' : 'Setting up secure connection...')
              : 'Connecting to server...'
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatArea; 