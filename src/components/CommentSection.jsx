import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import CommentModal from './CommentModal';
import './Twitter.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getComments, addComment, deleteComment } from '../../supabase';

const CommentSection = forwardRef(({ postId, initialComments = [], onCommentAdded, onCommentDeleted, originalPost }, ref) => {
  const [comments, setComments] = useState(initialComments);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeComment, setActiveComment] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Fetch comments when component mounts
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoading(true);
        const { data, error } = await getComments(postId);
        
        if (error) {
          console.error('Error fetching comments:', error);
          setError('Failed to load comments');
          return;
        }
        
        setComments(data || []);
      } catch (err) {
        console.error('Unexpected error fetching comments:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchComments();
  }, [postId]);
  
  const handleLike = (comment) => {
    // TODO: Implement like functionality for comments
    console.log('Like comment:', comment.id);
  };

  const handleRepost = (comment) => {
    // TODO: Implement repost functionality for comments
    console.log('Repost comment:', comment.id);
  };

  const handleReply = useCallback(async (postIdFromModal, commentText) => {
    if (!currentUser || !commentText.trim()) {
      console.log("[CommentSection] handleReply returning early: no user or empty text.");
      return;
    }
    console.log(`Attempting to add comment to post ${postId}:`, commentText);
    
    try {
      const { data: newCommentData, error } = await addComment(postId, currentUser.id, commentText);
      console.log('addComment response:', { data: newCommentData, error });
      
      if (error) {
        console.error('Error adding comment:', error);
        setError('Failed to add comment.'); 
        return;
      }
      
      const newCommentForState = {
         id: newCommentData?.[0]?.id || Date.now(), 
         post_id: postId,
         user_id: currentUser.id,
         content: commentText,
         created_at: new Date().toISOString(),
         profiles: { 
           id: currentUser.id,
           name: currentUser.user_metadata?.name || currentUser.email,
           avatar_url: currentUser.user_metadata?.avatar_url
         }
      };

      console.log('Updating comments state with:', newCommentForState);
      setComments(prevComments => [newCommentForState, ...prevComments]); 
      setError(null); 
      
      if (onCommentAdded) {
        console.log('Calling onCommentAdded callback.');
        onCommentAdded(); 
      }
    } catch (err) {
      console.error('Unexpected error adding comment:', err);
      setError('An unexpected error occurred while adding the comment.');
    } finally {
      setIsModalOpen(false);
      setActiveComment(null); 
    }
  }, [currentUser, postId, onCommentAdded]);

  const handleDeleteComment = async (commentId) => {
    if (!currentUser) return;

    if (window.confirm('Are you sure you want to delete this comment?')) {
      console.log(`Attempting to delete comment: ${commentId}`);
      const { error } = await deleteComment(commentId);

      if (error) {
        console.error('Error deleting comment:', error);
        alert('Failed to delete comment.');
      } else {
        console.log(`Successfully deleted comment: ${commentId}`);
        setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
        if (onCommentDeleted) {
          onCommentDeleted();
        }
        setOpenMenuId(null); 
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    openNewCommentModal() {
      console.log('Opening modal for NEW comment on post:', originalPost?.id);
      setActiveComment(null); 
      setIsModalOpen(true);
    }
  }));

  console.log('CommentSection rendering. handleReply defined.'); 

  if (loading) {
    return (
      <div className="nested-comments loading">
        <div className="comments-header">
          <h4>Comments</h4>
        </div>
        <div className="loading-spinner small"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nested-comments error">
        <div className="comments-header">
          <h4>Comments</h4>
        </div>
        <p className="error-message">Could not load comments</p>
      </div>
    );
  }

  return (
    <div className="nested-comments">
      <div className="comments-header">
        <h4>Comments</h4>
      </div>
      <div className="comment-list">
        {comments.length === 0 && <div className="comment-placeholder">No comments yet.</div>}
        {comments.map(comment => {
          const isCommentOwner = currentUser?.id === comment.user_id;
          const isPostOwner = currentUser?.id === originalPost?.user_id;
          const canDelete = isCommentOwner || isPostOwner;

          console.log(`Comment ${comment.id}: isCommentOwner=${isCommentOwner}, isPostOwner=${isPostOwner}, canDelete=${canDelete}`);

          return (
            <div key={comment.id} className="comment-item" style={{ position: 'relative' }}>
              <div className="twitter-header">
                <img 
                  src={comment.profiles?.avatar_url} 
                  alt="avatar" 
                  className="twitter-avatar reply" 
                  onClick={() => navigate(`/profile/${comment.user_id}`)}
                  style={{ cursor: 'pointer' }}
                />
                <span 
                  className="twitter-user"
                  onClick={() => navigate(`/profile/${comment.user_id}`)}
                  style={{ cursor: 'pointer' }}
                >{comment.profiles?.name}</span>

                {canDelete && (
                  <div className="post-menu" ref={openMenuId === comment.id ? menuRef : null} style={{ position: 'absolute', top: '5px', right: '5px' }}>
                    <button
                      className="post-menu-button small-menu-button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === comment.id ? null : comment.id);
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                      </svg>
                    </button>

                    {openMenuId === comment.id && (
                      <div className="post-menu-dropdown comment-delete-menu"> 
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }}>Delete Comment</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="twitter-content">{comment.content}</div>
              <div className="twitter-actions">
                <button 
                  onClick={() => {
                    setActiveComment(comment);
                    setIsModalOpen(true);
                  }} 
                  className="twitter-button reply"
                  disabled={!currentUser}
                >
                  Reply
                </button>
                <button
                  onClick={() => handleLike(comment)}
                  className="twitter-button like"
                  disabled={!currentUser}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  0
                </button>
                <button
                  onClick={() => handleRepost(comment)}
                  className="twitter-button repost"
                  disabled={!currentUser}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z"/>
                  </svg>
                  0
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {console.log('CommentSection passing onComment prop:', handleReply)}
      <CommentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        // If replying to a comment, use activeComment. Otherwise, use the base 'post' prop and add the postId.
        post={activeComment ? activeComment : { ...originalPost, id: postId }}
        onSubmit={handleReply} 
      />
    </div>
  );
});

export default CommentSection;
