import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../../supabase';

// Create the authentication context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component that wraps the app and makes auth object available to any child component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Function to log in user
  const login = async (email, password) => {
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message);
        return { error };
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        // If error is not 'no rows returned', it's a real error
        setAuthError(profileError.message);
        return { error: profileError };
      }

      setCurrentUser({
        ...data.user,
        ...profileData,
      });
      setIsAuthenticated(true);
      return { data };
    } catch (error) {
      setAuthError(error.message);
      return { error };
    }
  };

  // Function to sign up user
  const signup = async (email, password, username) => {
    setAuthError(null);

    try {
      // Generate avatar URL
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
      
      // Register the user with metadata for the profile
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: username,
            avatar_url: avatarUrl,
          }
        }
      });

      if (error) {
        setAuthError(error.message);
        return { error };
      }

      // For new signups, we won't immediately log users in since they need to verify their email
      console.log('User created successfully. Verification email sent.');
      
      // Show user as created, but they need to verify email
      if (data.user) {
        // Attempt to create profile, but don't worry if it fails - our RLS policies
        // or database triggers will handle this properly when the user is confirmed
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name: username,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          });
        } catch (profileError) {
          console.log('Profile will be created when user confirms email:', profileError);
        }
        
        // Set dummy user data in state, but don't authenticate until email is verified
        // Supabase will handle the actual authentication when they click the link
        setCurrentUser({
          id: data.user.id,
          email,
          name: username,
          avatar_url: avatarUrl,
          isPendingConfirmation: true,
        });
      }

      return { data };
    } catch (error) {
      setAuthError(error.message);
      return { error };
    }
  };

  // Function to log out user
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setAuthError(error.message);
        return { error };
      }

      setCurrentUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (error) {
      setAuthError(error.message);
      return { error };
    }
  };

  // Check if user is already logged in when the component mounts
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Fetch user profile when signed in
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setCurrentUser({
          ...session.user,
          ...profileData,
        });
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsAuthenticated(false);
      }

      setLoading(false);
    });

    // Initial session check
    const checkUser = async () => {
      console.log('Checking user session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log('Session found:', session.user.id);
        // Fetch user profile when session exists
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        let userProfile = null;
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          
          // Create profile if it doesn't exist (PGRST116 is 'no rows returned')
          if (profileError.code === 'PGRST116') {
            console.log('Profile not found, creating one...');
            // Create a basic profile since the user is authenticated
            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: session.user.id,
                name: session.user.user_metadata?.name || session.user.email.split('@')[0],
                avatar_url: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.email.split('@')[0])}&background=random`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              
            if (createError) {
              console.error('Error creating profile:', createError);
            } else {
              // Fetch the newly created profile
              const { data: newProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
                
              userProfile = newProfile;
            }
          }
        } else {
          console.log('Profile found:', profileData);
        }

        setCurrentUser({
          ...session.user,
          ...profileData,
        });
        setIsAuthenticated(true);
      } else {
        console.log('No session found');
      }
      
      setLoading(false);
    };

    checkUser();

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const value = {
    currentUser,
    isAuthenticated,
    login,
    signup,
    logout,
    loading,
    authError
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
