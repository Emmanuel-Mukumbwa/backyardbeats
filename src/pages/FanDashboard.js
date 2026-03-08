// src/pages/FanDashboard.jsx
import React, { useState, useEffect, useContext } from 'react';
import {
  Tabs,
  Tab,
  Card,
  Button,
  ListGroup,
  Alert,
  Modal,
  Form,
  Row,
  Col
} from 'react-bootstrap';
import axios from '../api/axiosConfig';
import FavoriteArtists from '../components/FavoriteArtists';
import MyEvents from '../components/MyEvents';
import { AuthContext } from '../context/AuthContext';
import AudioPlayer from '../components/AudioPlayer';
import RecentlyUploaded from '../components/RecentlyUploaded';
import MyRatings from '../components/MyRatings';
import PlaylistsList from '../components/PlaylistsList';

export default function FanDashboard() {
  const { user } = useContext(AuthContext);
  const [favorites, setFavorites] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [rsvpEvents, setRsvpEvents] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals and forms
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistForm, setPlaylistForm] = useState({ name: '', description: '' });

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    setError(null);
    try {
      // favorites and other widgets load from separate endpoints (FavoriteArtists handles /favorites)
      // Fetch recent listens for this fan and other small widgets
      const [listensRes, eventsRes, ratingsRes] = await Promise.all([
        axios.get('/fan/listens').catch(() => ({ data: [] })), // recent listens
        axios.get('/events').catch(() => ({ data: [] })),     // RSVP/events (fallback)
        axios.get('/ratings/user').catch(() => ({ data: [] })) // optional: implement server-side if absent
      ]);

      // Map listens to AudioPlayer-friendly tracks array. API returns { listen_id, played_at, track: {...}, artist: {...} }
      const listens = Array.isArray(listensRes.data) ? listensRes.data : [];
      const mappedTracks = listens.map(l => ({
        listen_id: l.listen_id,
        id: l.track?.id || null,
        title: l.track?.title || (l.artist?.display_name ? `${l.artist.display_name} — unknown track` : 'Unknown track'),
        preview_url: l.track?.preview_url || null,
        duration: l.track?.duration || null,
        artwork_url: l.track?.artwork_url || null,
        artist_name: l.artist?.display_name || null,
        artist_id: l.artist?.id || null,
        played_at: l.played_at || null,
        genre: l.track?.genre || null
      }));

      setRecentTracks(mappedTracks);

      // For other parts of the dashboard keep your existing approach or replace with API calls
      setRsvpEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
      setRatings(Array.isArray(ratingsRes.data) ? ratingsRes.data : []);
      setPlaylists([]); // keep empty or fetch /fan/playlists if you implement them
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  // When AudioPlayer starts playing a track, we POST /fan/listens to record it.
  // AudioPlayer will call this when playback begins.
  const handleRecordPlay = async (track) => {
    // track shape is what we passed to AudioPlayer (see mappedTracks)
    if (!user || !user.id) return; // only record when logged in
    try {
      // safe: if track.id is null (no DB track), still send artist if available
      await axios.post('/fan/listens', {
        track_id: track.id || null,
        artist_id: track.artist_id || null
      });

      // refresh recent tracks to show the latest play at top (lightweight)
      const res = await axios.get('/fan/listens');
      const listens = Array.isArray(res.data) ? res.data : [];
      const mapped = listens.map(l => ({
        listen_id: l.listen_id,
        id: l.track?.id || null,
        title: l.track?.title || (l.artist?.display_name ? `${l.artist.display_name} — unknown track` : 'Unknown track'),
        preview_url: l.track?.preview_url || null,
        duration: l.track?.duration || null,
        artwork_url: l.track?.artwork_url || null,
        artist_name: l.artist?.display_name || null,
        artist_id: l.artist?.id || null,
        played_at: l.played_at || null,
        genre: l.track?.genre || null
      }));
      setRecentTracks(mapped);
    } catch (err) {
      // non-fatal: record failure is not blocking playback
      console.warn('Could not record listen', err);
    }
  };

  const handlePlaylistSubmit = async (e) => {
    e.preventDefault();
    const newPlaylist = {
      id: Date.now(),
      name: playlistForm.name,
      description: playlistForm.description,
      tracks: []
    };
    setPlaylists([...playlists, newPlaylist]);
    setShowPlaylistModal(false);
    setPlaylistForm({ name: '', description: '' });
  };

  const deletePlaylist = (id) => {
    if (!window.confirm('Delete this playlist?')) return;
    setPlaylists(playlists.filter(p => p.id !== id));
  };

  if (loading) return <div className="text-center py-5">Loading dashboard...</div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div>
      <h2 className="mb-4">Fan Dashboard</h2>
      <Tabs defaultActiveKey="favorites" id="fan-dashboard-tabs">
        <Tab eventKey="favorites" title="Favorite Artists">
          <div className="mt-3">
            <h5>My Favorite Artists</h5>
            <FavoriteArtists max={12} />
          </div>
        </Tab>

        <Tab eventKey="recent" title="Recently Played">
          <div className="mt-3">
            <h5>Recently Played Tracks</h5>
            {recentTracks.length > 0 ? (
              <>
                <AudioPlayer tracks={recentTracks} onPlay={handleRecordPlay} />
                {/* small history list below player */}
                <ListGroup className="mt-3">
                  {recentTracks.slice(0, 12).map((t, i) => (
                    <ListGroup.Item key={`${t.listen_id || t.id}-${i}`}>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{t.title}</strong>
                          <div className="small text-muted">
                            {t.artist_name ? t.artist_name : ''} {t.played_at ? `• ${new Date(t.played_at).toLocaleString()}` : ''}
                          </div>
                        </div>
                        <div className="small text-muted">{t.duration ? `${t.duration}s` : '-'}</div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </>
            ) : (
              <p>No recently played tracks.</p>
            )}
          </div>
        </Tab>

        <Tab eventKey="new" title="New Releases">
          <div className="mt-3">
            <RecentlyUploaded limit={16} onRecordPlay={async (track) => {
              // When a fan plays a recent upload, record it (we already have handleRecordPlay; reuse it)
              if (!user || !user.id) return;
              try {
                await axios.post('/fan/listens', { track_id: track.id, artist_id: track.artist_id || null });
                // refresh recently played list
                const res = await axios.get('/fan/listens');
                const listens = Array.isArray(res.data) ? res.data : [];
                const mapped = listens.map(l => ({
                  listen_id: l.listen_id,
                  id: l.track?.id || null,
                  title: l.track?.title || (l.artist?.display_name ? `${l.artist.display_name} — unknown track` : 'Unknown track'),
                  preview_url: l.track?.preview_url || null,
                  duration: l.track?.duration || null,
                  artwork_url: l.track?.artwork_url || null,
                  artist_name: l.artist?.display_name || null,
                  artist_id: l.artist?.id || null,
                  played_at: l.played_at || null,
                  genre: l.track?.genre || null
                }));
                setRecentTracks(mapped);
              } catch (e) {
                console.warn('record play failed', e);
              }
            }} />
          </div>
        </Tab>

        <Tab eventKey="events" title="My Events">
          <div className="mt-3">
            <h5>My Events</h5>
            <MyEvents />
          </div>
        </Tab>

        <Tab eventKey="ratings" title="My Ratings">
          <div className="mt-3">
            <h5>My Rating History</h5>
            <MyRatings />
          </div>
        </Tab>

        <Tab eventKey="playlists" title="Playlists">
          <div className="mt-3">
            <PlaylistsList />
          </div>
        </Tab>
      </Tabs>

      {/* Playlist Modal */}
      <Modal show={showPlaylistModal} onHide={() => setShowPlaylistModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create Playlist</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePlaylistSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control type="text" value={playlistForm.name} onChange={e => setPlaylistForm({...playlistForm, name: e.target.value})} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control as="textarea" rows={3} value={playlistForm.description} onChange={e => setPlaylistForm({...playlistForm, description: e.target.value})} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPlaylistModal(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}