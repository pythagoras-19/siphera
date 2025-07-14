import React, { useState, useEffect } from 'react';
import './ContactList.css';
import { useAuth } from '../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

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
  const [showFindUsers, setShowFindUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DiscoverableUser[]>([]);
  const [searching, setSearching] = useState(false);

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
    contact.username && contact.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchUsers = async () => {
    if (!searchQuery.trim() || !user?.id) return;
    
    setSearching(true);
    try {
      const response = await fetch(`/api/users/search/${encodeURIComponent(searchQuery)}?currentUserId=${encodeURIComponent(user.id)}`);
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.users);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddContact = async (userId: string, username: string) => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: userId }),
      });
      const data = await response.json();
      if (data.success) {
        // Refresh contacts list
        const contactsResponse = await fetch(`/api/contacts?currentUserId=${encodeURIComponent(user.id)}`);
        const contactsData = await contactsResponse.json();
        if (contactsData.success) {
          setContacts(contactsData.users);
        }
        // Clear search
        setSearchQuery('');
        setSearchResults([]);
        setShowFindUsers(false);
      }
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  return (
    <div className="contact-list">
      <div className="contact-list-header">
        <h2>Contacts</h2>
        <div className="contact-actions">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button 
            className="find-users-btn"
            onClick={() => setShowFindUsers(!showFindUsers)}
          >
            {showFindUsers ? 'Hide Find Users' : 'Find Users'}
          </button>
        </div>
      </div>

      {showFindUsers && (
        <div className="find-users-section">
          <h3>Find Users</h3>
          <div className="user-search-container">
            <input
              type="text"
              placeholder="Search by username or display name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="user-search-input"
              onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
            />
            <button 
              className="search-btn"
              onClick={handleSearchUsers}
              disabled={searching}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          {searching && (
            <div className="search-status">
              <div className="searching-spinner"></div>
              <span>Searching for users...</span>
            </div>
          )}
          
          {!searching && searchQuery && (
            <div className="search-results">
              {searchResults.length > 0 ? (
                <>
                  <h4>Search Results ({searchResults.length})</h4>
                  {searchResults.map((user) => (
                    <div key={user.userId} className="search-result-item">
                      <div className="user-avatar">
                        <span className="avatar-text">{(user.displayName || user.username).charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="user-info">
                        <div className="user-name">{user.displayName || user.username}</div>
                        <div className="user-username">@{user.username}</div>
                      </div>
                      <button 
                        className="add-contact-btn"
                        onClick={() => handleAddContact(user.userId, user.username)}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </>
              ) : (
                <div className="no-search-results">
                  <div className="no-results-icon">🔍</div>
                  <h4>No users found</h4>
                  <p>No users found matching "{searchQuery}"</p>
                  <p className="search-tip">Try searching by username or display name</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="contacts-container">
        {loading ? (
          <div className="no-contacts">Loading...</div>
        ) : filteredContacts.length === 0 ? (
          <div className="no-contacts">
            <div className="no-contacts-icon">👥</div>
            <p>No contacts found</p>
            <button 
              className="find-users-btn"
              onClick={() => setShowFindUsers(true)}
            >
              Find Users
            </button>
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