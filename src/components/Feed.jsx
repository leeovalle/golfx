import React, { useState, useEffect } from 'react';
import Post from './Post';
import CommentSection from './CommentSection';
import NewPost from './NewPost';
import { useAuth } from '../context/AuthContext';
import { getPosts, getProfilesByIds, toggleLike, toggleRepost, createPost, createQuotePost, updatePost, deletePost, getComments, toggleBookmark, addComment } from '../../supabase';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchPosts = async () => {
      console.log('[Feed] Starting to fetch posts...');
      try {
        setLoading(true);
        const { data: postsData, error: postsError } = await getPosts(currentUser?.id);
        console.log('[Feed] Posts data received:', postsData);

        if (postsError) {
          setError('Error loading posts');
          console.error('Error fetching posts:', postsError);
          return;
        }

        const userIds = new Set();
        postsData.forEach(post => {
          userIds.add(post.user_id);
          if (post.quoted_post?.user_id) {
            userIds.add(post.quoted_post.user_id);
          }
        });

        const { data: profilesData, error: profilesError } = await getProfilesByIds([...userIds]);

        if (profilesError) {
          setError('Error loading user profiles');
          console.error('Error fetching profiles:', profilesError);
        }

        console.log('[Feed] Profiles data received:', profilesData);

        // Create a map of profiles for easy lookup
        const profilesMap = new Map();
        profilesData?.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
        
        console.log('[Feed] Profiles map created:', [...profilesMap.entries()]);

        const postsWithProfiles = postsData.map(post => {
          const bookmarksArray = post.bookmarks || [];
          const fetchedComments = post.comments || []; // Get comments array
          return {
            ...post,
            profiles: profilesMap.get(post.user_id) || { id: post.user_id },
            quoted_post: post.quoted_post ? {
              ...post.quoted_post,
              profiles: profilesMap.get(post.quoted_post.user_id) || { id: post.quoted_post.user_id }
            } : null,
            likes: post.likes?.map(like => like.user_id) || [],
            reposts: post.reposts?.map(repost => repost.user_id) || [],
            media: post.media || [],
            comments: fetchedComments, // Store the full array
            comment_count: fetchedComments.length, // Calculate comment_count
            bookmarks: bookmarksArray
          };
        });

        setPosts(postsWithProfiles);
      } catch (err) {
        setError('An unexpected error occurred');
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [currentUser]);

  const handleLike = async (postId) => {
    if (!currentUser) return;

    try {
      const { action, error } = await toggleLike(postId, currentUser.id);

      if (error) {
        console.error('Error toggling like:', error);
        return;
      }

      setPosts(prevPosts =>
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

      console.log(`Post ${postId} ${action}`);
    } catch (err) {
      console.error('Unexpected error toggling like:', err);
    }
  };

  const handleRepost = async (postId) => {
    if (!currentUser) return;

    try {
      const { action, error } = await toggleRepost(postId, currentUser.id);

      if (error) {
        console.error('Error toggling repost:', error);
        return;
      }

      setPosts(prevPosts =>
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

      console.log(`Post ${postId} ${action}`);
    } catch (err) {
      console.error('Unexpected error toggling repost:', err);
    }
  };

  const handleBookmark = async (postId) => {
    if (!currentUser) return;

    try {
      const { action, error } = await toggleBookmark(postId, currentUser.id);

      if (error) {
        console.error('Error toggling bookmark:', error);
        return;
      }

      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                bookmarks: action === 'bookmarked'
                  ? [...post.bookmarks, { user_id: currentUser.id }]
                  : post.bookmarks.filter(b => b.user_id !== currentUser.id)
              }
            : post
        )
      );

      console.log(`Post ${postId} ${action}`);
    } catch (err) {
      console.error('Unexpected error toggling bookmark:', err);
    }
  };

  const handleAddComment = async (postId, commentText) => {
    if (!currentUser || !commentText.trim()) return;

    try {
      const { data: newComment, error } = await addComment(postId, currentUser.id, commentText);

      if (error) {
        console.error('Error creating comment:', error);
        alert('Failed to add comment. Please try again.');
        return;
      }

      // Fetch profile for the new comment's author (currentUser)
      // This assumes addComment returns the new comment object including user_id
      // Ideally, addComment would return the comment WITH the profile embedded
      // For simplicity here, we add the basic profile info we already have
      const commentWithProfile = {
        ...newComment,
        profiles: {
          id: currentUser.id,
          name: currentUser.user_metadata.name || 'User',
          avatar_url: currentUser.user_metadata.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.user_metadata.name || 'User')}&background=random`
        }
      };

      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { 
                ...post, 
                comments: [...post.comments, commentWithProfile], // Add the new comment
                comment_count: (post.comment_count || 0) + 1 // Increment comment count
              }
            : post
        )
      );

      console.log('Comment added successfully to post', postId);
    } catch (err) {
      console.error('Unexpected error adding comment:', err);
      alert('An unexpected error occurred while adding the comment.');
    }
  };

  const handleCreatePost = async ({ content, media }) => {
    if (!currentUser) return;

    try {
      console.log('Creating post with content:', content, 'and media:', media);

      const tempId = Math.random().toString();
      const tempPost = {
        id: tempId,
        content,
        user_id: currentUser.id,
        profiles: {
          id: currentUser.id,
          name: currentUser.user_metadata.name || 'User',
          avatar_url: currentUser.user_metadata.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.user_metadata.name || 'User')}&background=random`
        },
        likes: [],
        reposts: [],
        media: [],
        comment_count: 0,
        item_type: 'post',
        action_timestamp: new Date().toISOString(),
        isLoading: true
      };

      setPosts(prevPosts => [tempPost, ...prevPosts]);

      const { data, error } = await createPost(currentUser.id, content, media);

      if (error) {
        console.error('Error creating post:', error);
        setPosts(prevPosts => prevPosts.filter(p => p.id !== tempId));
        alert('Failed to create post. Please try again.');
        return;
      }

      console.log('Post created successfully, returned data:', data);

      const transformedPost = {
        ...data,
        profiles: data.profiles,
        media: data.media,
        likes: data.likes.map(like => like.user_id),
        reposts: data.reposts.map(repost => repost.user_id)
      };

      console.log('Transformed post for display:', transformedPost);

      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === tempId ? transformedPost : post
        )
      );
    } catch (err) {
      console.error('Unexpected error creating post:', err);
    }
  };

  const handleEditPost = async (postId, newContent) => {
    if (!currentUser) return;

    try {
      const { error } = await updatePost(postId, currentUser.id, newContent);

      if (error) {
        console.error('Error updating post:', error);
        return;
      }

      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, content: newContent }
            : post
        )
      );

      console.log(`Post ${postId} edited with new content: ${newContent}`);
    } catch (err) {
      console.error('Unexpected error editing post:', err);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!currentUser) return;

    try {
      const { error } = await deletePost(postId, currentUser.id);

      if (error) {
        console.error('Error deleting post:', error);
        return;
      }

      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      console.log(`Post ${postId} deleted`);
    } catch (err) {
      console.error('Unexpected error deleting post:', err);
    }
  };

  const handleQuotePostSubmit = async (originalPostId, quoteContent) => {
    if (!currentUser) {
      console.error("User must be logged in to quote post");
      return;
    }

    const tempId = `temp_${Date.now()}`;
    const tempPost = {
      id: tempId,
      content: `${quoteContent}\n\n📝 Quoting...`,
      user_id: currentUser.id,
      profiles: {
        id: currentUser.id,
        name: currentUser.user_metadata.name || 'User',
        avatar_url: currentUser.user_metadata.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.user_metadata.name || 'User')}&background=random`
      },
      likes: [],
      reposts: [],
      media: [],
      comment_count: 0,
      item_type: 'post',
      action_timestamp: new Date().toISOString(),
      isLoading: true
    };

    setPosts(prevPosts => [tempPost, ...prevPosts]);

    try {
      console.log('[Feed.jsx] Calling createQuotePost with userId:', currentUser.id, 'originalPostId:', originalPostId, 'quoteContent:', quoteContent);
      const { data: newQuotePost, error } = await createQuotePost(currentUser.id, originalPostId, quoteContent);

      if (error) {
        console.error('Error creating quote post:', error);
        setPosts(prevPosts => prevPosts.filter(p => p.id !== tempId));
        alert('Failed to create quote post. Please try again.');
        return;
      }

      console.log('Quote post created:', newQuotePost);
      setPosts(prevPosts => prevPosts.map(p => (p.id === tempId ? { ...newQuotePost, isLoading: false } : p)));
    } catch (err) {
      console.error('Unexpected error during quote post submission:', err);
      setPosts(prevPosts => prevPosts.filter(p => p.id !== tempId));
      alert('An unexpected error occurred. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="feed loading">
        <div className="loading-spinner"></div>
        <p>Loading posts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feed error">
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="feed">
      {currentUser && (
        <NewPost onCreate={handleCreatePost} userAvatar={currentUser.avatar_url} />
      )}

      {posts.length === 0 ? (
        <div className="no-posts">
          <p>No posts yet. Be the first to post!</p>
        </div>
      ) : (
        posts.map(post => (
          <Post
            key={post.id}
            post={post}
            user={post.profiles}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onRepost={handleRepost}
            onQuotePostSubmit={handleQuotePostSubmit}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            liked={post.likes.includes(currentUser?.id)}
            reposted={post.reposts.includes(currentUser?.id)}
            isBookmarked={post.bookmarks?.some(b => b.user_id === currentUser?.id)}
            isOwner={post.user_id === currentUser?.id}
            comments={post.comments || []}
            onAddComment={handleAddComment}
          />
        ))
      )}
    </div>
  );
};

export default Feed;
