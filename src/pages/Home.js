import React, { useEffect, useState, useContext, useRef } from 'react';
import axios from '../api/axiosConfig';
import ArtistCard from '../components/ArtistCard';
import FeaturedCarousel from '../components/FeaturedCarousel';
import FilterBar from '../components/FilterBar';
import NewReleases from '../components/NewReleases';
import MostPlayed from '../components/MostPlayed';
import { Button, Alert, Container, Row, Col, Spinner } from 'react-bootstrap';
import Hero from '../components/Hero';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { FaMusic } from 'react-icons/fa';

export default function Home() {
  const [artists, setArtists] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [filters, setFilters] = useState({ district: '', genre: '', mood: '', q: '' });
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [autoClearMsg, setAutoClearMsg] = useState('');
  const unmounted = useRef(false);

  const debounceRef = useRef(null);
  const autoClearTimerRef = useRef(null);

  const { user } = useContext(AuthContext);

  useEffect(() => {
    loadArtists();
    axios.get('/featured')
      .then(res => setFeatured(res.data || []))
      .catch(() => {});
    return () => {
      unmounted.current = true;
      clearTimeout(debounceRef.current);
      clearTimeout(autoClearTimerRef.current);
    };
  }, []);

  function loadArtists(params = {}) {
    setLoading(true);
    axios.get('/artists', { params })
      .then(res => {
        const data = res.data || [];
        setArtists(data);

        const filtersActive = Object.values(filters).some(v => v && String(v).trim().length > 0);
        if (data.length === 0 && filtersActive) {
          clearTimeout(autoClearTimerRef.current);
          autoClearTimerRef.current = setTimeout(() => {
            setAutoClearMsg('No artists matched your filters — clearing filters and showing all artists.');
            setFilters({ district: '', genre: '', mood: '', q: '' });
            axios.get('/artists')
              .then(allRes => {
                if (!unmounted.current) {
                  setArtists(allRes.data || []);
                }
              })
              .catch(() => {});
            setTimeout(() => setAutoClearMsg(''), 3000);
          }, 1500);
        }
      })
      .catch(err => {
        console.error('Failed to load artists', err);
        setArtists([]);
      })
      .finally(() => {
        if (!unmounted.current) setLoading(false);
      });
  }

  useEffect(() => {
    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const params = {};
      if (filters.district) params.district_id = filters.district;
      if (filters.genre) params.genre = filters.genre;
      if (filters.mood) params.mood = filters.mood;
      if (filters.q) params.q = filters.q;

      if (!Object.values(filters).some(v => v && String(v).trim().length > 0)) {
        loadArtists();
      } else {
        loadArtists(params);
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [filters]);

  function applyFilters() {
    const params = {};
    if (filters.district) params.district_id = filters.district;
    if (filters.genre) params.genre = filters.genre;
    if (filters.mood) params.mood = filters.mood;
    if (filters.q) params.q = filters.q;
    loadArtists(params);
  }

  function clearFilters() {
    setFilters({ district: '', genre: '', mood: '', q: '' });
    loadArtists();
  }

  function handleArtistSelect(artistId) {
    setSelectedId(artistId);
    const el = document.getElementById(`artist-${artistId}`);

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('card-highlight');
      setTimeout(() => el.classList.remove('card-highlight'), 1500);
    } else {
      window.location.href = `/artist/${artistId}`;
    }
  }

  const artistHasProfile = user && (user.has_profile === true || user.hasProfile === true);

  return (
    <div>
      <Hero />

      <Container fluid className="mt-4 px-lg-5">

        {autoClearMsg && <Alert variant="info">{autoClearMsg}</Alert>}

        {user?.role === 'artist' && !artistHasProfile && (
          <Alert variant="success" className="d-flex align-items-center justify-content-between">
            <div>
              <strong>Welcome, {user.username || user.displayName || 'artist'}</strong>
              <div className="small">Complete your artist profile to upload tracks and manage events.</div>
            </div>
            <div>
              <Button as={Link} to="/onboard" variant="light">Get started</Button>
            </div>
          </Alert>
        )}

        <h2 className="mb-4">
          <FaMusic className="me-2" />
          Discover Local Artists
        </h2>

        {/* FEATURED */}
        <FeaturedCarousel items={featured} />

        {/* GLOBAL FILTERS */}
        <div className="mb-4 p-3 bg-light rounded shadow-sm">
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            onApply={applyFilters}
            onClear={clearFilters}
          />
        </div>

        {/* MAIN CONTENT ROW */}
        <Row className="mt-4">

          {/* ARTISTS GRID */}
          <Col xs={12} lg={9} className="pe-lg-4">

            <div className="mb-3">
              <h4 className="mb-1">Artists</h4>
              <hr />
            </div>

            {loading ? (
              <div className="py-4 text-center">
                <Spinner animation="border" />
                <div className="small text-muted mt-2">Loading artists...</div>
              </div>
            ) : (
              <Row>
                {artists.length === 0 ? (
                  <Col xs={12}>
                    <div className="py-5 text-center text-muted">
                      <h5>No artists found.</h5>
                      <div className="mt-2">Try changing or clearing filters, or check back later.</div>
                      {user?.role === 'artist' && (
                        <div className="mt-3">
                          <Button as={Link} to="/onboard" variant="outline-success">
                            Create your profile
                          </Button>
                        </div>
                      )}
                    </div>
                  </Col>
                ) : (
                  artists.map(a => (
                    <Col
                      key={a.id}
                      id={`artist-${a.id}`}
                      xs={12}
                      md={6}
                      lg={4}
                      className="mb-4"
                    >
                      <ArtistCard
                        artist={a}
                        selected={selectedId === a.id}
                      />
                    </Col>
                  ))
                )}
              </Row>
            )}

          </Col>

          {/* RIGHT SIDEBAR */}
          <Col xs={12} lg={3} className="border-start ps-lg-4">

            <div className="mb-4">
              <h6 className="text-uppercase text-muted mb-2">New Releases</h6>
              <NewReleases onSelect={handleArtistSelect} />
            </div>

            <div className="mb-4">
              <h6 className="text-uppercase text-muted mb-2">Most Played</h6>
              <MostPlayed onSelect={handleArtistSelect} />
            </div>

          </Col>

        </Row>

      </Container>
    </div>
  );
}