import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';

import Home from './components/Home';
import Event from './components/Event';
import Favorite from './components/Favorite';
import Login from './components/Login';

import './App.css';

// Railway backend URL
const BACKEND_URL = process.env.REACT_APP_API_URL || 
                    'http://localhost:5000';  // Changed to local for development

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
        return <div>Loading...</div>
    }

    // Page rendering
    return (
        <div className="App">
            <nav className="navbar navbar-expand-lg navbar-light bg-light sticky-top">
                <div className="container-fluid">
                    <img className="mr-5" src='/icon.png' alt='webpage logo' style={{ maxWidth: "45px" }} />

                    <ul className="navbar-nav me-auto" >
                        <li className="nav-item ms-2"><Link className="nav-link" to='/'>Home</Link></li>
                        <li className="nav-item ms-2"><Link className="nav-link" to='/location'>Location list</Link></li>
                        <li className="nav-item ms-2"><Link className="nav-link" to='/event'>Event list</Link></li>
                        <li className="nav-item ms-2"><Link className="nav-link" to='/map'>Map</Link></li>
                        <li className="nav-item ms-2"><Link className="nav-link" to='/favorite'>Favorite list</Link></li>
                        {!user && (
                            <li className="nav-item">
                                <Link className="nav-link" to='/login'>Log In</Link>
                            </li>
                        )}
                    </ul>

                    {user && (
                        <ul className="navbar-nav ms-auto">
                            <li className="nav-item">
                                <span className="nav-link">
                                    <i className="bi bi-person"></i> {user.username}
                                </span>
                            </li>
                            <li className="nav-item">
                                <button className="nav-link btn btn-link" onClick={async () => {
                                    await fetch('/api/logout', {
                                        method: 'POST',
                                        credentials: 'include'
                                    });
                                    setUser(null);
                                    checkAuth();
                                    handleLogout();
                                }}>
                                    Log out
                                </button>
                            </li>
                        </ul>
                    )}
                </div>
            </nav>

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
                    user ? <Navigate to="/" replace /> : <Login setUser={setUser} />
                } />
                <Route path='*' element={
                    <Navigate to={user ? "/" : "/login"} replace />
                } />
            </Routes>
        </div>
    );
}

export default App;
