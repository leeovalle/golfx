import React, { useState, useEffect } from 'react';
import Post from './Post';
import './Twitter.css';
import { useAuth } from '../context/AuthContext';
import { 
  getBookmarkedPosts, 
  getProfilesByIds, 
  toggleBookmark, 
  toggleLike, 
  toggleRepost 
} from '../../supabase';

const Bookmarks = () => {
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!currentUser) {
        setError('Please log in to see your bookmarks.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const { data: postsData, error: postsError } = await getBookmarkedPosts(currentUser.id);

        if (postsError) {
          console.error('Error fetching bookmarked posts:', postsError);
          setError('Could not load bookmarks.');
          return;
        }

        if (!postsData || postsData.length === 0) {
          setBookmarkedPosts([]);
          return;
        }

        // Collect user IDs for profile fetching
        const userIds = new Set();
        postsData.forEach(post => {
          userIds.add(post.user_id);
          if (post.quoted_post?.user_id) {
            userIds.add(post.quoted_post.user_id);
          }
        });

        // Fetch profiles
        const { data: profilesData, error: profilesError } = await getProfilesByIds([...userIds]);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        const profilesMap = new Map();
        profilesData?.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });

        // Combine posts with profiles and calculate counts
        const postsWithDetails = postsData.map(post => ({
          ...post,
          profiles: profilesMap.get(post.user_id) || { id: post.user_id },
          quoted_post: post.quoted_post ? {
            ...post.quoted_post,
            profiles: profilesMap.get(post.quoted_post.user_id) || { id: post.quoted_post.user_id },
            likes: post.quoted_post.likes?.map(like => like.user_id) || [],
            reposts: post.quoted_post.reposts?.map(repost => repost.user_id) || [],
            bookmarks: post.quoted_post.bookmarks || [],
            media: post.quoted_post.media || [],
            comment_count: post.quoted_post.comments?.length || 0
          } : null,
          likes: post.likes?.map(like => like.user_id) || [],
          reposts: post.reposts?.map(repost => repost.user_id) || [],
          bookmarks: post.bookmarks || [],
          media: post.media || [],
          comment_count: post.comments?.length || 0
        }));

        setBookmarkedPosts(postsWithDetails);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarks();
  }, [currentUser]);

  // Handle unbookmarking (removes post from view)
  const handleUnbookmark = async (postId) => {
    if (!currentUser) return;

    try {
      const { action, error } = await toggleBookmark(postId, currentUser.id);

      if (error) {
        console.error('Error unbookmarking:', error);
        return;
      }

      if (action === 'unbookmarked') {
        // Remove the post from local state
        setBookmarkedPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      }
    } catch (err) {
      console.error('Unexpected error unbookmarking:', err);
    }
  };

  // Handle liking a post
  const handleLike = async (postId) => {
    if (!currentUser) return;

    try {
      const { action, error } = await toggleLike(postId, currentUser.id);

      if (error) {
        console.error('Error toggling like:', error);
        return;
      }

      setBookmarkedPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                likes: action === 'liked'
                  ? [...post.likes, currentUser.id]
                  : post.likes.filter(id => id !== currentUser.id)
              }
            : post
        )
      );
    } catch (err) {
      console.error('Unexpected error toggling like:', err);
    }
  };

  // Handle reposting
  const handleRepost = async (postId) => {
    if (!currentUser) return;

    try {
      const { action, error } = await toggleRepost(postId, currentUser.id);

      if (error) {
        console.error('Error toggling repost:', error);
        return;
      }

      setBookmarkedPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                reposts: action === 'reposted'
                  ? [...post.reposts, currentUser.id]
                  : post.reposts.filter(id => id !== currentUser.id)
              }
            : post
        )
      );
    } catch (err) {
      console.error('Unexpected error toggling repost:', err);
    }
  };

  if (loading) {
    return (
      <div className="feed loading">
        <h2 className="feed-title">Bookmarks</h2>
        <div className="loading-spinner"></div>
        <p>Loading bookmarks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feed error">
        <h2 className="feed-title">Bookmarks</h2>
        <p className="error-message">{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="feed">
      <h2 className="feed-title">Bookmarks</h2>
      {bookmarkedPosts.length === 0 ? (
        <div className="empty-bookmarks">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#8899a6" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          <p>No bookmarks yet</p>
        </div>
      ) : (
        bookmarkedPosts.map(post => (
          <Post
            key={post.id}
            post={post}
            user={post.profiles}
            onLike={handleLike}
            onRepost={handleRepost}
            onBookmark={handleUnbookmark}
            liked={post.likes?.includes(currentUser?.id)}
            reposted={post.reposts?.includes(currentUser?.id)}
            isBookmarked={true} // All posts here are bookmarked
            isOwner={post.user_id === currentUser?.id}
          />
        ))
      )}
    </div>
  );
};

export default Bookmarks;
