import React, { useState, useCallback } from 'react';
import './Twitter.css';
import { useAuth } from '../context/AuthContext';

const CommentModal = ({ isOpen, onClose, post, onSubmit }) => {
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const { currentUser } = useAuth();

  // Log props and state on render
  console.log('CommentModal rendering/re-rendering. Props:', { isOpen, post, onSubmit: !!onSubmit }); 

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (newComment.trim() && !loading && post?.id && currentUser) { 
      setLoading(true);
      try {
        await onSubmit(post.id, newComment);
        setNewComment('');
        onClose();
      } catch (err) {
        console.error('Error submitting comment:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [onSubmit, loading, newComment, post?.id, onClose, currentUser]);

  const isButtonDisabled = !newComment.trim() || loading || !currentUser;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        {/* Original post */}
        <div className="modal-post">
          <div className="post-header">
            <img src={post.profiles?.avatar_url} alt="avatar" className="avatar" />
            <span className="post-user">{post.profiles?.name}</span>
          </div>
          <div className="post-content">{post.content}</div>
          {post.media && post.media[0] && (
            <div className="post-media-container">
              {post.media[0].media_type === 'image' ? (
                <img src={post.media[0].media_url} alt="post media" className="post-media" />
              ) : (
                <video controls className="post-media">
                  <source src={post.media[0].media_url} type="video/mp4" />
                </video>
              )}
            </div>
          )}
        </div>

        {/* For now, we'll simplify this */}
        <div className="comments-section">
          <div className="comments-info">
            <p>Reply to this post</p>
          </div>
          
          {/* New comment form */}
          <form className="new-comment-form" onSubmit={handleSubmit}>
            {currentUser && (
              <img 
                src={currentUser.avatar_url} 
                alt="user avatar" 
                className="avatar"
              />
            )}
            <div className="comment-input-container">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                disabled={loading || !currentUser}
              />
              <button 
                type="submit" 
                disabled={isButtonDisabled}
                className={loading ? 'loading' : ''}
              >
                {loading ? 'Sending...' : 'Reply'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
