// src/pages/ArtistDashboard.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Tabs,
  Tab,
  Card,
  Button,
  Alert,
  Row,
  Col,
  Image,
  Badge,
  Stack,
  Dropdown,
  ButtonGroup
} from 'react-bootstrap';
import axios from '../api/axiosConfig';
import RatingsList from '../components/RatingsList';
import ToastMessage from '../components/ToastMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import AddTrackModal from '../components/AddTrackModal';
import AddEventModal from '../components/AddEventModal';
import TracksPanel from '../components/artist/TracksPanel';
import EventsPanel from '../components/artist/EventsPanel';
import {
  FaMusic,
  FaCalendarAlt,
  FaChartLine,
  FaPlus,
  FaEdit,
  FaUserCircle,
  FaEllipsisV,
  FaHome
} from 'react-icons/fa';

const STORAGE_KEY = 'artistDashboard.activeTab';
const ALLOWED_TABS = ['overview', 'tracks', 'events', 'analytics'];

function normalizeTabKey(key) {
  return ALLOWED_TABS.includes(key) ? key : 'overview';
}

export default function ArtistDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [artist, setArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [events, setEvents] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [metaGenres, setMetaGenres] = useState([]);
  const [metaMoods, setMetaMoods] = useState([]);

  const [districtsList, setDistrictsList] = useState([]);
  const [districtsMapObj, setDistrictsMapObj] = useState({});

  const [playsSummary, setPlaysSummary] = useState({
    artist_id: null,
    artist_name: null,
    total_plays: 0,
    unique_listeners: 0,
    last_played: null,
    tracks: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showTrackModal, setShowTrackModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  const [toast, setToast] = useState({
    show: false,
    message: '',
    variant: 'warning',
    delay: 5000
  });

  const [activeTab, setActiveTab] = useState('overview');
  const tabHideTimerRef = useRef(null);

  const backendBase = useMemo(() => {
    try {
      return (axios && axios.defaults && axios.defaults.baseURL) || process.env.REACT_APP_API_URL || 'http://localhost:3001';
    } catch {
      return process.env.REACT_APP_API_URL || 'http://localhost:3001';
    }
  }, []);

  const resolveToBackend = useCallback((raw) => {
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;

    const base = String(backendBase).replace(/\/$/, '');
    if (raw.startsWith('/')) return `${base}${raw}`;
    if (raw.startsWith('uploads/')) return `${base}/${raw}`;
    return `${base}/uploads/${raw}`;
  }, [backendBase]);

  const getEventImageRaw = useCallback((ev) => {
    if (!ev) return null;
    return ev.image_url || ev.image || ev.cover_url || ev.photo || ev.imagePath || ev.image_path || null;
  }, []);

  const resolveEventImage = useCallback((ev) => {
    const raw = getEventImageRaw(ev);
    return raw ? resolveToBackend(raw) : null;
  }, [getEventImageRaw, resolveToBackend]);

  function computeArtistStatus(a) {
    if (!a) return 'unknown';
    if (a.user && a.user.deleted_at) return 'deleted';
    if (a.user && a.user.banned) return 'banned';
    if (a.is_rejected) return 'rejected';
    if (!a.is_approved) return 'pending';
    return 'approved';
  }

  function statusBadge(value) {
    switch (value) {
      case 'approved':
        return <Badge bg="success">Approved</Badge>;
      case 'pending':
        return <Badge bg="warning" className="text-dark">Pending</Badge>;
      case 'rejected':
        return <Badge bg="danger">Rejected</Badge>;
      case 'banned':
        return <Badge bg="danger">Banned</Badge>;
      case 'deleted':
        return <Badge bg="secondary">Deleted</Badge>;
      default:
        return <Badge bg="secondary">Unknown</Badge>;
    }
  }

  function extractGenreNames(a) {
    if (!a) return [];
    if (Array.isArray(a.genres) && a.genres.length > 0 && typeof a.genres[0] === 'object') {
      return a.genres.map(g => g.name);
    }
    if (Array.isArray(a.genres) && a.genres.length > 0 && (typeof a.genres[0] === 'number' || /^\d+$/.test(String(a.genres[0])))) {
      return a.genres.map(id => {
        const m = metaGenres.find(x => Number(x.id) === Number(id));
        return m ? m.name : String(id);
      });
    }
    if (Array.isArray(a.genres) && a.genres.length > 0) {
      return a.genres.map(String);
    }
    if (a.genre) return [String(a.genre)];
    return [];
  }

  function extractMoodNames(a) {
    if (!a) return [];
    if (Array.isArray(a.moods) && a.moods.length > 0 && typeof a.moods[0] === 'object') {
      return a.moods.map(m => m.name);
    }
    if (Array.isArray(a.moods) && a.moods.length > 0 && (typeof a.moods[0] === 'number' || /^\d+$/.test(String(a.moods[0])))) {
      return a.moods.map(id => {
        const m = metaMoods.find(x => Number(x.id) === Number(id));
        return m ? m.name : String(id);
      });
    }
    if (Array.isArray(a.moods) && a.moods.length > 0) {
      return a.moods.map(String);
    }
    if (a.mood) return [String(a.mood)];
    return [];
  }

  const persistTab = useCallback((tabKey) => {
    try {
      const nextTab = normalizeTabKey(tabKey);
      localStorage.setItem(STORAGE_KEY, nextTab);
      const url = new URL(window.location.href);
      url.hash = `#${nextTab}`;
      window.history.replaceState(null, '', url.toString());
    } catch (e) {
      console.debug('persistTab error', e);
    }
  }, []);

  const handleTabSelect = useCallback((k) => {
    if (!k) return;
    const nextTab = normalizeTabKey(k);
    setActiveTab(nextTab);
    persistTab(nextTab);
  }, [persistTab]);

  const showRestrictedToast = useCallback((message, delay = 5000, variant = 'warning') => {
    setToast({ show: true, message, variant, delay });
    if (tabHideTimerRef.current) clearTimeout(tabHideTimerRef.current);
    tabHideTimerRef.current = setTimeout(() => setToast(prev => ({ ...prev, show: false })), delay + 200);
  }, []);

  const showSuccessToast = useCallback((message, delay = 3500) => {
    setToast({ show: true, message, variant: 'success', delay });
    if (tabHideTimerRef.current) clearTimeout(tabHideTimerRef.current);
    tabHideTimerRef.current = setTimeout(() => setToast(prev => ({ ...prev, show: false })), delay + 200);
  }, []);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [gRes, mRes, profileRes, districtsRes] = await Promise.allSettled([
        axios.get('/meta/genres'),
        axios.get('/meta/moods'),
        axios.get('/profile/me'),
        axios.get('/districts')
      ]);

      if (gRes.status === 'fulfilled') setMetaGenres(Array.isArray(gRes.value.data) ? gRes.value.data : []);
      if (mRes.status === 'fulfilled') setMetaMoods(Array.isArray(mRes.value.data) ? mRes.value.data : []);

      const dList = (districtsRes.status === 'fulfilled' && Array.isArray(districtsRes.value.data))
        ? districtsRes.value.data
            .map(d => {
              const id = d.id !== undefined ? String(d.id) : (d.ID !== undefined ? String(d.ID) : '');
              const name = d.name || d.title || d.label || d.district_name || '';
              return { id, name };
            })
            .filter(x => x.name)
        : [];

      setDistrictsList(dList);

      const dmap = {};
      dList.forEach(d => {
        if (d && d.id) {
          dmap[d.id] = d.name;
          dmap[String(d.id)] = d.name;
        }
      });
      setDistrictsMapObj(dmap);

      let artistData = null;
      if (profileRes.status === 'fulfilled' && profileRes.value.data && profileRes.value.data.artist) {
        artistData = profileRes.value.data.artist;
        artistData.is_approved = !!artistData.is_approved;
        artistData.is_rejected = !!artistData.is_rejected;
      }
      setArtist(artistData);

      if (artistData && artistData.id) {
        const [tracksRes, eventsRes, ratingsRes, playsRes] = await Promise.allSettled([
          axios.get('/tracks'),
          axios.get('/events/my'),
          axios.get(`/artists/${artistData.id}/ratings`),
          axios.get('/artists/me/plays-summary')
        ]);

        setTracks(tracksRes.status === 'fulfilled' && Array.isArray(tracksRes.value.data) ? tracksRes.value.data : []);
        setEvents(eventsRes.status === 'fulfilled' && Array.isArray(eventsRes.value.data) ? eventsRes.value.data : []);

        if (ratingsRes.status === 'fulfilled') {
          setRatings(Array.isArray(ratingsRes.value.data) ? ratingsRes.value.data : []);
        } else {
          setRatings([]);
        }

        if (playsRes.status === 'fulfilled') {
          setPlaysSummary({
            artist_id: playsRes.value.data?.artist_id ?? artistData.id,
            artist_name: playsRes.value.data?.artist_name ?? artistData.display_name ?? null,
            total_plays: Number(playsRes.value.data?.total_plays || 0),
            unique_listeners: Number(playsRes.value.data?.unique_listeners || 0),
            last_played: playsRes.value.data?.last_played || null,
            tracks: Array.isArray(playsRes.value.data?.tracks) ? playsRes.value.data.tracks : []
          });
        } else {
          setPlaysSummary({
            artist_id: artistData.id,
            artist_name: artistData.display_name || null,
            total_plays: 0,
            unique_listeners: 0,
            last_played: null,
            tracks: []
          });
        }
      } else {
        setTracks([]);
        setEvents([]);
        setRatings([]);
        setPlaysSummary({
          artist_id: null,
          artist_name: null,
          total_plays: 0,
          unique_listeners: 0,
          last_played: null,
          tracks: []
        });
      }
    } catch (err) {
      console.error('loadDashboardData error', err);
      setError('Failed to load dashboard. Try refreshing the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initFromHash = (window.location.hash || '').replace('#', '');
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = normalizeTabKey(initFromHash || saved || 'overview');
    setActiveTab(initial);

    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (location && location.state && location.state.onboardingToast) {
      const payload = location.state.onboardingToast || {};
      const message = payload.message || 'Your profile is pending verification.';
      const variant = payload.variant || 'success';
      const delay = payload.delay || 10000;
      const autohide = typeof payload.autohide === 'boolean' ? payload.autohide : false;
      const buildMessage = payload.title ? `${payload.title}\n\n${message}` : message;

      setToast({
        show: true,
        message: buildMessage,
        variant,
        delay
      });

      if (tabHideTimerRef.current) clearTimeout(tabHideTimerRef.current);
      if (autohide) {
        tabHideTimerRef.current = setTimeout(() => setToast(prev => ({ ...prev, show: false })), delay + 200);
      }

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    return () => {
      if (tabHideTimerRef.current) clearTimeout(tabHideTimerRef.current);
    };
  }, []);

  const artistStatus = computeArtistStatus(artist);

  const handleAddTrackClick = useCallback(() => {
    if (!artist) {
      showRestrictedToast('Complete your artist onboarding first before adding tracks.', 5000, 'warning');
      return;
    }
    if (artistStatus === 'pending') {
      showRestrictedToast('Your profile is pending verification. You may add tracks after your profile is approved.', 6000, 'warning');
      return;
    }
    if (artistStatus === 'rejected') {
      showRestrictedToast('Your artist profile was rejected. Contact support for help.', 6000, 'danger');
      return;
    }
    if (artistStatus === 'banned') {
      showRestrictedToast('Your account has been banned. You cannot add tracks.', 6000, 'danger');
      return;
    }
    if (artistStatus === 'deleted') {
      showRestrictedToast('Your account has been deleted. You cannot add tracks.', 6000, 'danger');
      return;
    }
    setEditingTrack(null);
    setShowTrackModal(true);
  }, [artist, artistStatus, showRestrictedToast]);

  const handleAddEventClick = useCallback(() => {
    if (!artist) {
      showRestrictedToast('Complete your artist onboarding first before creating events.', 5000, 'warning');
      return;
    }
    if (artistStatus === 'pending') {
      showRestrictedToast('Your profile is pending verification. You may create events after your profile is approved.', 6000, 'warning');
      return;
    }
    if (artistStatus === 'rejected') {
      showRestrictedToast('Your artist profile was rejected. Contact support for help.', 6000, 'danger');
      return;
    }
    if (artistStatus === 'banned') {
      showRestrictedToast('Your account has been banned. You cannot create events.', 6000, 'danger');
      return;
    }
    if (artistStatus === 'deleted') {
      showRestrictedToast('Your account has been deleted. You cannot create events.', 6000, 'danger');
      return;
    }
    setEditingEvent(null);
    setShowEventModal(true);
  }, [artist, artistStatus, showRestrictedToast]);

  const onTrackSaved = useCallback(() => {
    const wasEdit = !!editingTrack;
    showSuccessToast(wasEdit ? 'Track updated successfully' : 'Track added successfully');
    setActiveTab('tracks');
    persistTab('tracks');
    loadDashboardData();
    setShowTrackModal(false);
    setEditingTrack(null);
  }, [editingTrack, loadDashboardData, persistTab, showSuccessToast]);

  const onEventSaved = useCallback(() => {
    const wasEdit = !!editingEvent;
    showSuccessToast(wasEdit ? 'Event updated successfully' : 'Event added successfully');
    setActiveTab('events');
    persistTab('events');
    loadDashboardData();
    setShowEventModal(false);
    setEditingEvent(null);
  }, [editingEvent, loadDashboardData, persistTab, showSuccessToast]);

  const deleteTrack = useCallback(async (id) => {
    if (!window.confirm('Delete this track?')) return;
    try {
      await axios.delete(`/tracks/${id}`);
      showSuccessToast('Track deleted');
      loadDashboardData();
    } catch (err) {
      showRestrictedToast(err.response?.data?.error || err.message || 'Failed to delete track', 5000, 'danger');
    }
  }, [loadDashboardData, showRestrictedToast, showSuccessToast]);

  const deleteEvent = useCallback(async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await axios.delete(`/events/${id}`);
      showSuccessToast('Event deleted');
      loadDashboardData();
    } catch (err) {
      showRestrictedToast(err.response?.data?.error || err.message || 'Failed to delete event', 5000, 'danger');
    }
  }, [loadDashboardData, showRestrictedToast, showSuccessToast]);

  const recordListen = useCallback((track) => {
    if (!track || !track.id) return;
    axios.post(`/tracks/${track.id}/listen`).catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (!artist) {
    return (
      <Alert variant="warning">
        Artist profile not found.{' '}
        <Button size="sm" variant="link" onClick={() => navigate('/onboard')}>
          Complete onboarding
        </Button>
      </Alert>
    );
  }

  const photoRaw = artist.photo_url || artist.photo || null;
  const avatarSrc = photoRaw
    ? (photoRaw.startsWith('http') ? photoRaw : resolveToBackend(photoRaw))
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.display_name || artist.username || 'Artist')}&background=0D8ABC&color=fff&size=256`;

  const genreNames = extractGenreNames(artist);
  const moodNames = extractMoodNames(artist);

  const tracksCount = tracks.length;
  const eventsCount = events.length;
  const ratingsCount = ratings.length;
  const upcomingCount = events.filter(e => e.event_date && new Date(e.event_date) > new Date()).length;

  const totalPlays = Number(playsSummary.total_plays || 0);
  const uniqueListeners = Number(playsSummary.unique_listeners || 0);
  const lastPlayedText = playsSummary.last_played ? new Date(playsSummary.last_played).toLocaleString() : '—';

  const StatBlock = ({ label, value, className = '' }) => (
    <div className={`text-center ${className}`}>
      <div className="h5 mb-0">{value}</div>
      <div className="small text-muted">{label}</div>
    </div>
  );

  const topPlayedTracks = Array.isArray(playsSummary.tracks) ? playsSummary.tracks.slice(0, 8) : [];

  return (
    <div className="artist-dashboard">
      <ToastMessage
        show={toast.show}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
        message={toast.message}
        variant={toast.variant}
        delay={toast.delay}
        position="top-end"
        autohide={typeof toast.autohide === 'boolean' ? toast.autohide : true}
      />

      <style>{`
        .artist-dashboard .artist-header {
          gap: 1rem;
        }

        .artist-dashboard .artist-header-actions .btn {
          min-width: 0;
        }

        .artist-dashboard .artist-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: .5rem;
          border-bottom: 0;
        }

        .artist-dashboard .artist-tabs .nav-item {
          flex: 0 0 auto;
        }

        .artist-dashboard .artist-tabs .nav-link {
          border-radius: 999px;
          white-space: nowrap;
          padding: .55rem .9rem;
        }

        .artist-dashboard .artist-tabs .nav-link.active {
          box-shadow: 0 0.125rem 0.5rem rgba(0,0,0,.06);
        }

        .artist-dashboard .overview-card .avatar {
          width: 160px;
          height: 160px;
          object-fit: cover;
          border: 4px solid #f8f9fa;
        }

        .artist-dashboard .metric-card {
          border: 0;
          border-radius: 1rem;
          box-shadow: 0 0.125rem 0.5rem rgba(0,0,0,.06);
          height: 100%;
        }

        .artist-dashboard .track-play-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: .75rem 0;
          border-bottom: 1px solid rgba(0,0,0,.08);
        }

        .artist-dashboard .track-play-item:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .artist-dashboard .compact-muted {
          font-size: .875rem;
          color: #6c757d;
        }

        .artist-dashboard .mobile-fab {
          position: fixed;
          right: 16px;
          bottom: 20px;
          z-index: 1060;
          display: none;
        }

        @media (max-width: 767.98px) {
          .artist-dashboard .mobile-fab {
            display: block;
          }

          .artist-dashboard .artist-header {
            flex-direction: column;
            align-items: stretch !important;
          }

          .artist-dashboard .artist-header-actions {
            width: 100%;
          }

          .artist-dashboard .artist-header-actions .btn {
            width: 100%;
          }

          .artist-dashboard .artist-tabs .nav-link {
            padding: .45rem .75rem;
            font-size: .92rem;
          }

          .artist-dashboard .overview-card .avatar {
            width: 120px;
            height: 120px;
          }
        }
      `}</style>

      <div className="d-flex justify-content-between align-items-center mb-3 artist-header">
        <div>
          <h2 className="mb-0">Artist Dashboard</h2>
          <div className="text-muted small">Manage your tracks, events and profile</div>
        </div>

        <div className="artist-header-actions d-flex align-items-center">
          <div className="d-none d-md-inline">
            <Stack direction="horizontal" gap={2}>
              <Button variant="outline-secondary" size="sm" onClick={() => navigate('/')} aria-label="Back to home">
                <FaHome className="me-1" /> Back to Home
              </Button>
              <Button variant="success" size="sm" onClick={handleAddTrackClick} aria-label="Add track">
                <FaPlus className="me-1" /> Add Track
              </Button>
              <Button variant="outline-success" size="sm" onClick={handleAddEventClick} aria-label="Add event">
                <FaPlus className="me-1" /> Add Event
              </Button>
            </Stack>
          </div>

          <div className="d-inline d-md-none ms-2 w-100">
            <Dropdown as={ButtonGroup} className="w-100">
              <Dropdown.Toggle variant="outline-secondary" size="sm" id="artist-actions-dropdown" aria-label="Actions menu" className="w-100">
                <FaEllipsisV className="me-2" /> Quick Actions
              </Dropdown.Toggle>
              <Dropdown.Menu align="end" className="w-100">
                <Dropdown.Item onClick={() => navigate('/')} aria-label="Back to home">
                  <FaHome className="me-2" /> Back to Home
                </Dropdown.Item>
                <Dropdown.Item onClick={handleAddTrackClick} aria-label="Add track">
                  <FaPlus className="me-2" /> Add Track
                </Dropdown.Item>
                <Dropdown.Item onClick={handleAddEventClick} aria-label="Add event">
                  <FaPlus className="me-2" /> Add Event
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={() => navigate('/onboard')}>
                  <FaEdit className="me-2" /> Edit Profile
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        id="artist-dashboard-tabs"
        className="mb-3 artist-tabs"
        onSelect={handleTabSelect}
        variant="pills"
        mountOnEnter
      >
        <Tab eventKey="overview" title={<span><FaUserCircle className="me-1" /> Overview</span>}>
          <Row className="mt-3 g-3">
            <Col xs={12} md={4}>
              <Card className="text-center p-3 overview-card shadow-sm">
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Image
                    src={avatarSrc}
                    roundedCircle
                    className="avatar"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.display_name || artist.username || 'Artist')}&background=0D8ABC&color=fff&size=256`;
                    }}
                    alt={`${artist.display_name || artist.username || 'Artist'} avatar`}
                  />
                </div>

                <Card.Body>
                  <Card.Title className="mt-2 d-flex flex-column align-items-center">
                    <span className="fw-semibold">{artist.display_name}</span>
                    <span className="mt-2">{statusBadge(artistStatus)}</span>
                  </Card.Title>

                  <Card.Text className="text-muted small">
                    {artist.bio || 'No bio yet — tell fans about your music.'}
                  </Card.Text>

                  <div className="d-flex justify-content-center mt-3">
                    <Button variant="outline-primary" size="sm" onClick={() => navigate('/onboard')} aria-label="Edit profile">
                      <FaEdit className="me-1" /> <span className="d-none d-md-inline">Edit Profile</span>
                    </Button>
                  </div>

                  <hr />

                  <Row className="g-2">
                    <Col xs={4} sm={4}>
                      <StatBlock label="Tracks" value={tracksCount} />
                    </Col>
                    <Col xs={4} sm={4}>
                      <StatBlock label="Events" value={eventsCount} />
                    </Col>
                    <Col xs={4} sm={4}>
                      <StatBlock label="Reviews" value={ratingsCount} />
                    </Col>
                  </Row>

                  <hr />

                  <div className="text-start">
                    <div className="small text-muted">District</div>
                    <div className="mb-2">
                      {artist.district || (artist.user && artist.user.district ? artist.user.district.name : (artist.user && artist.user.district_id ? `#${artist.user.district_id}` : 'Unknown'))}
                    </div>

                    <div className="small text-muted">Genres</div>
                    <div className="mb-2">
                      {genreNames.length ? genreNames.map(g => <Badge bg="success" className="me-1" key={g}>{g}</Badge>) : <small className="text-muted">No genres</small>}
                    </div>

                    <div className="small text-muted">Moods</div>
                    <div>
                      {moodNames.length ? moodNames.map(m => <Badge bg="info" text="dark" className="me-1" key={m}>{m}</Badge>) : <small className="text-muted">No moods</small>}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} md={8}>
              <Stack gap={3}>
                <Card className="shadow-sm metric-card">
                  <Card.Body>
                    <div className="d-flex align-items-start justify-content-between gap-3">
                      <h5 className="mb-0"><FaChartLine className="me-2" /> Engagement</h5>
                      <div className="small text-muted">Updated: {new Date().toLocaleDateString()}</div>
                    </div>

                    <Row className="mt-3 g-3">
                      <Col xs={12} sm={6}>
                        <div className="small text-muted">Average Rating</div>
                        <div className="display-6 text-success">
                          {artist.avg_rating ? Number(artist.avg_rating).toFixed(1) : 'N/A'}
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div className="small text-muted">Upcoming Events</div>
                        <div className="display-6">{upcomingCount}</div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div className="small text-muted">Total Plays</div>
                        <div className="display-6">{totalPlays}</div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div className="small text-muted">Unique Listeners</div>
                        <div className="display-6">{uniqueListeners}</div>
                      </Col>
                    </Row>

                    <div className="mt-3 small text-muted">
                      Last played: {lastPlayedText}
                    </div>
                  </Card.Body>
                </Card>

                <Card className="shadow-sm metric-card">
                  <Card.Body>
                    <h6 className="mb-3">Top Tracks by Plays</h6>
                    {topPlayedTracks.length === 0 ? (
                      <div className="text-muted">No play data yet.</div>
                    ) : (
                      <div>
                        {topPlayedTracks.map((t) => (
                          <div key={t.id} className="track-play-item">
                            <div style={{ minWidth: 0 }}>
                              <div className="fw-semibold text-truncate">{t.title || 'Untitled track'}</div>
                              <div className="compact-muted">
                                {t.unique_listeners || 0} listeners • Last played {t.last_played ? new Date(t.last_played).toLocaleString() : '—'}
                              </div>
                            </div>
                            <Badge bg="secondary">{t.plays} plays</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Stack>
            </Col>
          </Row>
        </Tab>

        <Tab
          eventKey="tracks"
          title={
            <span>
              <FaMusic className="me-1" />
              Tracks <Badge bg="secondary" className="ms-2">{tracksCount}</Badge>
            </span>
          }
        >
          <Card className="shadow-sm mt-3">
            <Card.Body>
              <TracksPanel
                tracks={tracks}
                status={artistStatus}
                onEdit={(t) => {
                  setEditingTrack(t);
                  setShowTrackModal(true);
                }}
                onDelete={deleteTrack}
                resolveToBackend={resolveToBackend}
                onPlay={recordListen}
                trackPlays={playsSummary.tracks}
              />
            </Card.Body>
          </Card>
        </Tab>

        <Tab
          eventKey="events"
          title={
            <span>
              <FaCalendarAlt className="me-1" />
              Events <Badge bg="secondary" className="ms-2">{eventsCount}</Badge>
            </span>
          }
        >
          <Card className="shadow-sm mt-3">
            <Card.Body>
              <EventsPanel
                events={events}
                onEdit={(e) => {
                  setEditingEvent(e);
                  setShowEventModal(true);
                }}
                onDelete={deleteEvent}
                resolveEventImage={resolveEventImage}
                districtsMap={(id) => (districtsMapObj && (districtsMapObj[String(id)] || districtsMapObj[id])) || null}
              />
            </Card.Body>
          </Card>
        </Tab>

        <Tab
          eventKey="analytics"
          title={
            <span>
              <FaChartLine className="me-1" />
              Analytics <Badge bg="secondary" className="ms-2">{totalPlays}</Badge>
            </span>
          }
        >
          <div className="mt-3">
            <Card className="shadow-sm">
              <Card.Body>
                <h5>Engagement Metrics</h5>

                <Row className="mt-3 g-3">
                  <Col md={3} sm={6} xs={12}>
                    <div className="small text-muted">Total Plays</div>
                    <div className="h4 mb-0">{totalPlays}</div>
                  </Col>
                  <Col md={3} sm={6} xs={12}>
                    <div className="small text-muted">Unique Listeners</div>
                    <div className="h4 mb-0">{uniqueListeners}</div>
                  </Col>
                  <Col md={3} sm={6} xs={12}>
                    <div className="small text-muted">Average Rating</div>
                    <div className="h4 mb-0">{artist.avg_rating ? Number(artist.avg_rating).toFixed(1) : 'N/A'}</div>
                  </Col>
                  <Col md={3} sm={6} xs={12}>
                    <div className="small text-muted">Reviews</div>
                    <div className="h4 mb-0">{ratingsCount}</div>
                  </Col>
                </Row>

                <hr />

                <Row className="g-3">
                  <Col md={7}>
                    <h6 className="mb-3">Top Tracks by Plays</h6>
                    {topPlayedTracks.length === 0 ? (
                      <div className="text-muted">No play data yet.</div>
                    ) : (
                      <div>
                        {topPlayedTracks.map((t, index) => (
                          <div key={t.id} className="track-play-item">
                            <div style={{ minWidth: 0 }}>
                              <div className="fw-semibold text-truncate">
                                {index + 1}. {t.title || 'Untitled track'}
                              </div>
                              <div className="compact-muted">
                                {t.unique_listeners || 0} listeners • Last played {t.last_played ? new Date(t.last_played).toLocaleString() : '—'}
                              </div>
                            </div>
                            <Badge bg="secondary">{t.plays} plays</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </Col>
                  <Col md={5}>
                    <h6 className="mb-3">Recent Reviews</h6>
                    <RatingsList artistId={artist.id} />
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </div>
        </Tab>
      </Tabs>

      <div className="mobile-fab">
        <Button
          variant="success"
          className="rounded-circle shadow-lg"
          style={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={handleAddTrackClick}
          aria-label="Add track"
        >
          <FaPlus />
        </Button>
      </div>

      <AddTrackModal
        show={showTrackModal}
        onHide={() => setShowTrackModal(false)}
        onSaved={onTrackSaved}
        editing={editingTrack}
        genres={metaGenres.map(g => g.name)}
      />

      <AddEventModal
        show={showEventModal}
        onHide={() => setShowEventModal(false)}
        onSaved={onEventSaved}
        editing={editingEvent}
        districts={districtsList}
      />
    </div>
  );
}