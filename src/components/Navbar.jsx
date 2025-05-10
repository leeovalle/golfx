import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const navItems = [
  { name: 'Home', icon: (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12L12 3l9 9"/><path d="M9 21V9h6v12"/></svg>
  ) },
  { name: 'Explore', icon: (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  ) },
  { name: 'Messages', icon: (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>
  ) },
  { name: 'Bookmarks', icon: (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
  ) },
  { name: 'Profile', icon: (
    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a10 10 0 0 1 13 0"/></svg>
  ) },
];

const Navbar = () => {
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const { logout } = useAuth();

  const handleNavigation = (itemName) => {
    switch (itemName) {
      case 'Home':
        navigate('/');
        break;
      case 'Explore':
        navigate('/explore');
        break;
      case 'Messages':
        // TODO: Implement navigation to Messages page
        // console.log('Navigate to Messages page');
        alert('Featurecomming soon'); // Display coming soon message
        break;
      case 'Bookmarks':
        navigate('/bookmarks');
        break;
      case 'Profile':
        navigate('/profile');
        break;
      case 'Sign Out':
        handleSignOut();
        break;
      default:
        navigate('/');
    }
  };
  
  const handleSignOut = async () => {
    try {
      // Use the logout function from auth context (now async with Supabase)
      const { error } = await logout();
      
      if (error) {
        console.error('Error signing out:', error.message);
        return;
      }
      
      console.log('User signed out successfully');
      // Redirect to login page
      navigate('/login');
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
    } finally {
      // Close the settings dropdown
      setIsSettingsOpen(false);
    }
  };
  
  const toggleSettings = (e) => {
    e.stopPropagation();
    setIsSettingsOpen(!isSettingsOpen);
  };
  
  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="nav-main-items">
        {navItems.map(item => (
          <button 
            key={item.name} 
            className="nav-btn" 
            title={item.name}
            data-nav={item.name.toLowerCase()}
            onClick={() => handleNavigation(item.name)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.name}</span>
          </button>
        ))}
      </div>
      
      <div className="nav-settings" ref={settingsRef}>
        <button 
          className="nav-btn settings-btn" 
          title="Settings"
          onClick={toggleSettings}
        >
          <span className="nav-icon">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </span>
          <span className="nav-label">Settings</span>
        </button>
        
        {isSettingsOpen && (
          <div className="settings-dropdown">
            <button 
              className="settings-item" 
              onClick={() => handleNavigation('Sign Out')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;