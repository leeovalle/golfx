import React, { useState, useCallback } from 'react';
import './Twitter.css';
import { useAuth } from '../context/AuthContext';

const QuoteModal = ({ isOpen, onClose, post, onQuoteRepost }) => {
  const [quoteContent, setQuoteContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

  // Define handleSubmit using useCallback
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (quoteContent.trim() && !loading) {
      setLoading(true);
      try {
        console.log('Submitting quote repost with content:', quoteContent);
        await onQuoteRepost(quoteContent); // Pass only the text content
        setQuoteContent('');
        onClose(); // Close the modal after successful quote repost
      } catch (err) {
        console.error('Error submitting quote repost:', err);
      } finally {
        setLoading(false);
      }
    }
  }, [onQuoteRepost, loading, quoteContent, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        {/* Original post being quoted */}
        <div className="modal-post">
          <div className="post-header">
            <img 
              src={post.profiles?.avatar_url || post.user?.avatar_url} 
              alt="avatar" 
              className="avatar" 
            />
            <span className="post-user">{post.profiles?.name || post.user?.name}</span>
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

        {/* Quote repost form */}
        <div className="quote-section">
          <div className="quote-info">
            <p>Add your thoughts about this post</p>
          </div>
          
          <form className="quote-form" onSubmit={handleSubmit}>
            {currentUser && (
              <img 
                src={currentUser.avatar_url} 
                alt="user avatar" 
                className="avatar"
              />
            )}
            <div className="quote-input-container" style={{ width: '100%' }}>
              <textarea
                value={quoteContent}
                onChange={(e) => setQuoteContent(e.target.value)}
                placeholder="Add your thoughts..."
                disabled={loading || !currentUser}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  resize: 'vertical'
                }}
              />
              <button 
                type="submit" 
                disabled={!quoteContent.trim() || loading || !currentUser}
                className={loading ? 'loading' : ''}
                style={{
                  marginTop: '10px',
                  padding: '8px 16px',
                  backgroundColor: '#1DA1F2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  float: 'right'
                }}
              >
                {loading ? 'Posting...' : 'Quote Repost'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuoteModal;
