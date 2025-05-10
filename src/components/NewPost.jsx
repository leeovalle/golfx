import React, { useState, useRef } from 'react';
import './Twitter.css';

const NewPost = ({ onCreate, userAvatar }) => {
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('File selected in NewPost:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      });
      
      // Accept image or video files
      if (!file.type.match('image.*') && !file.type.match('video.*')) {
        alert('Please select an image or video file');
        return;
      }
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target.result);
        console.log('Preview URL created successfully');
      };
      reader.onerror = (error) => {
        console.error('Error creating preview:', error);
      };
      reader.readAsDataURL(file);
      
      // Just store the actual file object directly
      setMediaFile(file);
      console.log('Media file stored in state:', file.name);
    }
  };
  
  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!content.trim()) {
      console.log('Error: Post content is empty');
      return;
    }
    
    console.log('Submitting post with content:', content.substring(0, 30) + (content.length > 30 ? '...' : ''));
    
    if (mediaFile) {
      console.log('Media file being submitted:', {
        name: mediaFile.name,
        type: mediaFile.type,
        size: mediaFile.size,
        isFile: mediaFile instanceof File
      });
    } else {
      console.log('No media file attached to this post');
    }
    
    // Pass the media file directly if it exists
    onCreate({ 
      content, 
      media: mediaFile || null
    });
    setContent('');
    setMediaFile(null);
    setMediaPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <form className="new-post" onSubmit={handleSubmit}>
      <div className="new-post-content">
        <img 
          src={userAvatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} 
          alt="user avatar" 
          className="avatar"
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="What's happening?"
        />
      </div>
      
      {mediaPreview && (
        <div className="media-preview">
          {mediaFile && mediaFile.type.startsWith('video/') ? (
            <video controls src={mediaPreview} />
          ) : (
            <img src={mediaPreview} alt="Media preview" />
          )}
          <button type="button" className="remove-media-button" onClick={handleRemoveMedia}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
      
      <div className="new-post-actions">
        <label className="media-button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            ref={fileInputRef}
          />
        </label>

        <button 
          type="submit" 
          className="post-button"
          disabled={!content.trim()}
        >
          Post
        </button>
      </div>
    </form>
  );
};

export default NewPost;
