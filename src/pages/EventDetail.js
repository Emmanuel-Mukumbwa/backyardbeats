// src/pages/EventDetail.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { Card, Button, Alert } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';

const SUPPORT_EMAIL = 'support@backyardbeats.local';
const SUPPORT_URL = '/support';

function getBackendBase() {
  try {
    return (axios && axios.defaults && axios.defaults.baseURL) || process.env.REACT_APP_API_URL || 'http://localhost:3001';
  } catch {
    return process.env.REACT_APP_API_URL || 'http://localhost:3001';
  }
}

function resolveImage(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;

  const base = getBackendBase().replace(/\/$/, '');
  if (url.startsWith('/')) return `${base}${url}`;
  if (url.startsWith('uploads/')) return `${base}/${url}`;
  // fallback: assume it's already a relative path under uploads
  return `${base}/uploads/${url}`;
}

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    axios.get(`/events/${id}`)
      .then(res => {
        if (cancelled) return;
        setEvent(res.data || null);
      })
      .catch(err => {
        if (!cancelled) {
          setEvent(null);
          setError(err.response?.data?.error || 'Failed to load event');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  // load user's RSVP for this event (if logged in)
  useEffect(() => {
    if (!user || !user.id) {
      setRsvpStatus(null);
      return;
    }

    let cancelled = false;
    axios.get('/events/my/rsvps')
      .then(res => {
        if (cancelled) return;
        const found = (res.data || []).find(r => Number(r.event_id) === Number(id));
        setRsvpStatus(found ? found.status : null);
      })
      .catch(() => {
        if (!cancelled) setRsvpStatus(null);
      });

    return () => { cancelled = true; };
  }, [user, id]);

  // helpers to determine visibility/permission
  const isEventApproved = (ev) => !!(ev && (ev.is_approved || ev.isApproved));
  const isArtistApproved = (ev) => {
    if (!ev) return false;
    // artist info may come as ev.artist (object) or fields like artist_is_approved
    if (ev.artist && typeof ev.artist.is_approved !== 'undefined') return !!ev.artist.is_approved;
    if (typeof ev.artist_is_approved !== 'undefined') return !!ev.artist_is_approved;
    return true; // if missing, assume ok (safe fallback)
  };
  const isArtistRejected = (ev) => {
    if (!ev) return false;
    if (ev.artist && typeof ev.artist.is_rejected !== 'undefined') return !!ev.artist.is_rejected;
    if (typeof ev.artist_is_rejected !== 'undefined') return !!ev.artist_is_rejected;
    return false;
  };
  const isArtistBannedOrDeleted = (ev) => {
    if (!ev) return false;
    if (ev.artist && (ev.artist.user_banned || ev.artist.user_deleted_at)) return true;
    if (typeof ev.user_banned !== 'undefined' && ev.user_banned) return true;
    if (typeof ev.user_deleted_at !== 'undefined' && ev.user_deleted_at) return true;
    return false;
  };

  const rsvpAllowed = (ev) => {
    if (!ev) return false;
    // Only allow RSVP for public events: event approved && artist approved && not banned/deleted
    if (!isEventApproved(ev)) return false;
    if (!isArtistApproved(ev)) return false;
    if (isArtistRejected(ev)) return false;
    if (isArtistBannedOrDeleted(ev)) return false;
    return true;
  };

  const doRsvp = async (status = 'going') => {
    if (!user || !user.id) {
      // redirect to login
      window.location.href = '/login';
      return;
    }

    if (!event) return;
    if (!rsvpAllowed(event)) {
      alert('This event is not open for public RSVPs.');
      return;
    }

    setProcessing(true);
    try {
      const res = await axios.post(`/events/${id}/rsvp`, { status });
      const newStatus = res.data?.status || status;
      setRsvpStatus(newStatus);
      setEvent(prev => prev ? {
        ...prev,
        rsvp_counts: {
          ...(prev.rsvp_counts || {}),
          [newStatus]: (prev.rsvp_counts?.[newStatus] || 0) + 1
        }
      } : prev);
    } catch (err) {
      alert(err.response?.data?.error || 'RSVP failed');
    } finally {
      setProcessing(false);
    }
  };

  const cancel = async () => {
    if (!user || !user.id) {
      window.location.href = '/login';
      return;
    }
    setProcessing(true);
    try {
      await axios.delete(`/events/${id}/rsvp`);
      setRsvpStatus(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Cancel failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="text-center py-4">Loading event...</div>;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!event) return <Alert variant="warning">Event not found</Alert>;

  // derive displayable district name (use district_name preferred)
  const districtName = event.district_name || event.district || (event.district_id ? `#${event.district_id}` : 'TBA');

  // Artist display info handling
  const artistDisplayName = event.artist?.display_name || event.artist_display_name || event.artistName || (event.artist && (event.artist.displayName || event.artist.username)) || null;
  const artistId = event.artist?.id || event.artist_id || event.artistId || null;

  const showRejectedBanner = !!(event.is_rejected || event.isRejected || (event.is_approved === 0 && event.rejection_reason));
  const showPendingBanner = !!(event.is_approved === 0 && !showRejectedBanner);
  const eventRejectedReason = event.rejection_reason || event.rejectionReason || null;

  return (
    <Card>
      <Card.Body>
        {showPendingBanner && (
          <Alert variant="warning">
            This event is pending approval. It is currently visible only to you (the artist) and not public.
          </Alert>
        )}
        {showRejectedBanner && (
          <Alert variant="danger">
            <div><strong>Event rejected.</strong></div>
            {eventRejectedReason && <div className="small text-danger">Reason: {eventRejectedReason}</div>}
            <div className="small mt-2">
              <a href={SUPPORT_URL}>Contact support</a> or <a href={`mailto:${SUPPORT_EMAIL}`}>email support</a> to appeal.
            </div>
          </Alert>
        )}
        {isArtistRejected(event) && (
          <Alert variant="danger">
            <div className="small">Your artist profile was rejected — this event will remain private until your profile is approved.</div>
            <div className="small mt-2">
              <a href={SUPPORT_URL}>Contact support</a> or <a href={`mailto:${SUPPORT_EMAIL}`}>email support</a>
            </div>
          </Alert>
        )}
        {isArtistBannedOrDeleted(event) && (
          <Alert variant="danger">Artist account is banned or deleted — event not available.</Alert>
        )}

        {/* Event Image */}
        {event.image_url && (
          <div style={{ marginBottom: 16 }}>
            <img
              src={resolveImage(event.image_url)}
              alt={event.title}
              style={{ width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 6 }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://placehold.co/800x400?text=Event';
              }}
            />
          </div>
        )}

        <h3>{event.title}</h3>

        <div className="small text-muted">
          {districtName} • {event.event_date ? new Date(event.event_date).toLocaleString() : 'TBA'}
        </div>

        <p className="mt-3">{event.description}</p>

        {artistDisplayName && (
          <div className="mb-2">
            Artist:{' '}
            {artistId ? (
              <Link to={`/artist/${artistId}`}>
                {artistDisplayName}
              </Link>
            ) : (
              <span>{artistDisplayName}</span>
            )}
          </div>
        )}

        <div className="mb-3">
          <strong>Venue:</strong> {event.venue || 'TBA'}<br />
          <strong>Address:</strong> {event.address || 'TBA'}<br />
          {event.ticket_url && (
            <a href={event.ticket_url} target="_blank" rel="noreferrer">Buy tickets</a>
          )}
        </div>

        {/* RSVP controls */}
        <div className="d-flex gap-2 align-items-center mb-3">
          {!rsvpAllowed(event) && (
            <div className="text-muted small me-2">
              RSVPs are disabled for this event because it is not public.
            </div>
          )}

          {rsvpStatus ? (
            <>
              <Button variant="outline-success" disabled>
                RSVP: {rsvpStatus}
              </Button>

              <Button variant="outline-danger" onClick={cancel} disabled={processing || !rsvpAllowed(event)}>
                Cancel RSVP
              </Button>
            </>
          ) : (
            <>
              <Button variant="success" onClick={() => doRsvp('going')} disabled={processing || !rsvpAllowed(event)}>
                I'm going
              </Button>

              <Button variant="outline-secondary" onClick={() => doRsvp('interested')} disabled={processing || !rsvpAllowed(event)}>
                Interested
              </Button>
            </>
          )}

          <Button variant="outline-secondary" onClick={() => navigator.clipboard?.writeText(window.location.href)} title="Copy event link">Share</Button>
        </div>

        {/* RSVP counts */}
        {event.rsvp_counts && (
          <div className="small text-muted mb-3">
            {Object.entries(event.rsvp_counts).map(([k, v]) => (
              <span key={k} className="me-3">{k}: {v}</span>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}