import React, { useState, useRef } from 'react';
import './Twitter.css';

const EditProfile = ({ isOpen, onClose, user, onSave }) => {
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(user?.avatar_url || '');
  const [banner, setBanner] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  const profilePictureInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // Function to handle profile picture selection
  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      alert('Please select a JPG or PNG image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Please select an image smaller than 5MB');
      return;
    }

    setProfilePicture(file);
    
    // Create a preview URL
    const reader = new FileReader();
    reader.onload = (event) => {
      setProfilePicturePreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Function to handle banner image selection
  const handleBannerChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      alert('Please select a JPG or PNG image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Please select an image smaller than 5MB');
      return;
    }

    setBanner(file);
    
    // Create a preview URL
    const reader = new FileReader();
    reader.onload = (event) => {
      setBannerPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Create updated user object with the new profile data
    const updatedUser = {
      name,
      bio,
      profilePicture,
      banner
    };

    onSave(updatedUser);
    onClose();
  };

  // If the modal is not open, don't render anything
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content edit-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Profile</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="edit-profile-form">
          {/* Banner Preview */}
          <div 
            className="banner-preview" 
            style={{
              backgroundColor: '#1da1f2',
              backgroundImage: bannerPreview ? `url(${bannerPreview})` : 'linear-gradient(45deg, #1da1f2, #9bd1f9)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
            onClick={() => bannerInputRef.current.click()}
          >
            <div className="banner-overlay">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span>Change banner</span>
            </div>
          </div>
          <input 
            type="file" 
            accept=".jpg,.jpeg,.png" 
            onChange={handleBannerChange} 
            ref={bannerInputRef} 
            style={{ display: 'none' }}
          />
          
          {/* Profile Picture Preview */}
          <div className="profile-picture-container">
            <div 
              className="profile-picture-preview" 
              style={{
                backgroundImage: `url(${profilePicturePreview})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
              onClick={() => profilePictureInputRef.current.click()}
            >
              <div className="profile-picture-overlay">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>
            <input 
              type="file" 
              accept=".jpg,.jpeg,.png" 
              onChange={handleProfilePictureChange} 
              ref={profilePictureInputRef} 
              style={{ display: 'none' }}
            />
          </div>
          
          {/* Name Field */}
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input 
              type="text" 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              maxLength="50" 
              required
            />
            <span className="char-count">{name.length}/50</span>
          </div>
          
          {/* Bio Field */}
          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea 
              id="bio" 
              value={bio} 
              onChange={(e) => setBio(e.target.value)} 
              maxLength="160"
              rows="3"
            />
            <span className="char-count">{bio.length}/160</span>
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="save-button" disabled={!name.trim()}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
