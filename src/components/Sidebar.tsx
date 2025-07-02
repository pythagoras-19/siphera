import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  activeView: 'chat' | 'contacts' | 'calls' | 'settings';
  setActiveView: (view: 'chat' | 'contacts' | 'calls' | 'settings') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const menuItems = [
    { id: 'chat', icon: '💬', label: 'Chat' },
    { id: 'contacts', icon: '👥', label: 'Contacts' },
    { id: 'calls', icon: '📞', label: 'Calls' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id as 'chat' | 'contacts' | 'calls' | 'settings')}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        <div className="status-indicator">
          <div className="status-dot online"></div>
          <span className="status-text">Online</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar; 