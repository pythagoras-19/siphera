import React, { useState } from 'react';
import './ContactList.css';

interface ContactListProps {
  onContactSelect: (contact: string) => void;
}

const ContactList: React.FC<ContactListProps> = ({ onContactSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts] = useState([
    { id: 1, name: 'Alice Johnson', status: 'online', lastMessage: 'Hey, how are you?', time: '2 min ago' },
    { id: 2, name: 'Bob Smith', status: 'offline', lastMessage: 'Thanks for the help!', time: '1 hour ago' },
    { id: 3, name: 'Carol Davis', status: 'online', lastMessage: 'Meeting at 3 PM', time: '30 min ago' },
    { id: 4, name: 'David Wilson', status: 'away', lastMessage: 'Can you review this?', time: '2 hours ago' },
    { id: 5, name: 'Emma Brown', status: 'online', lastMessage: 'Great work!', time: '5 min ago' },
    { id: 6, name: 'Frank Miller', status: 'offline', lastMessage: 'See you tomorrow', time: '1 day ago' },
  ]);

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#4caf50';
      case 'away': return '#ff9800';
      case 'offline': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  return (
    <div className="contact-list">
      <div className="contact-list-header">
        <h2>Contacts</h2>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="contacts-container">
        {filteredContacts.map((contact) => (
          <div
            key={contact.id}
            className="contact-item"
            onClick={() => onContactSelect(contact.name)}
          >
            <div className="contact-avatar">
              <span className="avatar-text">{contact.name.charAt(0).toUpperCase()}</span>
              <div 
                className="status-indicator"
                style={{ backgroundColor: getStatusColor(contact.status) }}
              ></div>
            </div>
            <div className="contact-info">
              <div className="contact-name">{contact.name}</div>
              <div className="contact-last-message">{contact.lastMessage}</div>
            </div>
            <div className="contact-time">{contact.time}</div>
          </div>
        ))}
      </div>

      {filteredContacts.length === 0 && (
        <div className="no-contacts">
          <div className="no-contacts-icon">👥</div>
          <p>No contacts found</p>
        </div>
      )}
    </div>
  );
};

export default ContactList; 