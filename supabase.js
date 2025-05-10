import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Storage bucket names
export const STORAGE_BUCKETS = {
  AVATARS: 'avatars',
  BANNERS: 'banners',
  POST_MEDIA: 'post_media'
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions for common database operations

// Delete image from storage
export const deleteImage = async (url, bucket) => {
  if (!url) return;
  try {
    // Extract the file path from the URL
    const path = url.split(`${bucket}/`)[1];
    if (!path) return;

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteImage:', error);
    throw error;
  }
};

// Process media file before upload
export const processMediaFile = async (file, maxWidth = 1200, maxHeight = 1200) => {
  return new Promise((resolve, reject) => {
    try {
      // Check if it's a valid file
      if (!file || !(file instanceof File)) {
        console.error('Invalid file provided:', file);
        console.error('File type:', typeof file);
        console.error('File value:', JSON.stringify(file, null, 2));
        reject(new Error('Invalid file provided'));
        return;
      }
      
      console.log('Processing media file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      });
      
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        console.log('Not an image or video, returning original file');
        resolve(file);
        return;
      }
      
      if (isImage) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Get the extension from the original file name
          const fileExt = file.name.split('.').pop() || 'jpg';
          const newFileName = `${file.name.split('.')[0] || 'image'}.${fileExt}`;
          
          // Convert to blob with quality 0.8 for JPEG
          canvas.toBlob(
            (blob) => {
              resolve(new File([blob], newFileName, { type: file.type }));
            },
            file.type,
            0.8
          );
        };
        img.onerror = () => {
          console.error('Error loading image');
          resolve(file); // Return original file if there's an error
        };
        img.src = URL.createObjectURL(file);
      } else if (isVideo) {
        // For videos, we'll just verify the size for now
        // Future enhancement: implement video compression
        const maxSize = 50 * 1024 * 1024; // 50MB limit
        if (file.size > maxSize) {
          reject(new Error('Video file size must be less than 50MB'));
          return;
        }
        resolve(file);
      }
    } catch (error) {
      console.error('Error processing media file:', error);
      reject(error);
    }
  });
};

// Upload image to storage
export const uploadImage = async (file, bucket, userId, previousUrl = null) => {
  // Delete previous image if it exists
  if (previousUrl) {
    await deleteImage(previousUrl, bucket);
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Convert file to blob with correct content type
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    throw error;
  }
};

