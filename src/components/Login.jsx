import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { login, signup, isAuthenticated } = useAuth();

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isLogin) {
      // Additional sign-up validation
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (!username) {
        setError('Please enter a username');
        return;
      }
    }

    try {
      if (isLogin) {
        console.log('Logging in with:', { email });
        const { error } = await login(email, password);
        if (error) {
          setError(error.message || 'Failed to log in');
        }
      } else {
        console.log('Signing up with:', { email, username });
        const { data, error } = await signup(email, password, username);
        
        if (error) {
          setError(error.message || 'Failed to sign up');
          return;
        }
        
        // When signup is successful, show success message
        if (data) {
          setSuccess('Registration successful! Please check your email to confirm your account.');
          // Clear the form
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setUsername('');
        }
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Golfx</h1>
          <h2>{isLogin ? 'Log in to Golfx' : 'Sign up for Golfx'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
              />
            </div>
          )}

          {/* Error message */}
          {error && <div className="error-message">{error}</div>}

          {/* Success message */}
          {success && <div className="success-message">{success}</div>}

          <button type="submit" className="login-button">
            {isLogin ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button type="button" className="toggle-button" onClick={toggleMode}>
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
