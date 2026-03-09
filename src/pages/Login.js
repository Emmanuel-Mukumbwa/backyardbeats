// ============================================
// FILE 2: src/pages/Login.js
// ENHANCED - Better storage and error handling
// ============================================

import React, { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Form, Button, Card } from 'react-bootstrap';
import axios from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';
import ToastMessage from '../components/ToastMessage';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    console.log('🔐 Attempting login for:', email);
    
    try {
      const res = await axios.post('/auth/login', { email, password });
      
      console.log('✓ Login response received:', {
        user: res.data.user,
        hasToken: !!res.data.token 
      });
      
      // Validate response
      if (!res.data.token) {
        throw new Error('No token received from server');
      }

      if (!res.data.user || !res.data.user.id) {
        throw new Error('Invalid user data received from server');
      }

      // Save user in AuthContext
      login({ ...res.data.user, token: res.data.token });

      // Persist to localStorage in MULTIPLE formats for reliability
      try {
        const token = res.data.token;
        const user = res.data.user;

        // Primary storage: simple token
        localStorage.setItem('bb_token', token);
        console.log('✓ Saved bb_token');

        // Secondary storage: user object with token
        localStorage.setItem('bb_user', JSON.stringify({ ...user, token }));
        console.log('✓ Saved bb_user');

        // Tertiary storage: structured auth object
        localStorage.setItem('bb_auth', JSON.stringify({ token, user }));
        console.log('✓ Saved bb_auth');

        // Verify storage worked
        const verifyToken = localStorage.getItem('bb_token');
        if (!verifyToken) {
          console.error('❌ Token was not saved');
        }
      } catch (e) {
        console.error('❌ Error saving to localStorage:', e);
      } 

      setSuccess('Login successful! Redirecting...');
      
      setTimeout(() => {
        // Role-based redirect
        const redirectTo = new URLSearchParams(location.search).get('redirectTo');
        
        if (redirectTo) {
          console.log('→ Redirecting to:', redirectTo);
          navigate(redirectTo, { replace: true });
          return;
        }
        
        if (res.data.user.role === 'artist') {
          // Check profile status
          const hasProfile = res.data.user.has_profile || false;

          if (!hasProfile) {
            console.log('→ Artist without profile, redirecting to onboarding');
            navigate('/onboard', { replace: true });
          } else {
            console.log('→ Artist with profile, redirecting to dashboard');
            navigate('/artist/dashboard', { replace: true });
          }
        } else if (res.data.user.role === 'admin') {
          console.log('→ Admin user, redirecting to admin panel');
          navigate('/admin', { replace: true });
        } else {
          console.log('→ Fan user, redirecting to home');
          navigate('/', { replace: true });
        }
      }, 1200);
      
    } catch (err) {
      console.error('❌ Login error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      const errorMessage = err.response?.data?.error 
        || err.response?.data?.message 
        || err.message 
        || 'Login failed. Please try again.';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ToastMessage 
        show={!!error} 
        onClose={() => setError(null)} 
        message={error} 
        variant="danger" 
      />
      <ToastMessage  
        show={!!success} 
        onClose={() => setSuccess(null)} 
        message={success} 
        variant="success" 
      />
      
      <Card className="mx-auto" style={{ maxWidth: 480 }}>
        <Card.Body>
          <h3 className="mb-3">Login</h3>
          <Form onSubmit={submit}>
            <Form.Group className="mb-2">
              <Form.Label>Email</Form.Label>
              <Form.Control 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="Enter your email" 
                required 
                autoComplete="email"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Enter your password"
                required 
                autoComplete="current-password"
              />
            </Form.Group>
            
            <div className="d-grid">
              <Button 
                type="submit" 
                variant="success" 
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </Form>
          
          <div className="mt-3 small">
            No account? <Link to="/register">Register</Link>
          </div>
          
          <div className="mt-2 text-muted small">
            Forgot your password? Contact support or try registering with a different email.
          </div>
        </Card.Body>
      </Card>
    </>
  );
}
 