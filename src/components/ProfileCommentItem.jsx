import React from 'react';
import Post from './Post';
import './Twitter.css';

const ProfileCommentItem = ({ 
  comment, 
  currentUser, 
  onLike, 
  onRepost, 
  onEdit, 
  onDelete 
}) => {
  // Ensure comment and nested post data exist before rendering
  if (!comment || !comment.post) {
    return null; // Or some fallback UI
  }

  return (
    <div key={`comment-wrapper-${comment.id}`} className="profile-comment-wrapper">
      {/* Section for the comment itself */}
      <div className="user-comment-section">
        <img 
          src={comment.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.name || 'User')}&background=random`} 
          alt={comment.user?.name} 
          className="comment-avatar" 
        />
        <div className="comment-details">
            <span className="comment-context-label">You replied:</span>
            <p className="comment-text">{comment.content}</p>
        </div>
      </div>
      
      {/* Section for the post that was commented on, using the Post component */}
      <div className="commented-on-post-section">
        <Post 
          post={comment.post} 
          currentUser={currentUser}
          onLike={onLike}
          onRepost={onRepost}
          onEdit={onEdit}
          onDelete={onDelete}
          // Optional: Add a prop to Post if you need to slightly alter its appearance
          // when shown in this context, e.g., isContextualPost={true}
        />
      </div>
    </div>
  );
};

export default ProfileCommentItem;