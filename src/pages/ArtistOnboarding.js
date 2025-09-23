// File: src/pages/ArtistOnboarding.jsx
import React, { useState, useEffect } from 'react';
import { Card, Form, Button } from 'react-bootstrap';
import axios from '../api/axiosConfig';
import DISTRICTS from '../data/districts';

export default function ArtistOnboarding() {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [district, setDistrict] = useState('');
  const [genres, setGenres] = useState([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const GENRES = ["Afropop","Gospel","Hip-hop","R&B","Reggae","Highlife","Traditional","Dancehall","Jazz","Blues","Electronic"];

  useEffect(() => {
    // prefill with logged-in user if available
    try {
      const u = JSON.parse(localStorage.getItem('bb_user'));
      if (u?.displayName) setDisplayName(u.displayName);
      if (u?.district) setDistrict(u.district);
    } catch (e) {}
  }, []);

  const toggleGenre = (g) => setGenres(gs => gs.includes(g) ? gs.filter(x => x!==g) : [...gs,g]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const payload = { displayName, bio, district, genres, photoUrl };
      // mock: backend will attach/update artist profile for logged in user
      await axios.post('/artist/onboard', payload);
      setMsg('Profile saved. You can now upload tracks from your profile page.');
    } catch (err) {
      setMsg('Failed to save profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto" style={{maxWidth:800}}>
      <Card.Body>
        <h3>Artist Onboarding</h3>
        {msg && <div className="alert alert-info">{msg}</div>}
        <Form onSubmit={submit}>
          <Form.Group className="mb-2">
            <Form.Label>Display name</Form.Label>
            <Form.Control value={displayName} onChange={e=>setDisplayName(e.target.value)} required />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Bio</Form.Label>
            <Form.Control as="textarea" rows={3} value={bio} onChange={e=>setBio(e.target.value)} />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>District</Form.Label>
            <Form.Select value={district} onChange={e=>setDistrict(e.target.value)}>
              <option value="">Select district</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Genres (select a few)</Form.Label>
            <div>
              {GENRES.map(g => (
                <button type="button" key={g} className={`btn btn-sm me-1 mb-1 ${genres.includes(g)?'btn-success':'btn-outline-secondary'}`} onClick={()=>toggleGenre(g)}>{g}</button>
              ))}
            </div>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Photo URL (temporary)</Form.Label>
            <Form.Control value={photoUrl} onChange={e=>setPhotoUrl(e.target.value)} placeholder="/assets/you.jpg or https://..." />
          </Form.Group>

          <div className="d-grid mt-3">
            <Button type="submit" variant="success" disabled={loading}>{loading ? 'Saving...' : 'Save Profile'}</Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
