import React, { useState } from 'react';
import './ChatArea.css';

interface ChatAreaProps {
  selectedContact: string | null;
}

const ChatArea: React.FC<ChatAreaProps> = ({ selectedContact }) => {
  const [message, setMessage] = useState('');
  const [messages] = useState([
    { id: 1, text: 'Hey! How are you doing?', sender: 'them', timestamp: '10:30 AM' },
    { id: 2, text: 'I\'m doing great! Just working on the new project.', sender: 'me', timestamp: '10:32 AM' },
    { id: 3, text: 'That sounds exciting! Can\'t wait to see it.', sender: 'them', timestamp: '10:33 AM' },
    { id: 4, text: 'Thanks! I\'ll share it with you once it\'s ready.', sender: 'me', timestamp: '10:35 AM' },
  ]);

  const handleSendMessage = () => {
    if (message.trim()) {
      // In a real app, this would send the message
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!selectedContact) {
    return (
      <div className="chat-area">
        <div className="no-chat-selected">
          <div className="no-chat-icon">💬</div>
          <h2>Welcome to Siphera</h2>
          <p>Select a contact to start chatting</p>
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
            <span className="contact-status">Online</span>
          </div>
        </div>
        <div className="chat-actions">
          <button className="action-btn">📞</button>
          <button className="action-btn">📹</button>
          <button className="action-btn">⋮</button>
        </div>
      </div>

      <div className="messages-container">
        <div className="messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.sender}`}>
              <div className="message-content">
                <p>{msg.text}</p>
                <span className="message-time">{msg.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="message-input-container">
        <div className="message-input-wrapper">
          <textarea
            className="message-input"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
          />
          <button className="send-btn" onClick={handleSendMessage}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea; 