// Upload media for posts (images or videos)
export const uploadPostMedia = async (file, postId, userId, previousUrl = null) => {
  // Delete previous media if it exists
  if (previousUrl) {
    await deleteImage(previousUrl, STORAGE_BUCKETS.POST_MEDIA);
  }

  try {
    // Process the media file (resize/optimize)
    const processedFile = await processMediaFile(file);
    console.log('Media file processed successfully:', processedFile);
    
    // Get proper file extension from the MIME type
    let fileExt = '';
    if (processedFile.type.includes('/')) {
      // For image/jpeg -> jpeg, video/mp4 -> mp4, etc.
      fileExt = processedFile.type.split('/')[1];
      // Handle special cases
      if (fileExt === 'jpeg') fileExt = 'jpg';
      if (fileExt.includes('+')) fileExt = fileExt.split('+')[0]; // For types like 'image/svg+xml'
    } else if (processedFile.name && processedFile.name.includes('.')) {
      // Fallback to file name
      fileExt = processedFile.name.split('.').pop();
    } else {
      // Default fallbacks based on general type
      if (processedFile.type.startsWith('image/')) fileExt = 'jpg';
      else if (processedFile.type.startsWith('video/')) fileExt = 'mp4';
      else fileExt = 'bin'; // Generic binary
    }
    
    // Generate unique filename with proper extension
    const fileName = `${userId}/${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    
    console.log('Uploading file with name:', fileName, 'type:', processedFile.type, 'extension:', fileExt);
    
    // Upload to storage
    const { error: uploadError } = await supabase
      .storage
      .from(STORAGE_BUCKETS.POST_MEDIA)
      .upload(fileName, processedFile, {
        contentType: processedFile.type,
        cacheControl: '3600'
      });
      
    if (uploadError) {
      console.error('Error uploading media:', uploadError);
      throw uploadError;
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from(STORAGE_BUCKETS.POST_MEDIA)
      .getPublicUrl(fileName);
    
    console.log('Media uploaded successfully, public URL:', publicUrl);
    
    // Create media record
    const mediaType = processedFile.type.startsWith('image') ? 'image' :
                      processedFile.type.startsWith('video') ? 'video' :
                      'unknown'; // Basic mapping based on MIME type

    const { error: mediaError } = await supabase
      .from('media')
      .insert([{ 
        post_id: postId,
        media_url: publicUrl,
        media_type: mediaType // Use the mapped simple type
      }]);
    
    if (mediaError) {
      console.error('Error creating media record:', mediaError);
      throw mediaError;
    }
    
    console.log('Media record created successfully for post:', postId);
    return publicUrl;
  } catch (error) {
    console.error('Error in uploadPostMedia:', error);
    throw error;
  }
};


// Profiles
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  return { data, error };
};

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
    
  return { data, error };
};

// Posts
export const getPosts = async (currentUserId) => {
  console.log('[supabase] Fetching posts for user:', currentUserId);
  console.log('[supabase] Starting posts query...');
  const query = supabase
    .from('posts')
    .select(`
      id,
      user_id,
      content,
      created_at,
      media:media(id, media_url, media_type),
      likes:likes(user_id),
      reposts:reposts(user_id, created_at),
      comments:comments(id),
      bookmarks:bookmarks(user_id),
      quoted_post_id,
      quoted_post:quoted_post_id!left (
        id,
        user_id,
        content,
        created_at,
        media:media(id, media_url, media_type),
        likes:likes(user_id),
        reposts:reposts(user_id, created_at),
        comments:comments(id),
        bookmarks:bookmarks(user_id)
      )
    `)
    .order('created_at', { ascending: false });
 
  let { data: posts, error } = await query;

  if (error) {
    console.error('[supabase] Error fetching posts:', error);
    return { posts: [], error };
  }

  console.log('[supabase] Raw posts data:', posts);

  // Process data to ensure consistency and calculate counts
  console.log('[supabase] Processing posts data...');
  const processedData = posts.map(item => ({
    ...item,
    likes: item.likes || [],
    reposts: item.reposts || [],
    bookmarks: item.bookmarks || [],
    media: item.media || [],
    comment_count: item.comments?.length || 0,
    quoted_post: item.quoted_post ? {
      ...item.quoted_post,
      likes: item.quoted_post.likes || [],
      reposts: item.quoted_post.reposts || [],
      bookmarks: item.quoted_post.bookmarks || [],
      media: item.quoted_post.media || [],
      comment_count: item.quoted_post.comments?.length || 0
    } : null
  }));

  console.log('[supabase] Processed posts data:', processedData);
  return { data: processedData, error: null };
};

export const getPostById = async (postId) => {
  console.log(`supabase.js: Fetching post by ID: ${postId}`);
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles:user_id(id, name, avatar_url),
      media(id, media_url, media_type),
      comment_count:comments(count),
      likes(user_id),
      reposts(user_id),
      comments(*)
    `)
    .eq('id', postId)
    .single();
    
  return { data, error };
};

