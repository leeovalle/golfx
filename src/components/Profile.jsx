import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 
import { supabase, getProfile, getProfilesByIds, uploadImage, STORAGE_BUCKETS, checkIfFollowing, toggleFollow, getFollowCounts, addComment } from '../../supabase'; 
import EditProfile from './EditProfile';
import ProfileHeader from './ProfileHeader';
import ProfileTabs from './ProfileTabs';
import ProfileContent from './ProfileContent';
import './Twitter.css';

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  
  // States
  const [activeTab, setActiveTab] = useState('posts');
  const [userContent, setUserContent] = useState([]);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCounts, setFollowCounts] = useState({ following: 0, followers: 0 });
  
  // Determine if we're viewing the current user's profile or someone else's
  const isCurrentUserProfile = !userId || userId === currentUser?.id;
  const profileId = isCurrentUserProfile ? currentUser?.id : userId;
  
  // Load user profile data
  useEffect(() => {
    const loadProfileData = async () => {
      if (!profileId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const { data: profile, error: profileError } = await getProfile(profileId);
        
        if (profileError) throw profileError;
        
        if (profile) {
          setUserData(profile);
        } else if (isCurrentUserProfile && currentUser) {
          setUserData(currentUser);
        } else {
          setError('Profile not found');
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    
    loadProfileData();
  }, [profileId, isCurrentUserProfile, currentUser]);
  
  // Load follow status and counts
  useEffect(() => {
    const loadFollowData = async () => {
      if (!profileId || !currentUser || isCurrentUserProfile) return; 
      
      try {
        // Check follow status
        const followingStatus = await checkIfFollowing(currentUser.id, profileId);
        setIsFollowing(followingStatus);
        
        // Get follow counts (can run even if current user profile, but fetched above too)
        const counts = await getFollowCounts(profileId);
        setFollowCounts(counts);
        console.log(`Follow status: ${followingStatus}, Counts:`, counts);

      } catch (err) {
        console.error('Error loading follow data:', err);
        // Optionally set an error state specific to follow data
      }
    };
    
    loadFollowData();
  }, [profileId, currentUser, isCurrentUserProfile]); 
  
  // **** START: Add Comment Handler ****
  const handleAddComment = async (postId, commentText) => {
    if (!currentUser || !commentText.trim()) return;
    console.log(`[Profile] Attempting to add comment to post ${postId}:`, commentText);

    try {
      setLoading(true); // Indicate activity
      const { data: newCommentData, error: commentError } = await addComment(postId, currentUser.id, commentText);

      if (commentError) {
        throw commentError;
      }

      console.log('[Profile] addComment call completed without error. Assuming success and updating UI.');
      
      // Update the userContent state
      setUserContent(prevContent => 
        prevContent.map(post => {
          if (post.id === postId) {
            console.log(`[Profile] Optimistically updating count for post ${postId}. Old count: ${post.comment_count}`); 
            const newCommentCount = (post.comment_count || 0) + 1;
            console.log(`[Profile] New count calculated: ${newCommentCount}`);
            return {
              ...post,
              comment_count: newCommentCount
            };
          }
          return post;
        })
      );
      // Maybe close modal implicitly or via state passed down?

    } catch (err) {
      setLoading(false); // Ensure loading stops on error
      console.error('[Profile] Unexpected error adding comment:', err);
      setError('Failed to submit comment.'); // Display error to user?
    } finally {
      setLoading(false);
    }
  };
  // **** END: Add Comment Handler ****

  // Load content based on active tab
  useEffect(() => {
    const loadContent = async () => {
      if (!profileId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all posts, including quoted post details, but not profiles directly
        const { data: allPostsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            *,
            user_id,
            media(id, media_url, media_type),
            likes(user_id),
            reposts(user_id),
            comments(count), 
            quoted_post_id,
            quoted_post:quoted_post_id (
              *,
              user_id,
              media(id, media_url, media_type),
              likes(user_id),
              reposts(user_id)
            )
          `)
          .order('created_at', { ascending: false }); // Add ordering if needed
        
        if (postsError) throw postsError;
        
        console.log('[Profile.jsx] Raw allPostsData:', allPostsData);
        
        // Collect all unique user IDs from posts and quoted posts
        const userIds = new Set();
        allPostsData.forEach(post => {
          userIds.add(post.user_id);
          if (post.quoted_post?.user_id) {
            userIds.add(post.quoted_post.user_id);
          }
          // Add user IDs from comments if/when fetching comment authors
        });
        
        // Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await getProfilesByIds([...userIds]);
        
        if (profilesError) {
          console.error('Error fetching profiles for profile page:', profilesError);
          // Continue rendering posts, but profile info might be missing
        }
        
        // Create a map for easy profile lookup
        const profilesMap = new Map();
        profilesData?.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
        
        // Function to merge profile data into a post object
        const mergeProfiles = (post) => {
          return {
            ...post,
            profiles: profilesMap.get(post.user_id) || { id: post.user_id },
            quoted_post: post.quoted_post ? {
              ...post.quoted_post,
              profiles: profilesMap.get(post.quoted_post.user_id) || { id: post.quoted_post.user_id }
            } : null,
            // Ensure other arrays are initialized
            likes: post.likes?.map(l => l.user_id) || [],
            reposts: post.reposts?.map(r => r.user_id) || [],
            media: post.media || [],
            // comments: post.comments, // Keep the original [{count: N}] array if needed elsewhere
            comment_count: post.comments?.[0]?.count || 0 // Get count from the object inside the array
          };
        };
        
        let content = [];
        
        switch (activeTab) {
          case 'posts':
            const filteredPosts = allPostsData.filter(post => post.user_id === profileId);
            console.log(`[Profile.jsx - Tab: posts] Filtered posts (${filteredPosts.length}):`, filteredPosts);
            content = filteredPosts.map(post => ({ ...mergeProfiles(post), type: 'post' }));
            console.log(`[Profile.jsx - Tab: posts] Merged content (${content.length}):`, content);
            break;
            
          case 'likes':
            const { data: userLikes, error: likesError } = await supabase
              .from('likes')
              .select('post_id')
              .eq('user_id', profileId);
              
            if (likesError) throw likesError;
            
            const likedPostIds = userLikes.map(like => like.post_id);
            
            const filteredLikes = allPostsData.filter(post => likedPostIds.includes(post.id));
            console.log(`[Profile.jsx - Tab: likes] Filtered liked posts (${filteredLikes.length}):`, filteredLikes);
            content = filteredLikes.map(post => ({ ...mergeProfiles(post), type: 'post' }));
            console.log(`[Profile.jsx - Tab: likes] Merged content (${content.length}):`, content);
            break;
            
          case 'reposts':
            const { data: userReposts, error: repostsError } = await supabase
              .from('reposts')
              .select('post_id')
              .eq('user_id', profileId);
              
            if (repostsError) throw repostsError;
            
            const repostedPostIds = userReposts.map(repost => repost.post_id);
            
            const filteredReposts = allPostsData.filter(post => repostedPostIds.includes(post.id));
            console.log(`[Profile.jsx - Tab: reposts] Filtered reposted posts (${filteredReposts.length}):`, filteredReposts);
            content = filteredReposts.map(post => ({ ...mergeProfiles(post), type: 'post' }));
            console.log(`[Profile.jsx - Tab: reposts] Merged content (${content.length}):`, content);
            break;
            
          case 'comments':
            const { data: userComments, error: commentsError } = await supabase
              .from('comments')
              .select(`
                *,
                profiles:user_id(id, name, avatar_url),
                posts(*,
                  profiles:user_id(id, name, avatar_url),
                  likes(user_id),
                  reposts(user_id),
                  comments(count)
                )
              `)
              .eq('user_id', profileId);
              
            if (commentsError) throw commentsError;
            
            content = userComments.map(comment => ({
              ...comment,
              userId: comment.user_id,
              postId: comment.post_id,
              user: comment.profiles,
              post: comment.posts,
              postUser: comment.posts?.profiles,
              type: 'comment'
            }));
            break;
            
          case 'media':
            const filteredMedia = allPostsData.filter(post => post.user_id === profileId && post.media && post.media.length > 0); 
            console.log(`[Profile.jsx - Tab: media] Filtered media posts (${filteredMedia.length}):`, filteredMedia);
            content = filteredMedia.map(post => ({ ...mergeProfiles(post), type: 'post' }));
            console.log(`[Profile.jsx - Tab: media] Merged content (${content.length}):`, content);
            break;
            
          default:
            content = [];
        }
        
        console.log('[Profile.jsx] Final content before setUserContent:', content);
        setUserContent(content);
      } catch (err) {
        console.error(`Error loading ${activeTab}:`, err);
        setError(`Failed to load ${activeTab} content`);
      } finally {
        setLoading(false);
      }
    };
    
    if (profileId) {
      loadContent();
    }
  }, [activeTab, profileId]);
  
  // Handle post interactions
  const handleLike = async (postId) => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login');
      return;
    }
    
    try {
      // Check if post is already liked
      const { data: existingLike } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', currentUser.id)
        .maybeSingle();
        
      if (existingLike) {
        // Unlike post
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);
      } else {
        // Like post
        await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: currentUser.id });
      }
      
      // Refresh content
      const updatedContent = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id(id, name, avatar_url),
          likes(user_id),
          reposts(user_id),
          comments(count)
        `)
        .eq('id', postId)
        .single();
        
      // Update the post in the userContent array
      setUserContent(prevContent =>
        prevContent.map(post =>
          post.id === postId
            ? {
                ...updatedContent.data,
                userId: updatedContent.data.user_id,
                user: updatedContent.data.profiles,
                type: post.type
              }
            : post
        )
      );
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };
  
  const handleRepost = async (postId) => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login');
      return;
    }
    
    try {
      // Implementation similar to handleLike
      const { data: existingRepost } = await supabase
        .from('reposts')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', currentUser.id)
        .maybeSingle();
        
      if (existingRepost) {
        await supabase
          .from('reposts')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);
      } else {
        await supabase
          .from('reposts')
          .insert({ post_id: postId, user_id: currentUser.id });
      }
      
      // Update UI similar to handleLike
      // ...
    } catch (err) {
      console.error('Error toggling repost:', err);
    }
  };
  
  const handleEditPost = async (postId, newContent) => {
    if (!isAuthenticated || !currentUser) return;
    
    try {
      await supabase
        .from('posts')
        .update({ content: newContent })
        .eq('id', postId)
        .eq('user_id', currentUser.id);
        
      // Update locally
      setUserContent(prevContent =>
        prevContent.map(post =>
          post.id === postId
            ? { ...post, content: newContent }
            : post
        )
      );
    } catch (err) {
      console.error('Error editing post:', err);
    }
  };
  
  const handleDeletePost = async (postId) => {
    if (!isAuthenticated || !currentUser) return;
    
    try {
      await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', currentUser.id);
        
      // Remove locally
      setUserContent(prevContent => 
        prevContent.filter(post => post.id !== postId)
      );
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };
  
  // Profile edit functions
  const toggleEditProfile = () => {
    setIsEditProfileOpen(!isEditProfileOpen);
  };
  
  const handleProfileUpdate = async (updatedProfile) => {
    if (!isAuthenticated || !currentUser) return;
    
    try {
      const updates = {
        name: updatedProfile.name,
        bio: updatedProfile.bio
      };

      // Handle profile picture upload
      if (updatedProfile.profilePicture) {
        try {
          const avatarUrl = await uploadImage(
            updatedProfile.profilePicture,
            STORAGE_BUCKETS.AVATARS,
            currentUser.id,
            userData.avatar_url 
          );
          updates.avatar_url = avatarUrl;
        } catch (err) {
          console.error('Error uploading profile picture:', err);
        }
      }

      // Handle banner upload
      if (updatedProfile.banner) {
        try {
          const bannerUrl = await uploadImage(
            updatedProfile.banner,
            STORAGE_BUCKETS.BANNERS,
            currentUser.id,
            userData.banner_url 
          );
          updates.banner_url = bannerUrl;
        } catch (err) {
          console.error('Error uploading banner:', err);
        }
      }



      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUser.id);
        
      if (error) throw error;
      
      // Update local state
      setUserData({ ...userData, ...updates });
      setIsEditProfileOpen(false);
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };
  
  // Toggle follow status
  const handleFollowToggle = async () => {
    if (!currentUser || !userData || currentUser.id === userData.id) return;

    // Optimistic UI update
    const currentlyFollowing = isFollowing;
    setIsFollowing(!currentlyFollowing);
    setFollowCounts(prev => ({ 
      ...prev, 
      followers: currentlyFollowing ? prev.followers - 1 : prev.followers + 1 
    }));

    try {
      const { error, action } = await toggleFollow(currentUser.id, userData.id);
      if (error) {
        console.error(`Error ${action} user:`, error);
        // Revert optimistic update on error
        setIsFollowing(currentlyFollowing);
        setFollowCounts(prev => ({ 
          ...prev, 
          followers: currentlyFollowing ? prev.followers + 1 : prev.followers - 1 
        }));
        setError(`Failed to ${action}.`);
      } else {
        console.log(`User successfully ${action}`);
        // Optionally re-fetch counts for consistency, though triggers should handle it
        // const updatedCounts = await getFollowCounts(userData.id);
        // setFollowCounts(updatedCounts);
      }
    } catch (err) {
      console.error('Unexpected error toggling follow:', err);
      // Revert optimistic update on unexpected error
      setIsFollowing(currentlyFollowing);
      setFollowCounts(prev => ({ 
        ...prev, 
        followers: currentlyFollowing ? prev.followers + 1 : prev.followers - 1 
      }));
      setError('An unexpected error occurred.');
    }
  };
  
  // Main loading state
  if (loading && !userData) {
    return <div className="feed"><div className="loading">Loading profile...</div></div>;
  }
  
  // Error state
  if (error && !userData) {
    return <div className="feed"><div className="error">{error}</div></div>;
  }
  
  // No user data
  if (!userData) {
    return <div className="feed"><div className="error">User not found</div></div>;
  }

  return (
    <div className="feed"> 
      <ProfileHeader 
        userData={userData}
        isCurrentUserProfile={isCurrentUserProfile}
        toggleEditProfile={toggleEditProfile}
        toggleFollow={handleFollowToggle}
        isFollowing={isFollowing}
        followCounts={followCounts}
      />
      
      <ProfileTabs 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      
      <ProfileContent 
        activeTab={activeTab}
        userContent={userContent}
        currentUser={currentUser}
        loading={loading}
        error={error}
        handleLike={handleLike}
        handleRepost={handleRepost}
        handleEditPost={handleEditPost}
        handleDeletePost={handleDeletePost}
        handleAddComment={handleAddComment}
      />
      
      {isEditProfileOpen && (
        <EditProfile 
          isOpen={isEditProfileOpen}
          onClose={toggleEditProfile}
          user={userData}
          onSave={handleProfileUpdate}
        />
      )}
    </div>
  );
};

export default Profile;