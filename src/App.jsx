import React from 'react';
import './App.css';
import Feed from './components/Feed';
import Navbar from './components/Navbar';
import PostDetail from './components/PostDetail';
import Bookmarks from './components/Bookmarks';
import Profile from './components/Profile';
import ProfileDebug from './components/ProfileDebug';
import Explore from './components/Explore';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <div className="app-layout">
                  <div className="app-container">
                    <Navbar />
                    <main className="main-content">
                      <header className="main-header">
                        <h1>Golfx</h1>
                      </header>
                      <Feed />
                    </main>
                  </div>
                </div>
              </PrivateRoute>
            }
          />
          <Route
            path="/post/:id"
            element={
              <PrivateRoute>
                <div className="app-layout">
                  <div className="app-container">
                    <Navbar />
                    <main className="main-content">
                      <header className="main-header">
                        <h1>Golfx</h1>
                      </header>
                      <PostDetail />
                    </main>
                  </div>
                </div>
              </PrivateRoute>
            }
          />
          <Route
            path="/bookmarks"
            element={
              <PrivateRoute>
                <div className="app-layout">
                  <div className="app-container">
                    <Navbar />
                    <main className="main-content">
                      <header className="main-header">
                        <h1>Bookmarks</h1>
                      </header>
                      <Bookmarks />
                    </main>
                  </div>
                </div>
              </PrivateRoute>
            }
          />
          <Route
            path="/explore"
            element={
              <PrivateRoute>
                <div className="app-layout">
                  <div className="app-container">
                    <Navbar />
                    <main className="main-content">
                      <header className="main-header">
                        <h1>Explore</h1>
                      </header>
                      <Explore />
                    </main>
                  </div>
                </div>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <div className="app-layout">
                  <div className="app-container">
                    <Navbar />
                    <main className="main-content">
                      <header className="main-header">
                        <h1>Profile</h1>
                      </header>
                      <Profile />
                    </main>
                  </div>
                </div>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile/:userId"
            element={
              <PrivateRoute>
                <div className="app-layout">
                  <div className="app-container">
                    <Navbar />
                    <main className="main-content">
                      <header className="main-header">
                        <h1>Profile</h1>
                      </header>
                      <Profile />
                    </main>
                  </div>
                </div>
              </PrivateRoute>
            }
          />
          <Route
            path="/debug/profile"
            element={
              <PrivateRoute>
                <div className="app-layout">
                  <div className="app-container">
                    <Navbar />
                    <main className="main-content">
                      <header className="main-header">
                        <h1>Profile Debug Tool</h1>
                      </header>
                      <ProfileDebug />
                    </main>
                  </div>
                </div>
              </PrivateRoute>
            }
          />
          {/* Redirect any unmatched routes to login */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;