import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPostById, updatePost, deletePost } from '../../supabase';
import CommentSection from './CommentSection';
import './Twitter.css';
import { useAuth } from '../context/AuthContext';

const PostDetail = () => {
  const { id: postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isOwnPost, setIsOwnPost] = useState(false);
  const menuRef = useRef(null);
  const commentSectionRef = useRef(null);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      console.log(`Fetching post with ID: ${postId}`);
      setLoading(true);
      setError(null);
      try {
        const { data: postData, error: fetchError } = await getPostById(postId);
        
        if (fetchError && fetchError.code !== 'PGRST116') { 
           console.error('Error fetching post by ID (in component):', fetchError);
           setError('Failed to fetch post details.');
           setPost(null); 
        } else if (postData) {
          setPost(postData); 
          console.log('Fetched Post Data (destructured) in useEffect:', postData);
          setEditContent(postData.content);
          setIsOwnPost(currentUser && postData.user_id === currentUser.id);
        } else {
          setError('Post not found.');
          setPost(null); 
        }
      } catch (err) {
        console.error('Exception fetching post details:', err);
        setError('Failed to fetch post details.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, currentUser]); 

  const handleLike = () => {
    console.log('Like clicked');
  };

  const handleRepost = () => {
    console.log('Repost clicked');
  };

  const handleBookmark = () => {
    console.log('Bookmark clicked');
  };

  const handleEditPost = async (newContent) => {
    if (!post || !currentUser) return;
    if (newContent.trim() && post) {
      try {
        const updatedPostData = await updatePost(post.id, currentUser.id, newContent);
        setPost(prevPost => ({ ...prevPost, content: newContent }));
        setEditContent(newContent);
        console.log(`Post ${post.id} edited successfully.`);
      } catch (error) {
        console.error('Error updating post:', error);
      } finally {
        setIsEditing(false);
      }
    }
  };

  const handleDeletePost = async () => {
    if (!post || !currentUser || !isOwnPost) return;
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deletePost(post.id, currentUser.id);
        console.log(`Post ${post.id} deleted`);
        navigate('/');
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setIsMenuOpen(false);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    handleDeletePost();
    setIsMenuOpen(false);
  };

  const handleSaveEdit = (e) => {
    e.stopPropagation();
    handleEditPost(editContent);
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditContent(post.content);
    setIsEditing(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCommentAdded = () => {
    console.log('handleCommentAdded called in PostDetail'); // Log function call
    setPost(prevPost => {
      if (!prevPost) return null; // Handle case where post isn't loaded yet
      console.log('Incrementing comment count. Previous structure:', prevPost.comment_count); // Log previous count
      const currentCount = prevPost.comment_count?.[0]?.count || 0;
      const newCount = currentCount + 1;
      console.log('New count:', newCount);
      return {
        ...prevPost,
        comment_count: [{ count: newCount }]
      };
    });
  };

  const handleCommentDeleted = () => {
    console.log('handleCommentDeleted called in PostDetail'); // Log function call
    setPost(prevPost => {
      if (!prevPost) return null; // Handle case where post isn't loaded yet

      // Safely access and decrement the count
      const currentCount = prevPost.comment_count?.[0]?.count;
      console.log('Decrementing comment count. Current structure/count:', prevPost.comment_count, currentCount);

      // Ensure count is a number and greater than 0 before decrementing
      const newCount = (typeof currentCount === 'number' && currentCount > 0) ? currentCount - 1 : 0;
      console.log('New count after potential decrement:', newCount);

      return {
        ...prevPost,
        // Update the count in the same structure
        comment_count: [{ count: newCount }]
      };
    });
  };

  if (loading) {
    return <div className="loading-indicator">Loading post...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  if (!post) {
    return <div className="error-message">Post not found.</div>;
  }

  const user = post?.profiles;

  const fallbackAvatar = '/path/to/default-avatar.png'; 

  console.log('Post object before render:', post); 
  console.log('Extracted user profile:', user); 
  console.log('Is Own Post state:', isOwnPost); 

  return (
    <div className="post-detail-container twitter-theme">
      <button onClick={() => navigate(-1)} className="back-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>
      <div className="twitter-item">
        <div className="twitter-header">
          <img 
            src={user?.avatar_url || fallbackAvatar} 
            alt="avatar" 
            className="twitter-avatar" 
          />
          <span className="twitter-user">{user?.name || 'Unknown User'}</span> 
          {isOwnPost && (
            <div className="post-menu" ref={menuRef}>
              <button className="post-menu-button" onClick={handleMenuClick}>
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
          <div className="editing-container" onClick={e => e.stopPropagation()}>
            <textarea
              className="edit-post-textarea"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="edit-buttons">
              <button 
                className="cancel-edit-button" 
                onClick={handleCancelEdit}
                onClickCapture={(e) => e.stopPropagation()}
              >
                Cancel
              </button>
              <button 
                className="save-edit-button" 
                onClick={handleSaveEdit}
                onClickCapture={(e) => e.stopPropagation()}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="twitter-content">
            <p>{post.content}</p>
            {post?.media && post.media.length > 0 && (
              <div className="post-media-container post-detail-media">
                {post.media.map((mediaItem) => (
                  <div key={mediaItem.id} className="media-item">
                    {mediaItem.media_type === 'image' ? (
                      <img src={mediaItem.media_url} alt="Post media" className="post-image" />
                    ) : mediaItem.media_type === 'video' ? (
                      <video controls className="post-video">
                        <source src={mediaItem.media_url} type="video/mp4" /> {/* Adjust type based on actual video types */} 
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <p>Unsupported media type</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {post.media && post.media.type === 'image' && (
          <img src={post.media.url} alt="post media" className="twitter-media" />
        )}
        {post.media && post.media.type === 'video' && (
          <video controls className="twitter-media">
            <source src={post.media.url} type="video/mp4" />
          </video>
        )}
        <div className="twitter-actions">
          <button 
            onClick={() => commentSectionRef.current?.openNewCommentModal()} 
            className="twitter-button reply"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            {post.comment_count?.[0]?.count || 0} {/* Access count from first element */}
          </button>
          <button onClick={handleLike} className="twitter-button like">
            {post.likes?.includes(currentUser?.id) ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#e0245e" stroke="#e0245e">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            )}
            {post.likes?.length || 0}
          </button>
          <button onClick={handleRepost} className="twitter-button repost">
            {post.reposts?.includes(currentUser?.id) ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#17bf63" stroke="#17bf63">
                <path d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z"/>
              </svg>
            )}
            {post.reposts?.length || 0}
          </button>
          <button onClick={handleBookmark} className="twitter-button bookmark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
        <CommentSection 
          ref={commentSectionRef} 
          postId={postId} 
          currentUser={currentUser} 
          originalPost={post} 
          onCommentAdded={handleCommentAdded} 
          onCommentDeleted={handleCommentDeleted} 
        />
      </div>
    </div>
  );
};

export default PostDetail;
