// src/components/AddToPlaylistButton.jsx
import React, { useEffect, useState } from 'react';
import { Dropdown, Button, Spinner } from 'react-bootstrap';
import axios from '../api/axiosConfig';

/**
 * AddToPlaylistButton
 * - props: trackId
 * - opens a dropdown of user playlists and adds selected playlist
 */
export default function AddToPlaylistButton({ trackId, onAdded = null }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios.get('/fan/playlists')
      .then(res => { if (cancelled) return; setPlaylists(Array.isArray(res.data) ? res.data : []); })
      .catch(err => { console.error('Could not fetch playlists', err); setPlaylists([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function addTo(playlistId) {
    setAddingId(playlistId);
    try {
      await axios.post(`/fan/playlists/${playlistId}/tracks`, { track_id: trackId });
      if (typeof onAdded === 'function') onAdded(playlistId);
      // slight delay to show success UX
    } catch (err) {
      console.error('Add to playlist failed', err);
      alert(err?.response?.data?.error || 'Failed to add to playlist');
    } finally {
      setAddingId(null);
    }
  }

  if (loading) return <Spinner animation="border" size="sm" />;

  if (!playlists.length) {
    return <Button size="sm" onClick={() => alert('Create a playlist first')}>Add</Button>;
  }

  return (
    <Dropdown>
      <Dropdown.Toggle size="sm" variant="outline-secondary">Add</Dropdown.Toggle>
      <Dropdown.Menu>
        {playlists.map(p => (
          <Dropdown.Item key={p.id} onClick={() => addTo(p.id)}>
            {p.name} <span className="text-muted">({p.track_count})</span>
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}