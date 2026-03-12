

/* src/styles/custom.css */

/* Palette + variables */
:root{
  --bb-bg: #f7f6f2;        /* soft cream background */
  --bb-accent: #198754;    /* brand green */
  --bb-accent-dark: #0f5e3a;/* darker green for contrast */
  --bb-ink: #222428;       /* charcoal text */
  --bb-muted: #6c757d;     /* muted text */
  --bb-warm: #d9643b;      /* warm terracotta accent */
  --bb-deep: #0b3d91;      /* deep navy for headers/contrast */
  --card-radius: 12px;
  --page-gutter: 24px;
  --max-content-width: 1180px;
}

/* Basics */
html,body,#root { height: 100%; }
body {
  background: var(--bb-bg);
  color: var(--bb-ink);
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
  line-height: 1.45;
}

/* Container wrapper to center content and add breathing room */
.container-lg {
  max-width: var(--max-content-width);
}

/* Hero */
.bb-hero {
  --hero-height: 360px;
  padding: calc(var(--page-gutter) * 0.6) 0;
}
.hero-image-col .hero-image {
  height: var(--hero-height);
  background-size: cover;
  background-position: center center;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 6px solid rgba(16, 128, 62, 0.08);
  box-shadow: 0 10px 30px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);
}
.hero-image-col .hero-overlay { display: none !important; }
.hero-content { display:flex; flex-direction:column; justify-content:center; height:100%; padding: 8px 4px; }
.hero-title { font-size:1.75rem; font-weight:700; line-height:1.08; color:var(--bb-deep); margin-bottom:6px; }
.hero-subtext { font-size:1.02rem; color:var(--bb-ink); }

/* Responsive */
@media (max-width: 767.98px) {
  .hero-image-col .hero-image { height:220px; }
  .hero-title { font-size:1.25rem; }
}

/* Card highlight + animation when selected */
.card-highlight {
  animation: cardFlash 1.4s ease-in-out;
  box-shadow: 0 0 0 4px rgba(40, 167, 69, 0.18);
  transition: box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out;
}
@keyframes cardFlash {
  0% { box-shadow: 0 0 0 rgba(40,167,69,0.0); transform: scale(1); }
  10% { box-shadow: 0 4px 18px rgba(40,167,69,0.25); transform: scale(1.01); }
  60% { box-shadow: 0 0 0 rgba(40,167,69,0.0); transform: scale(1); }
  100% { box-shadow: 0 0 0 rgba(40,167,69,0.0); transform: scale(1); }
}

/* shadow / card radii */
.shadow-soft {
  box-shadow: 0 6px 18px rgba(20,20,20,0.06);
  border-radius: var(--card-radius);
  transition: transform .12s ease, box-shadow .12s ease;
}
.card { border-radius: var(--card-radius); overflow: hidden; }

/* Artist image / figure helper:
   Uses aspect-ratio where supported and a CSS fallback for older browsers */
.artist-card-figure {
  width: 100%;
  height: 0;
  padding-bottom: 66.6667%; /* 3:2 aspect ratio fallback */
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #ededed, #f7f7f7);
}
.artist-card-figure img,
.artist-card-figure .img-cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

@supports (aspect-ratio: 3 / 2) {
  .artist-card-figure {
    height: auto;
    padding: 0;
  }
  .artist-card-figure > img,
  .artist-card-figure > .img-cover {
    aspect-ratio: 3 / 2;
    width: 100%;
    height: auto;
    position: static;
  }
}

/* small overlay for registered hover interactions (play/preview) */
.artist-card-figure .overlay {
  position: absolute;
  inset: 8px;
  display:flex;
  align-items:flex-end;
  justify-content:flex-end;
  pointer-events:none;
}
.artist-card-figure .overlay .btn {
  pointer-events:auto;
  opacity: 0.95;
  backdrop-filter: blur(4px);
}

/* Featured carousel tweaks */
.featured-carousel-card { min-width: 260px; max-width: 260px; border-radius: 10px; overflow: hidden; }
.featured-carousel-card img { height: 140px; object-fit: cover; }

/* utility spacing for lists in sidebar */
.sidebar-list { max-height: 360px; overflow-y: auto; padding-right: 8px; }

/* avatar helper used elsewhere */
.artist-avatar {
  width: 160px;
  height: 160px;
  object-fit: cover;
  border: 4px solid #fff;
  border-radius: 50%;
  box-shadow: 0 4px 10px rgba(0,0,0,0.06);
}
@media (max-width: 768px) {
  .artist-avatar { width: 120px; height: 120px; }
}

/* content spacing improvements */
.section-title {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12px;
  margin-bottom: 12px;
}
 
/* === layout helpers for discover page === */

/* make bootstrap container use your constrained width */
.container-lg {
  max-width: var(--max-content-width);
}

/* larger gutters for discover grid */
.discover-row {
  gap: 1.25rem; /* for modern spacing (replaces g-*) */
}

/* ensure artist cards stretch to same height */
.artist-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.artist-card .card-body {
  display: flex;
  flex-direction: column;
  justify-content: space-between; /* pushes CTA to bottom */
  flex: 1;
}

