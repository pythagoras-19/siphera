import React, { useState, useEffect } from 'react';
import './ContactList.css';
import { useAuth } from '../contexts/AuthContext';

interface ContactListProps {
  onContactSelect: (contact: string) => void;
}

interface DiscoverableUser {
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

const ContactList: React.FC<ContactListProps> = ({ onContactSelect }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState<DiscoverableUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`/api/contacts?currentUserId=${encodeURIComponent(user.id)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setContacts(data.users);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.id]);

  const filteredContacts = contacts.filter(contact =>
    (contact.displayName || contact.username).toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        {loading ? (
          <div className="no-contacts">Loading...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="no-contacts">
            <div className="no-contacts-icon">👥</div>
            <p>No contacts found</p>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <div
              key={contact.userId}
              className="contact-item"
              onClick={() => onContactSelect(contact.username)}
            >
              <div className="contact-avatar">
                <span className="avatar-text">{(contact.displayName || contact.username).charAt(0).toUpperCase()}</span>
              </div>
              <div className="contact-info">
                <div className="contact-name">{contact.displayName || contact.username}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ContactList; 