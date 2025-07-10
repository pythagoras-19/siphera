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
    // Connect to WebSocket when component mounts
    const connectToWebSocket = async () => {
      if (user?.username) {
        try {
          await webSocketService.connect(user.username, user.username);
          setIsConnected(true);
        } catch (error) {
          console.error('Failed to connect to WebSocket:', error);
          setIsConnected(false);
        }
      }
    };

    connectToWebSocket();

    // Set up message listener
    const unsubscribe = webSocketService.onMessage((chatMessage: ChatMessage) => {
      // Only add messages for the currently selected contact
      if (selectedContact && 
          (chatMessage.sender === selectedContact || chatMessage.recipient === selectedContact)) {
        setMessages(prev => [...prev, chatMessage]);
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
  }, [selectedContact, user?.username]);

  const loadChatHistory = async () => {
    if (!selectedContact) return;
    
    setIsLoading(true);
    try {
      // For now, we'll start with empty history since we're using real-time messaging
      // In a real app, you'd load from a database
      setMessages([]);
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
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.sender === user?.username ? 'sent' : 'received'}`}>
              <div className="message-content">
                <p>{msg.text}</p>
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
          ))}
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