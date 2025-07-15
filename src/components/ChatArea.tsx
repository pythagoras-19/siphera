import React, { useState, useEffect } from 'react';
import './ChatArea.css';
import { SecureChatService } from '../services/SecureChatService';
import { WebSocketService, ChatMessage } from '../services/WebSocketService';
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

  const secureChatService = SecureChatService.getInstance();
  const webSocketService = WebSocketService.getInstance();
  const { user } = useAuth();

  useEffect(() => {
    // Connect to WebSocket when component mounts (only once)
    const connectToWebSocket = async () => {
      if (user?.username && !webSocketService.isConnected()) {
        try {
          await webSocketService.connect(user.username, user.username);
          setIsConnected(true);
        } catch (error) {
          console.error('Failed to connect to WebSocket:', error);
          setIsConnected(false);
        }
      } else if (webSocketService.isConnected()) {
        setIsConnected(true);
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
  }, [selectedContact]); // Removed user?.username dependency

  // Fetch messages from backend API
  const fetchMessages = async (senderId: string, recipientId: string) => {
    const response = await fetch(
      `http://localhost:3007/api/messages/${senderId}/${recipientId}`
    );
    const data = await response.json();
    return data.messages;
  };

  // Update loadChatHistory to use fetchMessages and decrypt them
  const loadChatHistory = async () => {
    if (!selectedContact || !user?.username) return;
    setIsLoading(true);
    try {
      console.log('Fetching messages for:', user?.username, selectedContact);
      // Fetch messages between current user and selected contact
      const encryptedMsgs = await fetchMessages(user.username, selectedContact);
      console.log('Fetched encrypted messages:', encryptedMsgs);
      
      // Decrypt messages using SecureChatService
      const decryptedMsgs = await Promise.all(
        encryptedMsgs.map(async (msg: any) => {
          try {
            if (msg.isEncrypted && msg.content) {
              // Decrypt the message content
              const decryptedText = await secureChatService.receiveEncryptedMessage(
                msg.sender || msg.senderId || '',
                {
                  id: msg.messageId || msg.id || '',
                  sender: msg.sender || msg.senderId || '',
                  recipient: msg.recipient || msg.recipientId || '',
                  encryptedData: {
                    encryptedText: msg.content,
                    iv: msg.metadata?.iv || '',
                    timestamp: msg.timestamp,
                    hmac: msg.metadata?.hmac || ''
                  },
                  messageHash: '',
                  timestamp: msg.timestamp,
                  isEncrypted: true
                }
              );
              
              return {
                ...msg,
                text: decryptedText,
                content: decryptedText
              };
            } else {
              // Message is not encrypted, use content as-is
              return {
                ...msg,
                text: msg.content || msg.text || '',
                content: msg.content || msg.text || ''
              };
            }
          } catch (error) {
            console.error('Failed to decrypt message:', error);
            return {
              ...msg,
              text: '[Encrypted Message - Decryption Failed]',
              content: '[Encrypted Message - Decryption Failed]'
            };
          }
        })
      );
      
      setMessages(decryptedMsgs || []);
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
      
      // Add message to local state
      setMessages(prev => [...prev, chatMessage]);
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

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!selectedContact) {
    return (
      <div className="chat-area">
        <div className="no-chat-selected">
          <div className="no-chat-icon">💬</div>
          <h2>Welcome to Siphera</h2>
          <p>Select a contact to start chatting</p>
          {onShowContacts && (
            <button className="show-contacts-btn" onClick={onShowContacts}>
              Browse Contacts
            </button>
          )}
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
            // Debug log to see what we're comparing
            console.log('Message comparison:', { 
              msgSenderId: msg.senderId, 
              msgSender: msg.sender,
              userUsername: user?.username, 
              userID: user?.id 
            });
            
            // Handle both backend (senderId) and frontend (sender) field names
            const messageSender = msg.sender || msg.senderId;
            const isOwnMessage = messageSender === user?.username;
            
            return (
              <div key={msg.messageId || msg.id || idx} className={`message ${isOwnMessage ? 'me' : 'them'}`}>
                <div className="message-content">
                  <p>{msg.text || msg.content}</p>
                  <div className="message-meta">
                    <span className="message-time">{formatTime(msg.timestamp)}</span>
                    {msg.isEncrypted && (
                      <span className="encryption-indicator" title="End-to-End Encrypted">
                        🔒
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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