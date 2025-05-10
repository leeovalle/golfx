import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../context/AuthContext';

const ProfileDebug = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const [sessionData, setSessionData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      setSessionData(data.session);
    }
    checkSession();
  }, []);

  async function createProfile() {
    try {
      setError(null);
      setSuccess(null);
      
      if (!sessionData?.user?.id) {
        setError('No authenticated user found');
        return;
      }
      
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: sessionData.user.id,
          name: sessionData.user.user_metadata?.name || sessionData.user.email.split('@')[0],
          avatar_url: sessionData.user.user_metadata?.avatar_url || 
            `https://ui-avatars.com/api/?name=${encodeURIComponent(sessionData.user.email)}&background=random`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        setError(`Error creating profile: ${error.message}`);
        console.error('Profile creation error:', error);
      } else {
        setSuccess('Profile created successfully!');
        // Fetch the newly created profile
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionData.user.id)
          .single();
        
        setProfileData(data);
      }
    } catch (err) {
      setError(`Unexpected error: ${err.message}`);
      console.error('Unexpected error:', err);
    }
  }

  async function checkProfile() {
    try {
      setError(null);
      if (!sessionData?.user?.id) {
        setError('No authenticated user found');
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionData.user.id)
        .single();
      
      if (error) {
        setError(`Error fetching profile: ${error.message}`);
        console.error('Profile fetch error:', error);
      } else {
        setProfileData(data);
        setSuccess('Profile found!');
      }
    } catch (err) {
      setError(`Unexpected error: ${err.message}`);
      console.error('Unexpected error:', err);
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Profile Debug Tool</h1>
      
      <h2>Authentication Status</h2>
      <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>
        <p><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
        <p><strong>User ID:</strong> {currentUser?.id || 'Not logged in'}</p>
        <p><strong>Email:</strong> {currentUser?.email || 'N/A'}</p>
      </div>

      <h2>Supabase Session</h2>
      <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>
        <p><strong>Session User ID:</strong> {sessionData?.user?.id || 'No session'}</p>
        <p><strong>Session Email:</strong> {sessionData?.user?.email || 'N/A'}</p>
        <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
          {sessionData ? JSON.stringify(sessionData, null, 2) : 'No session data'}
        </pre>
      </div>

      <h2>Profile Data</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <button 
          onClick={checkProfile}
          style={{ padding: '8px 12px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Check Profile
        </button>
        <button 
          onClick={createProfile}
          style={{ padding: '8px 12px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Create Profile
        </button>
      </div>
      
      {error && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>
          {success}
        </div>
      )}
      
      <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
        <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
          {profileData ? JSON.stringify(profileData, null, 2) : 'No profile data'}
        </pre>
      </div>

      <h2>RLS Policy Information</h2>
      <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px', marginBottom: '20px' }}>
        <p>If you're experiencing profile issues, it might be related to Row Level Security (RLS) policies in Supabase.</p>
        <p>For profiles table, you should have these policies:</p>
        <ul>
          <li><strong>Read access:</strong> Allow users to read their own profile</li>
          <li><strong>Insert access:</strong> Allow users to create their own profile</li>
          <li><strong>Update access:</strong> Allow users to update their own profile</li>
        </ul>
        <p>Check your Supabase dashboard to verify these policies are set up correctly.</p>
      </div>
    </div>
  );
};

export default ProfileDebug;