export const createPost = async (userId, content, mediaFile = null) => {
  try {
    console.log('createPost called with:', { userId, content, mediaFile });
    
    // First create the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert([
        { user_id: userId, content }
      ])
      .select()
      .single();
      
    if (postError) {
      console.error('Error creating post:', postError);
      throw postError;
    }
    
    console.log('Post created successfully:', post);
    
    // If there's media, upload it using our dedicated function
    if (mediaFile) {
      try {
        console.log('Uploading media for post:', post.id);
        // Use the uploadPostMedia function which handles processing, uploading, and creating the media record
        const mediaUrl = await uploadPostMedia(mediaFile, post.id, userId);
        console.log('Media uploaded successfully for post:', post.id, 'URL:', mediaUrl);
      } catch (mediaError) {
        console.error('Error processing media:', mediaError);
        // Continue with post creation even if media processing fails
      }
    }
    
    // Get the complete post with media
    const { data: completePost, error: fetchError } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id(id, name, avatar_url),
        media(id, media_url, media_type),
        likes(user_id),
        reposts(user_id),
        comments(count)
      `)
      .eq('id', post.id)
      .single();

    if (fetchError) throw fetchError;
    
    return { data: completePost };
  } catch (error) {
    console.error('Error in createPost:', error);
    return { error };
  }
};

// Create a quote post - creates a new post that quotes another post
export const createQuotePost = async (userId, originalPostId, userQuoteContent) => {
  console.log(`[supabase] Creating quote post: user ${userId}, quoting post ${originalPostId}, content: "${userQuoteContent}"`);
 
  // Create the new post, storing the user's comment directly
  // and the ID of the post being quoted in the new column.
  const { data: newPost, error: insertError } = await supabase
    .from('posts')
    .insert([
      {
        user_id: userId,
        content: userQuoteContent, // Save only the user's comment
        quoted_post_id: originalPostId // Save the ID of the quoted post
      }
    ])
    .select(`
      id,
      user_id,
      content,
      created_at,
      quoted_post_id,
      profiles:user_id(id, name, avatar_url),
      media(id, media_url, media_type),
      likes(user_id),
      reposts(user_id),
      comments(count),
      quoted_post:quoted_post_id (
        id,
        user_id,
        content,
        created_at,
        quoted_post_id,
        profiles:user_id (id, name, avatar_url),
        media (id, media_url, media_type),
        likes:likes (user_id),
        reposts:reposts (user_id)
      )
    `)
    .single();

  if (insertError) {
    console.error('[supabase] Error creating quote post:', insertError);
    return { data: null, error: insertError };
  }

  console.log('[supabase] Successfully created quote post:', newPost);
  return { data: newPost, error: null };
};

export const updatePost = async (postId, userId, content) => {
  const { data, error } = await supabase
    .from('posts')
    .update({ content })
    .eq('id', postId)
    .eq('user_id', userId);
    
  return { data, error };
};

export const deletePost = async (postId, userId) => {
  const { data, error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId);
    
  return { data, error };
};

// Likes
export const toggleLike = async (postId, userId) => {
  // Check if the like exists
  const { data: existingLike } = await supabase
    .from('likes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
    
  if (existingLike) {
    // Unlike
    const { data, error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
      
    return { data, error, action: 'unliked' };
  } else {
    // Like
    const { data, error } = await supabase
      .from('likes')
      .insert([
        { post_id: postId, user_id: userId }
      ]);
      
    return { data, error, action: 'liked' };
  }
};

// Reposts
export const toggleRepost = async (postId, userId) => {
  // Check if the repost exists
  const { data: existingRepost } = await supabase
    .from('reposts')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
    
  if (existingRepost) {
    // Unrepost
    const { data, error } = await supabase
      .from('reposts')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
      
    return { data, error, action: 'unreposted' };
  } else {
    // Repost
    const { data, error } = await supabase
      .from('reposts')
      .insert([
        { post_id: postId, user_id: userId }
      ]);
      
    return { data, error, action: 'reposted' };
  }
};

// Comments
export const getComments = async (postId) => {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      profiles:user_id(id, name, avatar_url)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
    
  return { data, error };
};

export const addComment = async (postId, userId, content) => {
  const { data, error } = await supabase
    .from('comments')
    .insert([
      { post_id: postId, user_id: userId, content }
    ])
    .select(`
      *,
      profiles:user_id(id, name, avatar_url)
    `)
    .single();
    
  return { data, error };
};

export const deleteComment = async (commentId) => {
  console.log(`supabase.js: Attempting to delete comment with ID: ${commentId}`);
  // RLS policies in Supabase should handle the authorization check
  // based on whether the authenticated user is the comment author
  // OR the owner of the original post.
  const { data, error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId); // Match the comment ID

  if (error) {
    console.error(`supabase.js: Error deleting comment ${commentId}:`, error);
  } else {
    console.log(`supabase.js: Successfully deleted comment ${commentId}`);
  }

  return { data, error };
};

// Bookmarks
export const getBookmarkedPosts = async (userId) => {
  if (!userId) {
    console.error("getBookmarkedPosts: userId is required");
    return { data: [], error: new Error("User ID is required") };
  }

  try {
    // 1. Get the IDs of the posts bookmarked by the user
    const { data: bookmarkData, error: bookmarkError } = await supabase
      .from('bookmarks')
      .select('post_id')
      .eq('user_id', userId);

    if (bookmarkError) {
      console.error("Error fetching bookmark IDs:", bookmarkError);
      throw bookmarkError;
    }

    const postIds = bookmarkData.map(b => b.post_id);

    if (!postIds || postIds.length === 0) {
      // No bookmarks found, return empty array
      return { data: [], error: null };
    }

    // 2. Fetch the full post details for those IDs
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        user_id,
        content,
        created_at,
        media:media(id, media_url, media_type),
        likes:likes(user_id),
        reposts:reposts(user_id, created_at),
        comments:comments!left(id),
        bookmarks:bookmarks(user_id),
        quoted_post_id,
        quoted_post:quoted_post_id!left( 
          id, 
          user_id,
          content,
          created_at,
          media:media(id, media_url, media_type),
          likes:likes(user_id),
          reposts:reposts(user_id, created_at),
          comments:comments!left(id),
          bookmarks:bookmarks(user_id) 
        )
      `)
      .in('id', postIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching bookmarked posts:", error);
      throw error;
    }

    // Note: Profiles need to be fetched separately as in Feed.jsx
    // This function only returns the raw post data.

    return { data, error: null };

  } catch (error) {
    console.error("Exception in getBookmarkedPosts:", error);
    return { data: [], error };
  }
};

