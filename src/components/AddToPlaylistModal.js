// src/components/AddToPlaylistModal.jsx
import React, { useEffect, useState } from 'react';
import { Modal, Button, ListGroup, Form } from 'react-bootstrap';
import axios from '../api/axiosConfig';
import LoadingSpinner from './LoadingSpinner';

export default function AddToPlaylistModal({ show, onHide, trackId, onAdded }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    axios.get('/fan/playlists').then(res => setPlaylists(Array.isArray(res.data) ? res.data : [])).catch(() => setPlaylists([])).finally(() => setLoading(false));
  }, [show]);

  async function handleAdd(pid) {
    try {
      await axios.post(`/fan/playlists/${pid}/tracks`, { track_id: trackId });
      onAdded && onAdded(pid);
    } catch (err) {
      console.error('add failed', err);
      alert(err?.response?.data?.error || 'Add failed');
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await axios.post('/fan/playlists', { name: form.name.trim(), description: form.description });
      const newPlaylist = res.data;
      // Auto-add the track if trackId provided
      if (trackId && newPlaylist && newPlaylist.id) {
        try {
          await axios.post(`/fan/playlists/${newPlaylist.id}/tracks`, { track_id: trackId });
        } catch (err) {
          console.error('auto-add to new playlist failed', err);
          // still proceed: show created but warn user
          alert('Playlist created but failed to auto-add the track.');
        }
      }
      // notify parent and close
      onAdded && onAdded(newPlaylist.id);
      setForm({ name: '', description: '' });
      onHide && onHide();
    } catch (err) {
      console.error('create failed', err);
      alert(err?.response?.data?.error || 'Create failed');
    } finally { setCreating(false); }
  }

  return (
    <Modal show={!!show} onHide={onHide}>
      <Modal.Header closeButton><Modal.Title>Add to playlist</Modal.Title></Modal.Header>
      <Modal.Body>
        {loading ? <LoadingSpinner /> : (
          <>
            {playlists.length ? <ListGroup className="mb-3">
              {playlists.map(p => <ListGroup.Item key={p.id} className="d-flex justify-content-between align-items-center">
                <div>{p.name} <small className="text-muted">({p.track_count ?? 0})</small></div>
                <Button size="sm" onClick={() => handleAdd(p.id)}>Add</Button>
              </ListGroup.Item>)}
            </ListGroup> : <div className="text-muted mb-3">No playlists yet.</div>}

            <hr />
            <h6>Create new playlist (will auto-add track)</h6>
            <Form onSubmit={handleCreate}>
              <Form.Group className="mb-2">
                <Form.Control placeholder="Playlist name" value={form.name} onChange={e => setForm(s => ({ ...s, name: e.target.value }))} required />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Control as="textarea" rows={2} placeholder="Description (optional)" value={form.description} onChange={e => setForm(s => ({ ...s, description: e.target.value }))} />
              </Form.Group>
              <div className="text-end">
                <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create & Add'}</Button>
              </div>
            </Form>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}