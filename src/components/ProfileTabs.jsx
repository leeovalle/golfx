import React from 'react';
import './Twitter.css';

const ProfileTabs = ({ activeTab, setActiveTab }) => {
  return (
    <div className="profile-tabs">
      <button 
        className={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
        onClick={() => setActiveTab('posts')}
      >
        Posts
      </button>
      
      <button 
        className={`profile-tab ${activeTab === 'comments' ? 'active' : ''}`}
        onClick={() => setActiveTab('comments')}
      >
        Comments
      </button>
      
      <button 
        className={`profile-tab ${activeTab === 'likes' ? 'active' : ''}`}
        onClick={() => setActiveTab('likes')}
      >
        Likes
      </button>
      
      <button 
        className={`profile-tab ${activeTab === 'media' ? 'active' : ''}`}
        onClick={() => setActiveTab('media')}
      >
        Media
      </button>
      
      <button 
        className={`profile-tab ${activeTab === 'reposts' ? 'active' : ''}`}
        onClick={() => setActiveTab('reposts')}
      >
        Reposts
      </button>
    </div>
  );
};

export default ProfileTabs;