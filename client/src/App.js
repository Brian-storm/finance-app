import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';

import Home from './components/Home';
import Event from './components/Event';
import Favorite from './components/Favorite';
import Login from './components/Login';

import './App.css';

// Railway backend URL
const BACKEND_URL = process.env.REACT_APP_API_URL || 
                    'https://fina-web-app-production.up.railway.app';

console.log('Backend URL:', BACKEND_URL); // Debug log

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ Single checkAuth function
    async function checkAuth() {
        try {
            console.log('Checking authentication at:', `${BACKEND_URL}/api/check-auth`);
            
            const response = await fetch(`${BACKEND_URL}/api/check-auth`, {
                method: 'GET',
                credentials: 'include', // Important for cookies
                headers: {
                    'Accept': 'application/json',
                },
                // Add timeout
                signal: AbortSignal.timeout(10000)
            });

            console.log('Auth response status:', response.status);
            
            if (response.status === 200) {
                const userData = await response.json();
                console.log('User authenticated:', userData);
                setUser(userData);
                setError(null);
            } else if (response.status === 401) {
                console.log('Not authenticated (401)');
                setUser(null);
                setError(null);
            } else {
                console.log('Unexpected status:', response.status);
                setUser(null);
                setError(`Server error: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed checking authentication:', error);
            setUser(null);
            
            if (error.name === 'TimeoutError') {
                setError('Connection timeout. Please check your internet.');
            } else if (error.name === 'TypeError') {
                setError('Cannot connect to server. Check CORS configuration.');
            } else {
                setError('Connection failed: ' + error.message);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        checkAuth();
        
        // Optional: Refresh auth status periodically
        const intervalId = setInterval(() => {
            if (user) {
                checkAuth();
            }
        }, 5 * 60 * 1000); // Every 5 minutes
        
        return () => clearInterval(intervalId);
    }, []);

    // Handle logout
    const handleLogout = async () => {
        try {
            await fetch(`${BACKEND_URL}/api/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            setUser(null);
            // Refresh auth status
            await checkAuth();
        } catch (error) {
            console.error('Logout failed:', error);
            // Force logout locally anyway
            setUser(null);
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-3">Checking authentication...</p>
                </div>
            </div>
        );
    }

    if (error && !user) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="alert alert-warning text-center">
                    <h4>Connection Issue</h4>
                    <p>{error}</p>
                    <p className="mb-0">Backend URL: {BACKEND_URL}</p>
                    <button 
                        className="btn btn-primary mt-3"
                        onClick={() => {
                            setError(null);
                            setLoading(true);
                            checkAuth();
                        }}
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="App">
            <nav className="navbar navbar-expand-lg navbar-light bg-light sticky-top">
                <div className="container-fluid d-flex justify-content-start align-items-center">
                    <img 
                        className="me-3" 
                        src='/icon.png' 
                        alt='webpage logo' 
                        style={{ maxWidth: "45px" }} 
                    />

                    <ul className="navbar-nav">
                        {/* Always show these links */}
                        <li className="nav-item">
                            <Link className="nav-link" to='/'>Home</Link>
                        </li>
                        <li className="nav-item ms-2">
                            <Link className="nav-link" to='/event'>Event list</Link>
                        </li>
                        <li className="nav-item ms-2">
                            <Link className="nav-link" to='/favorite'>Favorite list</Link>
                        </li>

                        {/* Login link - shows when NO user */}
                        {!user && (
                            <li className="nav-item ms-2">
                                <Link className="nav-link" to='/login'>Log In</Link>
                            </li>
                        )}

                        {/* User info - shows when user exists */}
                        {user && (
                            <>
                                <li className="nav-item ms-3">
                                    <span className="nav-link">
                                        <i className="bi bi-person me-1"></i> {user.username}
                                    </span>
                                </li>
                                <li className="nav-item ms-2">
                                    <button
                                        className="nav-link btn btn-link p-0"
                                        onClick={handleLogout}
                                        style={{ textDecoration: 'none' }}
                                    >
                                        Log out
                                    </button>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </nav>

            {/* Show error banner if there's an error but user is logged in */}
            {error && user && (
                <div className="alert alert-warning alert-dismissible fade show m-3" role="alert">
                    {error}
                    <button 
                        type="button" 
                        className="btn-close" 
                        onClick={() => setError(null)}
                    ></button>
                </div>
            )}

            <Routes>
                <Route path='/' element={
                    user ? <Home /> : <Navigate to="/login" replace />
                } />
                <Route path='/event' element={
                    user ? <Event /> : <Navigate to="/login" replace />
                } />
                <Route path='/favorite' element={
                    user ? <Favorite /> : <Navigate to="/login" replace />
                } />
                <Route path='/login' element={
                    user ? <Navigate to="/" replace /> : 
                    <Login setUser={setUser} checkAuth={checkAuth} />
                } />
                <Route path='*' element={
                    <Navigate to={user ? "/" : "/login"} replace />
                } />
            </Routes>
        </div>
    );
}

export default App;