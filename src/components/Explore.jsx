import React, { useState } from 'react';
import { supabase } from '../../supabase';
import Post from './Post';
import { useAuth } from '../context/AuthContext';
import { getPosts, getProfilesByIds, toggleLike, toggleRepost, toggleBookmark } from '../../supabase';
import './Explore.css';
import { useNavigate } from 'react-router-dom';

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' or 'users'
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Handle like functionality
  const handleLike = async (postId) => {
    if (!currentUser) return;

    try {
      const { action, error } = await toggleLike(postId, currentUser.id);

      if (error) {
        console.error('Error toggling like:', error);
        return;
      }

      setSearchResults(prevResults =>
        prevResults.map(post =>
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

  // Handle repost functionality
  const handleRepost = async (postId) => {
    if (!currentUser) return;

    try {
      const { action, error } = await toggleRepost(postId, currentUser.id);

      if (error) {
        console.error('Error toggling repost:', error);
        return;
      }

      setSearchResults(prevResults =>
        prevResults.map(post =>
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

  // Handle bookmark functionality
  const handleBookmark = async (postId) => {
    if (!currentUser) return;

    try {
      const { action, error } = await toggleBookmark(postId, currentUser.id);

      if (error) {
        console.error('Error toggling bookmark:', error);
        return;
      }

      setSearchResults(prevResults =>
        prevResults.map(post =>
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

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setSearchResults([]);

    try {
      if (activeTab === 'posts') {
        await searchPosts();
      } else {
        await searchUsers(searchQuery);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('An error occurred while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const searchPosts = async () => {
    try {
      console.log('Searching for posts with query:', searchQuery);
      
      const words = searchQuery.split(' ');
      const orConditions = words.map(word => `content.ilike.%${word}%`).join(',');
      console.log(`Constructed OR conditions for posts: ${orConditions}`);

      // Fetch posts matching any of the search words in the content
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, user_id, content, created_at') // Remove image_url
        .or(orConditions) // Use the correctly formatted string
        .order('created_at', { ascending: false });

      console.log('Raw postsData from Supabase:', postsData);
      console.log('Posts search result:', postsData);
      console.log('Posts search error:', postsError);

      if (postsError) {
        console.error('Error searching posts:', postsError);
        setError('Error searching posts. Please try again.');
        return;
      }

      if (!postsData || postsData.length === 0) {
        console.log('No posts found matching the query');
        setSearchResults([]);
        return;
      }

      // Get user profiles for the posts
      const userIds = [...new Set(postsData.map(post => post.user_id))];
      console.log('Fetching profiles for user IDs:', userIds);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      console.log('Profiles data:', profilesData);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setError('Error fetching user profiles. Please try again.');
        return;
      }

      // Create a map of profiles for easy lookup
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Format posts with profile information
      const formattedPosts = postsData.map(post => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || { id: post.user_id },
        likes: post.likes?.map(like => like.user_id) || [],
        reposts: post.reposts?.map(repost => repost.user_id) || [],
        bookmarks: post.bookmarks || [],
        comment_count: post.comments?.[0]?.count || 0
      }));

      console.log('Formatted posts:', formattedPosts);
      setSearchResults(formattedPosts);
    } catch (err) {
      console.error('Unexpected error in searchPosts:', err);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const searchUsers = async (query) => {
    setLoading(true);
    setError(null);
    setSearchResults([]);
    console.log(`Searching users with query: ${query}`);

    try {
      const searchWords = query.split(' ').filter(Boolean);
      if (searchWords.length === 0) {
        setSearchResults([]);
        setLoading(false);
        return;
      }

      const orConditions = searchWords.map(word => `name.ilike.%${word}%`).join(',');
      console.log(`Constructed OR conditions for users: ${orConditions}`);

      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .or(orConditions);

      console.log('Users search result:', usersData);
      console.log('Users search error:', usersError);

      if (usersError) {
        console.error('Error searching users:', usersError);
        setError(`Error searching users: ${usersError.message}`);
        setLoading(false);
        return;
      }

      if (usersData) {
        setSearchResults(usersData.map(user => ({ ...user, type: 'user' })));
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Unexpected error in searchUsers:', err);
      setError('An unexpected error occurred while searching users.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="explore-container">
      <div className="search-section">
        <div className="search-tabs">
          <button 
            className={`tab-button ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>
          <button 
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
        </div>
        
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder={activeTab === 'posts' ? "Search posts..." : "Search users..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </form>
      </div>

      <div className="search-results">
        {loading ? (
          <div className="loading-spinner">Searching...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : searchResults.length === 0 ? (
          <div className="no-results">
            {searchQuery ? 'No results found. Try a different search term.' : 'Search for posts or users above.'}
          </div>
        ) : activeTab === 'posts' ? (
          // Display post results
          <div className="posts-results">
            {searchResults.map(post => (
              <div 
                key={post.id} 
                onClick={() => navigate(`/post/${post.id}`)} 
                style={{ cursor: 'pointer', display: 'block' }} 
              >
                <Post 
                  post={post} 
                  onLike={handleLike} 
                  onRepost={handleRepost} 
                  onBookmark={handleBookmark} 
                  liked={post.likes?.includes(currentUser?.id)} 
                  reposted={post.reposts?.includes(currentUser?.id)} 
                  isBookmarked={post.bookmarks?.some(b => b.user_id === currentUser?.id)} 
                  isOwner={post.user_id === currentUser?.id} 
                />
              </div>
            ))}
          </div>
        ) : (
          // Display user results
          <div className="users-results">
            {searchResults.map(user => (
              <div 
                key={user.id} 
                className="user-card"
                onClick={() => navigate(`/profile/${user.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="user-avatar">
                  <img 
                    src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random`} 
                    alt={user.name || 'User'}
                  />
                </div>
                <div className="user-info">
                  <h3 className="user-name">{user.name}</h3>
                  {user.username && <p className="user-username">@{user.username}</p>}
                  {user.bio && <p className="user-bio">{user.bio}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
