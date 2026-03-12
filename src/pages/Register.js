// File: src/pages/Register.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Button, InputGroup, Spinner } from 'react-bootstrap';
import axios from '../api/axiosConfig';
import ToastMessage from '../components/ToastMessage';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState('fan'); // only 'fan' or 'artist'
  const [districts, setDistricts] = useState([]);
  const [districtId, setDistrictId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingDistricts, setFetchingDistricts] = useState(true);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const navigate = useNavigate();

  // Basic validations
  const usernameValid = username.trim().length >= 3 && username.trim().length <= 50;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
  const passwordsMatch = password === confirm && confirm.length > 0;
  const districtSelected = !!districtId;
  const formValid = usernameValid && emailValid && passwordValid && passwordsMatch && districtSelected;

  useEffect(() => {
    let cancelled = false;
    async function loadDistricts() {
      setFetchingDistricts(true);
      try {
        const res = await axios.get('/districts'); // expects [{id, name}, ...]
        if (!cancelled) {
          setDistricts(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load districts', err);
        setError('Unable to load districts. Try again later.');
      } finally {
        if (!cancelled) setFetchingDistricts(false);
      }
    }
    loadDistricts();
    return () => { cancelled = true; };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!formValid) {
      setError('Please fix validation errors before submitting.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: role === 'artist' ? 'artist' : 'fan',
        district_id: parseInt(districtId, 10),
      };

      const res = await axios.post('/auth/register', payload);
      // Registration returns user (no token)
      localStorage.setItem('bb_user', JSON.stringify(res.data.user));
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto mt-4" style={{ maxWidth: 620 }}>
      <Card.Body>
        <h3 className="mb-3">Create an account</h3>

        <ToastMessage show={!!error} onClose={() => setError(null)} message={error} variant="danger" />
        <ToastMessage show={!!success} onClose={() => setSuccess(null)} message={success} variant="success" />

        <Form onSubmit={submit} noValidate>
          <Form.Group className="mb-2">
            <Form.Label>Username</Form.Label>
            <Form.Control
              value={username}
              onChange={e => setUsername(e.target.value)}
              isInvalid={username.length > 0 && !usernameValid}
              placeholder="Choose a public username (3-50 chars)"
              required
            />
            <Form.Control.Feedback type="invalid">
              Username must be 3–50 characters.
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              isInvalid={email.length > 0 && !emailValid}
              placeholder="you@example.com"
              required
            />
            <Form.Control.Feedback type="invalid">
              Enter a valid email address.
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Password</Form.Label>
            <InputGroup>
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                isInvalid={password.length > 0 && !passwordValid}
                placeholder="At least 8 characters, letters and numbers"
                required
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </Button>
              <Form.Control.Feedback type="invalid">
                Password must be at least 8 characters and include letters and numbers.
              </Form.Control.Feedback>
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Confirm password</Form.Label>
            <Form.Control
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              isInvalid={confirm.length > 0 && !passwordsMatch}
              placeholder="Re-type your password"
              required
            />
            <Form.Control.Feedback type="invalid">
              Passwords do not match.
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Role</Form.Label>
            <Form.Select value={role} onChange={e => setRole(e.target.value)}>
              <option value="fan">Fan</option>
              <option value="artist">Artist</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>District</Form.Label>
            {fetchingDistricts ? (
              <div>
                <LoadingSpinner size="sm" inline /> Loading districts...
              </div>
            ) : (
              <Form.Select
                value={districtId}
                onChange={e => setDistrictId(e.target.value)}
                isInvalid={!districtSelected && districtId !== ''}
                required
              >
                <option value="">Choose your district</option>
                {districts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Form.Select>
            )}
          </Form.Group>

          <div className="d-grid">
            <Button variant="success" type="submit" disabled={loading || !formValid}>
              {loading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Creating...
                </>
              ) : 'Create account'}
            </Button>
          </div>
        </Form>

        <div className="mt-3 text-muted small">
          Already have an account? <a href="/login">Log in</a>.<br />
          Your email must be unique. If you see an error, try logging in or use a different email.
        </div>
      </Card.Body>
    </Card>
  );
}