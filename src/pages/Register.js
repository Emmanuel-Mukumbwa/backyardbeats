// File: src/pages/Register.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Button } from 'react-bootstrap';
import DISTRICTS from '../data/districts';
import axios from '../api/axiosConfig';

export default function Register() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('artist');
  const [district, setDistrict] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = { displayName, email, phone, password, role, district };
      const res = await axios.post('/auth/register', payload);
      localStorage.setItem('bb_token', res.data.token);
      localStorage.setItem('bb_user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto" style={{maxWidth:600}}>
      <Card.Body>
        <h3 className="mb-3">Create an account</h3>
        {error && <div className="alert alert-danger">{error}</div>}
        <Form onSubmit={submit}>
          <Form.Group className="mb-2">
            <Form.Label>Display name</Form.Label>
            <Form.Control value={displayName} onChange={e => setDisplayName(e.target.value)} required />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Phone</Form.Label>
            <Form.Control value={phone} onChange={e => setPhone(e.target.value)} placeholder="099..." />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Password</Form.Label>
            <Form.Control type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Role</Form.Label>
            <Form.Select value={role} onChange={e => setRole(e.target.value)}>
              <option value="artist">Artist</option>
              <option value="fan">Fan</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>District</Form.Label>
            <Form.Select value={district} onChange={e => setDistrict(e.target.value)}>
              <option value="">Select district (optional)</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </Form.Select>
          </Form.Group>

          <div className="d-grid">
            <Button variant="success" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