export const toggleBookmark = async (postId, userId) => {
  if (!userId) {
    console.error("toggleBookmark: userId is required");
    return { data: null, error: { message: 'User ID is required' } };
  }

  console.log(`Toggling bookmark for post ${postId} by user ${userId}`);
  // Check if the bookmark exists
  const { data: existingBookmark, error: checkError } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking for existing bookmark:', checkError);
    return { error: checkError };
  }

  if (existingBookmark) {
    // Unbookmark
    console.log('Bookmark exists, deleting...');
    const { error: deleteError } = await supabase
      .from('bookmarks')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting bookmark:', deleteError);
      return { error: deleteError };
    }
    return { action: 'unbookmarked' };
  } else {
    // Bookmark
    console.log('Bookmark does not exist, inserting...');
    const { error: insertError } = await supabase
      .from('bookmarks')
      .insert({ post_id: postId, user_id: userId });

    if (insertError) {
      console.error('Error inserting bookmark:', insertError);
      return { error: insertError };
    }
    return { action: 'bookmarked' };
  }
};

export const getBookmarks = async (userId) => {
  const { data, error } = await supabase
    .from('bookmarks')
    .select(`
      post_id,
      posts!inner(
        *,
        profiles:user_id(id, name, avatar_url),
        media(*),
        likes(user_id),
        reposts(user_id),
        comments(count)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  return { data, error };
};

// Follows
// Check if the current user is following a profile user
export const checkIfFollowing = async (currentUserId, profileUserId) => {
  if (!currentUserId || !profileUserId) return false;
  const { data, error, count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true }) // More efficient check
    .eq('follower_id', currentUserId)
    .eq('following_id', profileUserId);

  if (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
  return count > 0;
};

// Follow or unfollow a user
export const toggleFollow = async (currentUserId, profileUserId) => {
  if (!currentUserId || !profileUserId || currentUserId === profileUserId) {
    return { data: null, error: { message: 'Invalid user IDs provided.' }, action: null };
  }

  const isFollowing = await checkIfFollowing(currentUserId, profileUserId);

  if (isFollowing) {
    // Unfollow
    console.log(`Attempting to unfollow: ${currentUserId} unfollowing ${profileUserId}`);
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', profileUserId);

    if (error) console.error('Unfollow error:', error);
    return { data: null, error, action: 'unfollowed' };
  } else {
    // Follow
    console.log(`Attempting to follow: ${currentUserId} following ${profileUserId}`);
    const { data, error } = await supabase
      .from('follows')
      .insert([{ follower_id: currentUserId, following_id: profileUserId }])
      .select(); // Select to confirm insertion
      
    if (error) console.error('Follow error:', error);
    return { data, error, action: 'followed' };
  }
};

// Get following and follower counts for a user using the profile columns
export const getFollowCounts = async (userId) => {
  if (!userId) return { following: 0, followers: 0 };
  const { data, error } = await supabase
    .from('profiles')
    .select('following_count, followers_count')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error getting follow counts:', error);
    return { following: 0, followers: 0 };
  }
  // Use optional chaining and nullish coalescing for safety
  return { following: data?.following_count ?? 0, followers: data?.followers_count ?? 0 };
};

// Get the list of users someone is following
export const getFollowing = async (userId) => {
  if (!userId) return { data: [], error: null };
  const { data, error } = await supabase
    .from('follows')
    .select(`
      following_id,
      profiles:following_id (id, name, avatar_url)
    `)
    .eq('follower_id', userId);
    
  return { data: data?.map(item => item.profiles) || [], error };
};

// Get the list of users who follow someone
export const getFollowers = async (userId) => {
  if (!userId) return { data: [], error: null };
  const { data, error } = await supabase
    .from('follows')
    .select(`
      follower_id,
      profiles:follower_id (id, name, avatar_url)
    `)
    .eq('following_id', userId);
    
  return { data: data?.map(item => item.profiles) || [], error };
};

// Fetch profiles by IDs
export const getProfilesByIds = async (userIds) => {
  if (!userIds || userIds.length === 0) {
    return { data: [], error: null };
  }
  console.log('[supabase] Fetching profiles for IDs:', userIds);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', userIds);

  if (error) {
    console.error('[supabase] Error fetching profiles by IDs:', error);
  }

  return { data, error };
};
