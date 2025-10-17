// src/pages/ArtistOnboarding.jsx
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Button, Alert, Badge, Image } from 'react-bootstrap';
import axios from '../api/axiosConfig';
import DISTRICTS from '../data/districts';
import { AuthContext } from '../context/AuthContext';

export default function ArtistOnboarding() {
  const { user, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [district, setDistrict] = useState(''); // could be name or id string
  const [districtId, setDistrictId] = useState(null); // numeric id if available
  const [genres, setGenres] = useState([]);
  const [photoFile, setPhotoFile] = useState(null); // File object
  const [photoPreview, setPhotoPreview] = useState(null); // object URL
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const GENRES = [
    "Afropop","Gospel","Hip-hop","R&B","Reggae","Highlife",
    "Traditional","Dancehall","Jazz","Blues","Electronic"
  ];

  useEffect(() => {
    // Prefill from AuthContext.user if available, otherwise fall back to localStorage legacy keys
    try {
      if (user) {
        if (user.username) setDisplayName(user.username);
        if (user.display_name) setDisplayName(user.display_name);
        if (user.district) setDistrict(user.district);
        if (user.district_id) {
          setDistrictId(Number(user.district_id));
          setDistrict(String(user.district_id));
        }
        if (user.photo_url) {
          setPhotoPreview(user.photo_url);
        }
      } else {
        const stored = JSON.parse(localStorage.getItem('bb_user') || 'null');
        if (stored) {
          if (stored.username) setDisplayName(stored.username);
          if (stored.displayName) setDisplayName(stored.displayName);
          if (stored.district) setDistrict(stored.district);
          if (stored.district_id) {
            setDistrictId(Number(stored.district_id));
            setDistrict(String(stored.district_id));
          }
          if (stored.photo_url) setPhotoPreview(stored.photo_url);
        }
      }

      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('ArtistOnboarding prefill — user:', user);
        // eslint-disable-next-line no-console
        console.log('Legacy bb_user:', localStorage.getItem('bb_user'));
        // eslint-disable-next-line no-console
        console.log('Token present?', !!localStorage.getItem('bb_token'));
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error reading initial user state for onboarding:', e);
    }
  }, [user]);

  // Cleanup preview URL on unmount / when photoFile changes
  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const toggleGenre = (g) => {
    setGenres(gs => gs.includes(g) ? gs.filter(x => x !== g) : [...gs, g]);
  };

  // File validation: image and max size 5MB
  const handleFileSelect = (file) => {
    setError(null);

    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Selected file must be an image.');
      return;
    }

    const maxBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxBytes) {
      setError('Image is too large. Max size is 5 MB.');
      return;
    }

    // create preview
    const previewUrl = URL.createObjectURL(file);
    // revoke previous blob URL if any
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    setPhotoPreview(previewUrl);
  };

  const removeSelectedPhoto = () => {
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!displayName.trim()) {
      setError('Display name is required.');
      setLoading(false);
      return;
    }
    if (genres.length === 0) {
      setError('Please select at least one genre.');
      setLoading(false);
      return;
    }

    try {
      // Resolve district_id if DISTRICTS contains objects
      let resolvedDistrictId = null;
      if (district) {
        const firstElem = DISTRICTS && DISTRICTS.length ? DISTRICTS[0] : null;
        if (firstElem && typeof firstElem === 'object' && ('id' in firstElem || 'name' in firstElem)) {
          const found = DISTRICTS.find(d => String(d.id) === String(district) || String(d.name) === String(district));
          if (found) resolvedDistrictId = found.id;
        }
      }

      const form = new FormData();
      form.append('display_name', displayName.trim());
      form.append('bio', bio.trim() || '');
      form.append('genres', JSON.stringify(genres));
      if (resolvedDistrictId) form.append('district_id', String(resolvedDistrictId));
      else if (district) form.append('district', String(district));
      // Attach file if present
      if (photoFile) {
        form.append('photo', photoFile, photoFile.name);
      }

      // include user id? backend should use req.user.id from auth middleware
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('Submitting onboarding form:', {
          display_name: displayName.trim(),
          bio: bio.trim(),
          district_id: resolvedDistrictId,
          district,
          genres,
          photoFileName: photoFile ? photoFile.name : null
        });
      }

      const response = await axios.post('/artist/onboard', form, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const msg = response?.data?.message || 'Profile saved successfully!';
      setSuccess(msg);

      // Update context and storage: set has_profile true and role artist, and update photo_url if returned
      const returnedUser = response?.data?.user || {};
      const returnedPhotoUrl = response?.data?.photo_url || response?.data?.photo || returnedUser.photo_url || null;

      updateUser({ has_profile: true, role: 'artist', photo_url: returnedPhotoUrl || undefined });

      try {
        // update bb_user
        const bbUserRaw = localStorage.getItem('bb_user');
        let bbUser = {};
        if (bbUserRaw) {
          try { bbUser = JSON.parse(bbUserRaw); } catch (_) { bbUser = {}; }
        }
        bbUser.has_profile = true;
        bbUser.role = 'artist';
        bbUser.displayName = displayName.trim();
        if (returnedPhotoUrl) bbUser.photo_url = returnedPhotoUrl;
        localStorage.setItem('bb_user', JSON.stringify(bbUser));

        // update bb_auth if present
        const bbAuthRaw = localStorage.getItem('bb_auth');
        if (bbAuthRaw) {
          try {
            const parsed = JSON.parse(bbAuthRaw);
            if (parsed && parsed.user) {
              parsed.user.has_profile = true;
              parsed.user.role = 'artist';
              parsed.user.displayName = displayName.trim();
              if (returnedPhotoUrl) parsed.user.photo_url = returnedPhotoUrl;
              localStorage.setItem('bb_auth', JSON.stringify(parsed));
            }
          } catch (_) {
            // ignore parse errors
          }
        }

        // helper keys
        localStorage.setItem('userRole', 'artist');
        if (displayName.trim()) localStorage.setItem('userName', displayName.trim());
        localStorage.setItem('isLoggedIn', 'true');
        if (returnedPhotoUrl) localStorage.setItem('photo_url', returnedPhotoUrl);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Failed to update some localStorage keys after onboarding:', e);
      }

      // Navigate after a short moment
      setTimeout(() => {
        navigate('/artist/dashboard');
      }, 900);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Artist onboarding error:', err, err?.response?.data);
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to save profile. Please try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto" style={{ maxWidth: 900 }}>
      <Card.Body>
        <h3>Artist Onboarding</h3>
        <p className="text-muted">Complete your artist profile to start sharing your music.</p>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Form onSubmit={submit} encType="multipart/form-data">
          <Form.Group className="mb-3">
            <Form.Label>Display Name <span className="text-danger">*</span></Form.Label>
            <Form.Control
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your artist name"
              required
            />
            <Form.Text className="text-muted">This is how fans will see you</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Bio</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell fans about yourself, your music journey, and what inspires you..."
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>District</Form.Label>
            <Form.Select
              value={district || ''}
              onChange={e => {
                const val = e.target.value;
                setDistrict(val);
                const first = DISTRICTS && DISTRICTS.length ? DISTRICTS[0] : null;
                if (first && typeof first === 'object' && ('id' in first || 'name' in first)) {
                  const found = DISTRICTS.find(d => String(d.id) === String(val) || String(d.name) === String(val));
                  if (found) {
                    setDistrictId(found.id);
                  } else {
                    setDistrictId(null);
                  }
                } else {
                  setDistrictId(null);
                }
              }}
            >
              <option value="">Select your district (optional)</option>
              {DISTRICTS.map((d, idx) => {
                if (typeof d === 'object') {
                  return <option key={d.id ?? idx} value={d.id ?? d.name}>{d.name ?? d.id}</option>;
                }
                return <option key={d} value={d}>{d}</option>;
              })}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Genres <span className="text-danger">*</span></Form.Label>
            <div className="mb-2">
              {GENRES.map(g => (
                <button
                  type="button"
                  key={g}
                  className={`btn btn-sm me-2 mb-2 ${genres.includes(g) ? 'btn-success' : 'btn-outline-secondary'}`}
                  onClick={() => toggleGenre(g)}
                >
                  {g}
                </button>
              ))}
            </div>
            <Form.Text className="text-muted">
              Selected: {genres.length > 0 ? genres.join(', ') : 'None'}
            </Form.Text>

            {genres.length > 0 && (
              <div className="mt-2">
                {genres.map(g => <Badge bg="success" className="me-2" key={g}>{g}</Badge>)}
              </div>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Profile Photo (optional)</Form.Label>
            <div className="d-flex align-items-center mb-2">
              <div>
                <input
                  id="photoInput"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  style={{ display: 'inline-block' }}
                />
              </div>

              {photoPreview && (
                <div className="ms-3 d-flex align-items-center">
                  <Image
                    src={photoPreview}
                    rounded
                    thumbnail
                    style={{ width: 96, height: 96, objectFit: 'cover' }}
                    alt="Preview"
                  />
                  <div className="ms-2">
                    <div>
                      <Button size="sm" variant="outline-danger" onClick={removeSelectedPhoto}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Form.Text className="text-muted">Accepted: JPG, PNG. Max 5 MB.</Form.Text>
          </Form.Group>

          <div className="d-grid mt-4">
            <Button type="submit" variant="success" size="lg" disabled={loading}>
              {loading ? 'Saving...' : 'Complete Profile'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
