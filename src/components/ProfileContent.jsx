import React from 'react';
import Post from './Post';
import ProfileCommentItem from './ProfileCommentItem';
import './Twitter.css';

const ProfileContent = ({ 
  activeTab, 
  userContent, 
  currentUser, 
  loading, 
  error,
  handleLike,
  handleRepost,
  handleEditPost,
  handleDeletePost,
  handleAddComment
}) => {
  if (loading) {
    return <div className="loading">Loading {activeTab}...</div>;
  }
  
  if (error) {
    return <div className="error">{error}</div>;
  }
  
  if (userContent.length === 0) {
    return <div className="no-content">No {activeTab} to display</div>;
  }
  
  return (
    <div className="profile-content">
      {userContent.map(item => {
        // Handle posts, likes and reposts
        if (item.type === 'post' || item.type === 'like' || item.type === 'repost') {
          return (
            <Post 
              key={`${item.type}-${item.id}`}
              post={item}
              currentUser={currentUser}
              onLike={handleLike}
              onRepost={handleRepost}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
              onAddComment={handleAddComment}
            />
          );
        }
        
        // Handle comments
        if (item.type === 'comment') {
          return (
            <ProfileCommentItem 
              key={`comment-${item.id}`} 
              comment={item} 
              currentUser={currentUser} 
              onLike={handleLike} 
              onRepost={handleRepost} 
              onEdit={handleEditPost} 
              onDelete={handleDeletePost} 
            />
          );
        }
        
        return null;
      })}
    </div>
  );
};

export default ProfileContent;