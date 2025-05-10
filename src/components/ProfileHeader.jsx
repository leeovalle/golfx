import React from 'react';
import './Twitter.css';

const ProfileHeader = ({ 
  userData, 
  isCurrentUserProfile, 
  toggleEditProfile, 
  toggleFollow, 
  isFollowing, 
  followCounts 
}) => {
  if (!userData) return null;
  
  return (
    <div className="profile-header">
      <div 
        className="profile-banner" 
        style={{
          backgroundColor: '#1da1f2',
          ...(userData.banner_url && { backgroundImage: `url(${userData.banner_url})` })
        }}
      ></div>
      
      <div className="profile-info">
        <div className="profile-avatar">
          <img 
            src={userData.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`} 
            alt={userData.name} 
          />
        </div>
        
        <div className="profile-actions">
          {isCurrentUserProfile ? (
            <button onClick={toggleEditProfile} className="edit-profile-button">
              Edit Profile
            </button>
          ) : (
            <button 
              onClick={toggleFollow} 
              className={`add-friend-button ${isFollowing ? 'is-friend' : ''}`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
        
        <div className="profile-details">
          <h2>{userData.name}</h2>
          <p className="profile-handle">@{userData.username || userData.name.toLowerCase().replace(/\s/g, '')}</p>
          
          {userData.bio && <p className="profile-bio">{userData.bio}</p>}
          
          <div className="profile-meta">
            {userData.location && (
              <span className="profile-location">
                <i className="fa fa-map-marker" aria-hidden="true"></i> {userData.location}
              </span>
            )}
            
            {userData.website && (
              <span className="profile-website">
                <i className="fa fa-link" aria-hidden="true"></i> 
                <a href={userData.website} target="_blank" rel="noopener noreferrer">
                  {userData.website.replace(/^https?:\/\//i, '')}
                </a>
              </span>
            )}
            
            <span className="profile-date">
              <i className="fa fa-calendar" aria-hidden="true"></i> 
              Joined {new Date(userData.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            
            <div className="profile-follow-counts">
            <span className="follow-count">
              <strong>{followCounts?.following ?? 0}</strong> Following
            </span>
            <span className="follow-count">
              <strong>{followCounts?.followers ?? 0}</strong> Followers
            </span>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;