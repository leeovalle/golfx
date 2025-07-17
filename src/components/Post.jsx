import React, { useState, useRef, useEffect } from 'react';
import './Twitter.css';
import './Feed.css';
import CommentModal from './CommentModal';
import QuoteModal from './QuoteModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toggleBookmark } from '../../supabase';

const Post = ({ post, onLike, onRepost, onQuotePostSubmit, onEdit, onDelete, liked, reposted, isBookmarked, onBookmark, isOwner, children, onAddComment }) => {
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRepostOptions, setShowRepostOptions] = useState(false); // State for repost options
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false); // State for quote modal
  const repostOptionsRef = useRef(null); // Ref for repost options dropdown
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleLike = (e) => {
    e.stopPropagation(); // Prevent the post click event
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    try {
      onLike(post.id);
    } catch (e) {
      console.error('Error in handleLike:', e);
    }
  };

  const handleRepost = (e) => {
    e.stopPropagation(); // Prevent the post click event
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    // Toggle repost options dropdown
    setShowRepostOptions(!showRepostOptions);
  };

  // Function to handle simple repost
  const confirmRepost = (e) => {
    e.stopPropagation(); // Prevent the post click event
    try {
      onRepost(post.id);
      setShowRepostOptions(false); // Close dropdown after action
    } catch (err) {
      console.error('Error in confirmRepost:', err);
    }
  };

  // Function to handle clicking 'Quote Post' - opens the modal
  const handleQuotePost = (e) => {
    e.stopPropagation(); // Prevent the post click event
    setShowRepostOptions(false); // Close dropdown
    setIsQuoteModalOpen(true); // Open the quote modal
  };

  // Function to handle the actual submission from the QuoteModal
  const handleSubmitQuote = async (quoteContent) => {
    await onQuotePostSubmit(post.id, quoteContent); // Call handler from Feed.jsx
    setIsQuoteModalOpen(false); // Close the modal
  };

  const handleBookmark = async (e) => {
    e.stopPropagation(); // Prevent the post click event
    
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    try {
      setLoading(true);
      const { action, error } = await toggleBookmark(post.id, currentUser.id);
      
      if (error) {
        console.error('Error toggling bookmark:', error);
        return;
      }
      
      onBookmark(post.id);
      console.log(`Post ${post.id} ${action}`);
    } catch (e) {
      console.error('Error in handleBookmark:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = (e) => {
    // Prevent navigation if interactive elements are clicked
    if (e.target.closest('.comment-action-button') || 
        e.target.closest('.post-menu') || 
        e.target.closest('.editing-container')) return;
    navigate(`/post/${post.id}`);
  };
  
  const toggleEditMenu = (e) => {
    e.stopPropagation(); // Prevent the post click event
    setIsMenuOpen(!isMenuOpen);
  };

  const handleEditClick = (e) => {
    e.stopPropagation(); // Prevent the post click event
    if (!currentUser) return;
    
    setIsEditing(true);
    setIsMenuOpen(false);
  };

  const handleDeleteClick = async (e) => {
    e.stopPropagation(); // Prevent the post click event
    if (!currentUser) return;
    
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        setLoading(true);
        await onDelete(post.id);
        setIsMenuOpen(false);
      } catch (e) {
        console.error('Error deleting post:', e);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveEdit = async (e) => {
    e.stopPropagation(); // Prevent the post click event
    if (!currentUser) return;
    
    if (editContent.trim() === '') {
      alert('Post content cannot be empty.');
      return;
    }
    
    try {
      setLoading(true);
      await onEdit(post.id, editContent);
      setIsEditing(false);
    } catch (e) {
      console.error('Error saving edited post:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditContent(post.content);
    setIsEditing(false);
  };
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (repostOptionsRef.current && !repostOptionsRef.current.contains(event.target)) {
        setShowRepostOptions(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset edit content when post changes
  useEffect(() => {
    setEditContent(post.content);
  }, [post.content]);

  const renderQuotedPost = () => {
    if (!post.quoted_post) return null;

    // Pass necessary handlers down, potentially simplified versions or null if actions aren't needed on quoted posts
    // Or filter them if they are passed via {...rest} pattern
    return (
      <div className="quoted-post-container" style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '10px', marginTop: '10px' }}>
        <Post
          post={post.quoted_post}
          onLike={onLike}
          onRepost={onRepost}
          onComment={null}
          onQuotePostSubmit={onQuotePostSubmit}
          onDeletePost={onDelete}
          onEditPost={onEdit}
          isEmbedded={true} // Add a prop to indicate it's embedded, for potential style changes
        />
      </div>
    );
  };

  const renderMedia = () => {
    if (!post.media || post.media.length === 0) return null;

    const mediaItem = post.media[0];
    console.log(`[Post.jsx - ${post.id}] Preparing to render media:`, mediaItem);

    return (
      <div className="twitter-media-container">
        {(() => {
          // Force media type detection based on URL if needed
          const mediaUrl = mediaItem.media_url;
          let mediaType = mediaItem.media_type;
          
          console.log(`Post ${post.id} has media:`, { mediaUrl, mediaType });
          
          // If URL ends with .undefined, fix it by removing the extension
          const fixedUrl = mediaUrl.endsWith('.undefined') 
            ? mediaUrl.substring(0, mediaUrl.length - 10) 
            : mediaUrl;
            
          // Detect media type from URL if possible
          if (fixedUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            mediaType = 'image';
          } else if (fixedUrl.match(/\.(mp4|webm|mov)$/i)) {
            mediaType = 'video';
          }
          
          console.log('Using media URL:', fixedUrl, 'with type:', mediaType);
          
          // Check against the simple type string stored in the database
          if (mediaType === 'image' || (!mediaType && fixedUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
            return (
              <img 
                src={fixedUrl} 
                alt={`Image from ${post.profiles?.name || 'user'}'s post`}
                className="twitter-media" 
                loading="lazy"
                onError={(e) => {
                  console.error('Error loading image:', e);
                  console.log('Image URL that failed:', fixedUrl);
                  // Try with a different extension as fallback
                  e.target.src = fixedUrl + '.jpg';
                }}
                onLoad={() => console.log('Image loaded successfully:', fixedUrl)}
              />
            );
          // Check against the simple type string stored in the database
          } else if (mediaType === 'video' || (!mediaType && fixedUrl.match(/\.(mp4|webm|mov)$/i))) {
            const videoUrl = fixedUrl;
            console.log(`[Post.jsx - ${post.id}] Assigning video URL to <video> src: ${videoUrl}`);
            return (
              <video 
                controls 
                className="twitter-media video"
                onError={(e) => {
                  console.error(`[Post.jsx - ${post.id}] Error loading video. URL: ${videoUrl}`, e);
                  // Log detailed error if available (browser-dependent)
                  if (e.target.error) {
                    console.error(`[Post.jsx - ${post.id}] Video Element Error Code: ${e.target.error.code}`, e.target.error);
                  }
                }}
              >
                <source src={videoUrl} type="video/mp4" />
              </video>
            );
          } else {
            // If type is unknown or unsupported, display a message instead of trying to render
            return (
              <div className="twitter-media-error">
                Unsupported media type: {mediaType || 'Unknown'}
              </div>
            );
          }
        })()} 
      </div>
    );
  };

  return (
    <div className="twitter-item" onClick={handlePostClick} style={{ cursor: 'pointer', position: 'relative' }}>
      <CommentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        postId={post.id} 
        onSubmit={onAddComment} // Pass the handler from Feed.jsx
        post={post} // Pass the full post object
      />

      {/* Quote Post Modal */}
      <QuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        post={post} // Pass the original post data to the modal
        onQuoteRepost={handleSubmitQuote} // Pass the submission handler
      />

      {/* Repost Indicator */}
      {post.item_type === 'repost' && (
        <div className="repost-indicator" style={{ fontSize: '0.85em', color: '#657786', marginBottom: '4px', paddingLeft: '10px', display: 'flex', alignItems: 'center' }}>
          <span className="material-icons" style={{ fontSize: '1em', marginRight: '4px' }}>repeat</span>
          {post.reposter_name || 'Someone'} reposted
        </div>
      )}
      
      <div className="twitter-header">
        <img 
          src={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.name || 'User')}&background=random`} 
          alt={`${post.profiles?.name || 'User'} avatar`}
          className="twitter-avatar" 
          loading="lazy"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/profile/${post.profiles?.id}`);
          }}
          style={{ cursor: 'pointer' }}
        />
        <span 
          className="twitter-user"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/profile/${post.profiles?.id}`);
          }}
          style={{ cursor: 'pointer' }}
        >{post.profiles?.name}</span>
        
        {/* Format the date */}
        <span className="post-date">
          {new Date(post.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </span>
        
        {isOwner && (
          <div className="post-menu">
            <button className="post-menu-button" onClick={toggleEditMenu}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>
            
            {isMenuOpen && (
              <div className="post-menu-dropdown">
                <button onClick={handleEditClick}>Edit Post</button>
                <button onClick={handleDeleteClick}>Delete Post</button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {isEditing ? (
        <div className="editing-container" onClick={(e) => e.stopPropagation()}>
          <textarea 
            value={editContent} 
            onChange={(e) => setEditContent(e.target.value)}
            className="edit-post-textarea"
          />
          <div className="edit-buttons">
            <button 
              className="cancel-edit-button" 
              onClick={handleCancelEdit}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              className="save-edit-button" 
              onClick={handleSaveEdit}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="twitter-content">{post.content}</div>
      )}
      
      {post.isLoading ? (
        <div className="twitter-media-container loading">
          <div className="loading-indicator">Uploading media...</div>
        </div>
      ) : post.media && post.media.length > 0 ? (
        renderMedia()
      ) : null}
      
      {renderQuotedPost()}
      
      <div className="twitter-actions">
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            setIsModalOpen(true); 
          }} 
          className="twitter-button reply comment-action-button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
          {post.comment_count || 0}
        </button>
        
        <button onClick={(e) => handleLike(e)} className="twitter-button like">
          {liked ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#e0245e" stroke="#e0245e">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          )}
          {Array.isArray(post.likes) && post.likes.length > 0 ? post.likes.length : 0}
        </button>
        
        <div style={{ position: 'relative' }}>
          <button onClick={(e) => handleRepost(e)} className="twitter-button repost">
            {reposted ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#17bf63" stroke="#17bf63">
                <path d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z"/>
              </svg>
            )}
            {Array.isArray(post.reposts) && post.reposts.length > 0 ? post.reposts.length : 0}
          </button>
          
          {/* Repost Options Dropdown - styled similarly to post-menu-dropdown */}
          {showRepostOptions && (
            <div ref={repostOptionsRef} className="post-menu-dropdown" style={{ position: 'absolute', top: '30px', left: '0', zIndex: 10 }}>
              <button onClick={(e) => confirmRepost(e)}>Repost</button>
              <button onClick={(e) => handleQuotePost(e)}>Quote Post</button>
            </div>
          )}
        </div>
        
       {/* Bookmark Button */}
       <button
        onClick={(e) => {
          e.stopPropagation();
          if (!currentUser) {
            navigate('/login');
            return;
          }
          onBookmark(post.id); // Call the handler passed via props
        }}
        className={`twitter-button bookmark ${isBookmarked ? 'bookmarked' : ''}`} // Add 'bookmarked' class for styling
        disabled={loading} // Keep loading state if needed elsewhere, otherwise remove
      >
        {isBookmarked ? (
          // Bookmarked Icon (Example: Filled)
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
          </svg>
        ) : (
          // Default Icon (Example: Outline)
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
             <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        )}
        {/* Display Bookmark Count */}
        {/* Use optional chaining and check both possible structures for count */}
        <span>{post.bookmarks?.[0]?.count ?? post.bookmarks?.length ?? 0}</span>
      </button>
      </div>
      
      {children}
    </div>
  );
};

export default Post;