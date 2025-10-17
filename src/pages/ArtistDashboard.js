//src/pages/ArtistDashboard.js
import React, { useState, useEffect, useContext } from 'react';
import { Tabs, Tab, Card, Button, Form, Alert, Table, Modal, Row, Col } from 'react-bootstrap';
import axios from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';
import AudioPlayer from '../components/AudioPlayer';
import RatingsList from '../components/RatingsList';
import DISTRICTS from '../data/districts';

const GENRES = ["Afropop", "Gospel", "Hip-hop", "R&B", "Reggae", "Highlife", "Traditional", "Dancehall", "Jazz", "Blues", "Electronic"];

export default function ArtistDashboard() {
  const { user } = useContext(AuthContext);
  const [artist, setArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [events, setEvents] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals and forms
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [trackForm, setTrackForm] = useState({ title: '', file: null });
  const [eventForm, setEventForm] = useState({ title: '', description: '', event_date: '', district_id: '' });
  const [profileForm, setProfileForm] = useState({ display_name: '', bio: '', photo: null, genres: [] });

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    setError(null);
    try {
      const [artistRes, tracksRes, eventsRes, ratingsRes] = await Promise.all([
        axios.get('/artist/me'),
        axios.get('/tracks'),
        axios.get('/events'),
        axios.get(`/artists/${user.id}/ratings`)
      ]);
      setArtist(artistRes.data.artist);
      setTracks(tracksRes.data.filter(t => t.artist_id === user.id));
      setEvents(eventsRes.data.filter(e => e.artist_id === user.id));
      setRatings(ratingsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  // Track CRUD
  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', trackForm.title);
    formData.append('file', trackForm.file);
    try {
      if (editingTrack) {
        await axios.put(`/tracks/${editingTrack.id}`, formData);
      } else {
        await axios.post('/tracks', formData);
      }
      setShowTrackModal(false);
      setTrackForm({ title: '', file: null });
      setEditingTrack(null);
      loadDashboardData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const deleteTrack = async (id) => {
    if (!window.confirm('Delete this track?')) return;
    try {
      await axios.delete(`/tracks/${id}`);
      loadDashboardData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  // Event CRUD
  const handleEventSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await axios.put(`/events/${editingEvent.id}`, eventForm);
      } else {
        await axios.post('/events', eventForm);
      }
      setShowEventModal(false);
      setEventForm({ title: '', description: '', event_date: '', district_id: '' });
      setEditingEvent(null);
      loadDashboardData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await axios.delete(`/events/${id}`);
      loadDashboardData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  // Profile update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('display_name', profileForm.display_name);
    formData.append('bio', profileForm.bio);
    formData.append('genres', JSON.stringify(profileForm.genres));
    if (profileForm.photo) formData.append('photo', profileForm.photo);
    try {
      await axios.post('/artist/onboard', formData);
      loadDashboardData();
      alert('Profile updated!');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  if (loading) return <div className="text-center py-5">Loading dashboard...</div>;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!artist) return <Alert variant="warning">Artist profile not found.</Alert>;

  return (
    <div>
      <h2 className="mb-4">Artist Dashboard</h2>
      <Tabs defaultActiveKey="overview" id="artist-dashboard-tabs">
        <Tab eventKey="overview" title="Overview">
          <Row className="mt-3">
            <Col md={4}>
              <Card>
                <Card.Img variant="top" src={artist.photo_url || '/assets/placeholder.png'} />
                <Card.Body>
                  <Card.Title>{artist.display_name}</Card.Title>
                  <Card.Text>{artist.bio}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={8}>
              <Card>
                <Card.Body>
                  <h5>Stats</h5>
                  <p>Tracks: {tracks.length}</p>
                  <p>Events: {events.length}</p>
                  <p>Average Rating: {artist.avg_rating || 'N/A'}</p>
                  <p>Reviews: {ratings.length}</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="tracks" title="Tracks">
          <div className="mt-3">
            <Button onClick={() => setShowTrackModal(true)}>Add Track</Button>
            <Table striped className="mt-3">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map(track => (
                  <tr key={track.id}>
                    <td>{track.title}</td>
                    <td>{track.duration}s</td>
                    <td>
                      <Button size="sm" onClick={() => { setEditingTrack(track); setTrackForm({ title: track.title, file: null }); setShowTrackModal(true); }}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => deleteTrack(track.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {tracks.length > 0 && <AudioPlayer tracks={tracks} />}
          </div>
        </Tab>

        <Tab eventKey="events" title="Events">
          <div className="mt-3">
            <Button onClick={() => setShowEventModal(true)}>Add Event</Button>
            <Table striped className="mt-3">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Date</th>
                  <th>District</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event.id}>
                    <td>{event.title}</td>
                    <td>{new Date(event.event_date).toLocaleDateString()}</td>
                    <td>{event.district}</td>
                    <td>
                      <Button size="sm" onClick={() => { setEditingEvent(event); setEventForm({ title: event.title, description: event.description, event_date: event.event_date.split('T')[0], district_id: event.district_id }); setShowEventModal(true); }}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => deleteEvent(event.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Tab>

        <Tab eventKey="analytics" title="Analytics">
          <div className="mt-3">
            <Card>
              <Card.Body>
                <h5>Engagement Metrics</h5>
                <p>Total Views: {/* Placeholder */}0</p>
                <p>Average Rating: {artist.avg_rating || 'N/A'}</p>
                <p>Number of Reviews: {ratings.length}</p>
                <p>Upcoming Events: {events.filter(e => new Date(e.event_date) > new Date()).length}</p>
              </Card.Body>
            </Card>
            <RatingsList artistId={user.id} />
          </div>
        </Tab>

        <Tab eventKey="settings" title="Settings">
          <Form onSubmit={handleProfileSubmit} className="mt-3">
            <Form.Group className="mb-3">
              <Form.Label>Display Name</Form.Label>
              <Form.Control type="text" value={profileForm.display_name} onChange={e => setProfileForm({...profileForm, display_name: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Bio</Form.Label>
              <Form.Control as="textarea" rows={3} value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Genres</Form.Label>
              {GENRES.map(genre => (
                <Form.Check key={genre} type="checkbox" label={genre} checked={profileForm.genres.includes(genre)} onChange={e => {
                  const newGenres = e.target.checked ? [...profileForm.genres, genre] : profileForm.genres.filter(g => g !== genre);
                  setProfileForm({...profileForm, genres: newGenres});
                }} />
              ))}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Photo</Form.Label>
              <Form.Control type="file" onChange={e => setProfileForm({...profileForm, photo: e.target.files[0]})} />
            </Form.Group>
            <Button type="submit">Update Profile</Button>
          </Form>
        </Tab>
      </Tabs>

      {/* Track Modal */}
      <Modal show={showTrackModal} onHide={() => setShowTrackModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingTrack ? 'Edit Track' : 'Add Track'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleTrackSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control type="text" value={trackForm.title} onChange={e => setTrackForm({...trackForm, title: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Audio File</Form.Label>
              <Form.Control type="file" accept="audio/*" onChange={e => setTrackForm({...trackForm, file: e.target.files[0]})} required={!editingTrack} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowTrackModal(false)}>Cancel</Button>
            <Button type="submit">{editingTrack ? 'Update' : 'Add'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Event Modal */}
      <Modal show={showEventModal} onHide={() => setShowEventModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingEvent ? 'Edit Event' : 'Add Event'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEventSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control type="text" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control type="date" value={eventForm.event_date} onChange={e => setEventForm({...eventForm, event_date: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>District</Form.Label>
              <Form.Select value={eventForm.district_id} onChange={e => setEventForm({...eventForm, district_id: e.target.value})} required>
                <option value="">Select District</option>
                {DISTRICTS.map((d, i) => <option key={i} value={i+1}>{d}</option>)}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEventModal(false)}>Cancel</Button>
            <Button type="submit">{editingEvent ? 'Update' : 'Add'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
