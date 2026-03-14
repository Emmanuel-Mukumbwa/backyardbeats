// src/pages/PrivacyPolicy.jsx
import React, { useEffect, useState } from 'react';
import { Container, Card, Spinner } from 'react-bootstrap';
import axios from '../api/axiosConfig';

export default function PrivacyPolicy() {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPolicy();
  }, []);

  async function loadPolicy() {
    setLoading(true);
    try {
      const res = await axios.get('/public/privacy');
      setPolicy(res?.data?.privacy || null);
    } catch (err) {
      console.error('Failed to load privacy policy', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="py-4">
      <h2>Privacy Policy</h2>

      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
        </div>
      ) : null}

      {!loading && !policy ? (
        <div className="text-muted">Privacy Policy is not available at the moment.</div>
      ) : null}

      {policy ? (
        <Card className="mt-3">
          <Card.Body>
            <h4>{policy.title}</h4>
            <div dangerouslySetInnerHTML={{ __html: policy.body }} />
            <div className="text-muted small mt-3">Published: {policy.created_at ? new Date(policy.created_at).toLocaleString() : ''}</div>
          </Card.Body>
        </Card>
      ) : null}
    </Container>
  );
}