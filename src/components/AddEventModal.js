// src/components/AddEventModal.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Modal, Button, Form, Row, Col, Image } from 'react-bootstrap';
import axios from '../api/axiosConfig';

export default function AddEventModal({ show, onHide, onSaved, editing = null, districts = [] }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const previewBlobRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // districts handling
  const [localDistricts, setLocalDistricts] = useState([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [districtsError, setDistrictsError] = useState(null);

  // helper to build backend url for relative image paths
  const resolveBackendUrl = (raw) => {
    try {
      const base = (axios && axios.defaults && axios.defaults.baseURL) || process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const backendBase = String(base).replace(/\/$/, '');
      if (!raw) return null;
      if (/^https?:\/\//i.test(raw)) return raw;
      if (raw.startsWith('/')) return `${backendBase}${raw}`;
      if (raw.startsWith('uploads/')) return `${backendBase}/${raw}`;
      return `${backendBase}/uploads/${raw}`;
    } catch {
      return raw;
    }
  };

  // normalize districts prop (support ['Name','Name'] or [{id,name}, ...])
  const normalizePropDistricts = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map((d, i) => {
      if (!d) return null;
      if (typeof d === 'string' || typeof d === 'number') {
        return { id: String(i + 1), name: String(d) };
      }
      // assume object
      const idCandidate = d.id || d.value || d.pk || d.district_id || d.key || d.ID || d.pk_id;
      const nameCandidate = d.name || d.title || d.label || d.district_name || d.district || d.display_name;
      const id = idCandidate != null ? String(idCandidate) : String(i + 1);
      const name = nameCandidate || String(d);
      return { id, name };
    }).filter(Boolean);
  };

  // load districts if parent didn't supply them
  useEffect(() => {
    const provided = normalizePropDistricts(districts || []);
    if (provided.length > 0) {
      setLocalDistricts(provided);
      setDistrictsError(null);
      return;
    }

    let mounted = true;
    const ctrl = new AbortController();
    setDistrictsLoading(true);
    setDistrictsError(null);

    axios.get('/districts', { signal: ctrl.signal })
      .then(res => {
        if (!mounted) return;
        const list = Array.isArray(res.data) ? res.data.map((d, i) => {
          const idCandidate = d.id || d.ID || d.pk || d.value;
          const nameCandidate = d.name || d.title || d.label || d.district_name;
          return { id: idCandidate != null ? String(idCandidate) : String(i + 1), name: nameCandidate || '' };
        }).filter(x => x.name) : [];
        setLocalDistricts(list);
      })
      .catch(err => {
        if (!mounted) return;
        if (axios.isCancel && axios.isCancel(err)) return;
        setDistrictsError(err.response?.data?.error || err.message || 'Failed to load districts');
      })
      .finally(() => {
        if (!mounted) return;
        setDistrictsLoading(false);
      });

    return () => { mounted = false; ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(districts)]);

  // set form fields from editing when modal opens
  useEffect(() => {
    if (editing) {
      // title, description (fall back to a couple of keys)
      setTitle(editing.title || editing.name || '');
      setDescription(editing.description || editing.desc || '');

      // date -> yyyy-mm-dd
      if (editing.event_date) {
        setEventDate(String(editing.event_date).split('T')[0]);
      } else if (editing.eventDate) {
        setEventDate(String(editing.eventDate).split('T')[0]);
      } else {
        setEventDate('');
      }

      // determine district id from several possible shapes
      let dId = '';
      if (editing.district_id != null) dId = editing.district_id;
      else if (editing.districtId != null) dId = editing.districtId;
      else if (editing.district && editing.district.id != null) dId = editing.district.id;
      else if (editing.district != null) dId = editing.district;
      setDistrictId(dId !== null && dId !== undefined && dId !== '' ? String(dId) : '');

      setVenue(editing.venue || '');
      setAddress(editing.address || '');
      setTicketUrl(editing.ticket_url || editing.ticketUrl || '');

      const existingImage = editing.image_url || editing.image || editing.imagePath || editing.image_path || editing.photo_url || null;
      setImagePreview(existingImage ? resolveBackendUrl(existingImage) : null);
    } else {
      // reset
      setTitle(''); setDescription(''); setEventDate(''); setDistrictId(''); setVenue(''); setAddress(''); setTicketUrl('');
      setImagePreview(null);
    }
    setImage(null);
    setError(null);

    // cleanup blob preview on unmount/hide
    return () => {
      if (previewBlobRef.current && typeof previewBlobRef.current === 'string' && previewBlobRef.current.indexOf('blob:') === 0) {
        try { URL.revokeObjectURL(previewBlobRef.current); } catch (e) {}
        previewBlobRef.current = null;
      }
    };
  }, [editing, show]);

  const handleImageChange = (e) => {
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (!f) {
      setImage(null);
      const existingImage = editing ? (editing.image_url ? resolveBackendUrl(editing.image_url) : null) : null;
      setImagePreview(existingImage);
      return;
    }

    if (!f.type || f.type.indexOf('image/') !== 0) {
      setError('Selected file is not an image');
      return;
    }

    if (previewBlobRef.current && previewBlobRef.current.indexOf('blob:') === 0) {
      try { URL.revokeObjectURL(previewBlobRef.current); } catch (e) {}
      previewBlobRef.current = null;
    }

    const previewUrl = URL.createObjectURL(f);
    previewBlobRef.current = previewUrl;
    setImage(f);
    setImagePreview(previewUrl);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('description', description);
      fd.append('event_date', eventDate);
      fd.append('district_id', districtId || '');
      fd.append('venue', venue || '');
      fd.append('address', address || '');
      fd.append('ticket_url', ticketUrl || '');
      if (image) fd.append('image', image);

      if (editing && editing.id) {
        const res = await axios.put(`/events/${editing.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        onSaved && onSaved(res.data);
      } else {
        const res = await axios.post('/events', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        onSaved && onSaved(res.data);
      }
    } catch (err) {
      setError(err.response && err.response.data && err.response.data.error ? err.response.data.error : (err.message || 'Failed to save event'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Edit Event' : 'Add Event'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}

          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control value={title} onChange={e => setTitle(e.target.value)} required />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control as="textarea" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Date</Form.Label>
                <Form.Control type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>District</Form.Label>
                <Form.Select value={districtId} onChange={e => setDistrictId(e.target.value)} required>
                  <option value="">Select District</option>
                  {districtsLoading && <option value="" disabled>Loading districts...</option>}
                  {localDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Form.Select>
                {districtsError && <div className="small text-danger mt-1">{districtsError}</div>}
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Venue</Form.Label>
            <Form.Control value={venue} onChange={e => setVenue(e.target.value)} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Address</Form.Label>
            <Form.Control value={address} onChange={e => setAddress(e.target.value)} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Ticket URL</Form.Label>
            <Form.Control value={ticketUrl} onChange={e => setTicketUrl(e.target.value)} />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Image (optional)</Form.Label>
            <Form.Control type="file" accept="image/*" onChange={handleImageChange} />
            {imagePreview && (
              <div className="mt-3 d-flex align-items-center">
                <Image
                  src={imagePreview}
                  rounded
                  style={{ width: 160, height: 160, objectFit: 'cover', border: '1px solid #e9ecef' }}
                  onError={(ev) => { ev.currentTarget.onerror = null; ev.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(title || 'Event')}&background=eee&color=777&size=128`; }}
                  alt="Event preview"
                />
                <div className="ms-3">
                  <div className="small text-muted">Preview</div>
                  <div className="mt-2">
                    <Button variant="outline-secondary" size="sm" onClick={() => {
                      if (previewBlobRef.current && previewBlobRef.current.indexOf('blob:') === 0) {
                        try { URL.revokeObjectURL(previewBlobRef.current); } catch (e) {}
                        previewBlobRef.current = null;
                      }
                      setImage(null);
                      const existingImage = editing ? (editing.image_url ? resolveBackendUrl(editing.image_url) : null) : null;
                      setImagePreview(existingImage);
                    }}>
                      Remove selection
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="success" disabled={saving}>{saving ? 'Saving...' : (editing ? 'Update Event' : 'Add Event')}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}