/* sidebar area */
.sidebar-col {
  position: relative;
  padding-right: 0.75rem;
}

/* allow sidebar lists to scroll if long */
.sidebar-list {
  max-height: 64vh;
  overflow-y: auto;
  padding-right: 6px;
}

/* featured carousel wider slightly */
.featured-carousel-card { min-width: 280px; max-width: 280px; }

/* small tweak for section titles in discover area */
.discover-section-title {
  font-size: 1rem;
  color: var(--bb-deep);
  margin-bottom: 0.625rem;
  display:flex;
  align-items:center;
  gap:.5rem;
}


// src/pages/EventDetail.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../api/axiosConfig';
import { Card, Button } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext';

// Resolve backend image URLs correctly
function resolveImage(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;

  const base = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  if (url.startsWith('/uploads')) return `${base}${url}`;
  if (url.startsWith('/')) return `${base}${url}`;
  return `${base}/${url}`.replace(/\/{2,}/, '/');
}

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    axios.get(`/events/${id}`)
      .then(res => {
        if (cancelled) return;
        setEvent(res.data || null);
      })
      .catch(() => {
        if (!cancelled) setEvent(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!user || !user.id) {
      setRsvpStatus(null);
      return;
    }

    let cancelled = false;

    axios.get('/events/my/rsvps')
      .then(res => {
        if (cancelled) return;

        const found = (res.data || []).find(
          r => Number(r.event_id) === Number(id)
        );

        setRsvpStatus(found ? found.status : null);
      })
      .catch(() => {
        if (!cancelled) setRsvpStatus(null);
      });

    return () => { cancelled = true; };
  }, [user, id]);

  const doRsvp = async (status = 'going') => {
    if (!user || !user.id) {
      window.location.href = '/login';
      return;
    }

    setProcessing(true);

    try {
      const res = await axios.post(`/events/${id}/rsvp`, { status });

      const newStatus = res.data.status || status;

      setRsvpStatus(newStatus);

      setEvent(prev =>
        prev
          ? {
              ...prev,
              rsvp_counts: {
                ...(prev.rsvp_counts || {}),
                [newStatus]:
                  (prev.rsvp_counts?.[newStatus] || 0) + 1
              }
            }
          : prev
      );
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

  if (loading) return <div>Loading event...</div>;
  if (!event) return <div className="alert alert-warning">Event not found</div>;

  // defensive helpers for artist values that may be a string or object
  const artistObj = event.artist || event.artist || null; // may be string or object
  let artistName = '';
  let artistLinkId = null;
  if (artistObj) {
    if (typeof artistObj === 'string') {
      artistName = artistObj;
    } else if (typeof artistObj === 'object') {
      artistName = artistObj.display_name || artistObj.displayName || artistObj.artist || artistObj.artist_name || (artistObj.user && artistObj.user.username) || '';
      // try to resolve an id: top-level id, artist_id, or nested user id
      artistLinkId = artistObj.id || event.artist_id || artistObj.artist_id || (artistObj.user && artistObj.user.id) || null;
    }
  } else {
    // fallback fields
    artistName = event.artist_name || event.artist_display_name || '';
    artistLinkId = event.artist_id || null;
  }

  const districtName = event.district || event.district_name || event.location || '';

  return (
    <Card>
      <Card.Body>

        {/* Event Image */}
        {event.image_url && (
          <div style={{ marginBottom: 16 }}>
            <img
              src={resolveImage(event.image_url)}
              alt={event.title}
              style={{
                width: '100%',
                maxHeight: 400,
                objectFit: 'cover',
                borderRadius: 6
              }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  'https://placehold.co/800x400?text=Event';
              }}
            />
          </div>
        )}

        <h3>{event.title}</h3>

        <div className="small text-muted">
          {districtName} • {event.event_date ? new Date(event.event_date).toLocaleString() : 'TBA'}
        </div>

        <p className="mt-3">{event.description}</p>

        {artistName && (
          <div className="mb-2">
            Artist:{' '}
            {artistLinkId ? (
              <Link to={`/artist/${artistLinkId}`}>
                {artistName}
              </Link>
            ) : (
              <span>{artistName}</span>
            )}
          </div>
        )}

        <div className="mb-3">
          <strong>Venue:</strong> {event.venue || 'TBA'}<br />
          <strong>Address:</strong> {event.address || 'TBA'}<br />
          {event.ticket_url && (
            <a href={event.ticket_url} target="_blank" rel="noreferrer">
              Buy tickets
            </a>
          )}
        </div>

        {/* RSVP controls */}
        <div className="d-flex gap-2">
          {rsvpStatus ? (
            <>
              <Button variant="outline-success" disabled>
                RSVP: {rsvpStatus}
              </Button>

              <Button
                variant="outline-danger"
                onClick={cancel}
                disabled={processing}
              >
                Cancel RSVP
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="success"
                onClick={() => doRsvp('going')}
                disabled={processing}
              >
                I'm going
              </Button>

              <Button
                variant="outline-secondary"
                onClick={() => doRsvp('interested')}
                disabled={processing}
              >
                Interested
              </Button>
            </>
          )}

          <Button variant="outline-secondary">Share</Button>
        </div>

      </Card.Body>
    </Card>
  );
}