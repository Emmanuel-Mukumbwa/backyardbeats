// mockServer.js
// Mock server for BackyardBeats serving static assets and mock API
const express = require('express');
const cors = require('cors');
const path = require('path');

// Use the mockData artists.json (ensure mockData/artists.json exists next to this file)
const artists = require('./mockData/artists.json');

const app = express();
app.use(cors());
app.use(express.json());

// === SERVE STATIC ASSETS AT /assets ===
// Make sure you have a folder named `public_assets` (same folder as this file)
// containing `images/` and `tracks/` subfolders. Example:
//  project-root/
//    mockServer.js
//    public_assets/
//      images/zed.jpg
//      tracks/zed-morning.wav
app.use('/assets', express.static(path.join(__dirname, 'public_assets')));

const port = process.env.MOCK_PORT || 5000;

/* -----------------------
   In-memory stores & seed
   ----------------------- */

// ratings (in-memory)
let ratings = [
  // sample rating
  { id: 1, artistId: 1, reviewerName: 'Fan A', stars: 5, comment: 'Amazing sound!', createdAt: new Date().toISOString() }
];
let nextRatingId = 2;

// users (in-memory) - simple mock users (passwords stored in plain text for mock)
let users = [
  { id: 1, email: 'admin@bb.test', phone: '099111222', displayName: 'Admin', role: 'fan', password: 'password', district: '' }
];
let nextUserId = 2;

// events (derive initial events from artists who have hasUpcomingEvent)
let events = artists
  .filter(a => a.hasUpcomingEvent)
  .map((a, idx) => ({
    id: idx + 1,
    title: `${a.displayName} Live in ${a.district}`,
    description: `Catch ${a.displayName} performing live at the central venue in ${a.district}.`,
    event_date: new Date(Date.now() + (idx + 1) * 86400000).toISOString(),
    district: a.district,
    artistId: a.id,
    artist: { id: a.id, displayName: a.displayName }
  }));
let nextEventId = events.length + 1;

/* -----------------------
   Helper utilities
   ----------------------- */

function findUserByIdentifier(identifier) {
  if (!identifier) return null;
  return users.find(u => u.email === identifier || u.phone === identifier || u.displayName === identifier);
}

/* -----------------------
   Artist endpoints
   ----------------------- */

// GET /api/artists
app.get('/api/artists', (req, res) => {
  const { district, genre, q } = req.query;
  let results = artists;

  if (district) {
    results = results.filter(a => a.district.toLowerCase() === district.toLowerCase());
  }
  if (genre) {
    results = results.filter(a => a.genres.map(g => g.toLowerCase()).includes(genre.toLowerCase()));
  }
  if (q) {
    const ql = q.toLowerCase();
    results = results.filter(a => (a.displayName || '').toLowerCase().includes(ql) || (a.bio || '').toLowerCase().includes(ql));
  }
  res.json(results);
});

// GET /api/featured
app.get('/api/featured', (req, res) => {
  const featured = artists.filter(a => a.hasUpcomingEvent).slice(0, 6);
  res.json(featured);
});

// GET /api/artists/:id
app.get('/api/artists/:id', (req, res) => {
  const id = Number(req.params.id);
  const artist = artists.find(a => a.id === id);
  if (!artist) return res.status(404).json({ error: 'Artist not found' });
  res.json(artist);
});

/* -----------------------
   Ratings endpoints
   ----------------------- */

// GET /api/artists/:id/ratings
app.get('/api/artists/:id/ratings', (req, res) => {
  const artistId = Number(req.params.id);
  const r = ratings.filter(rt => rt.artistId === artistId);
  res.json(r);
});

// POST /api/artists/:id/ratings
app.post('/api/artists/:id/ratings', (req, res) => {
  const artistId = Number(req.params.id);
  const { stars, comment, reviewerName } = req.body;
  if (!stars || stars < 1 || stars > 5) return res.status(400).json({ error: 'Invalid stars' });
  const newR = { id: nextRatingId++, artistId, stars: Number(stars), comment: comment || '', reviewerName: reviewerName || null, createdAt: new Date().toISOString() };
  ratings.unshift(newR);
  res.status(201).json(newR);
});

/* -----------------------
   Auth endpoints (mock)
   ----------------------- */

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { displayName, email, phone, password, role, district } = req.body;
  if (!displayName || !password) return res.status(400).json({ error: 'Missing fields' });

  // Basic uniqueness guard on email/phone/displayName (mock)
  const conflict = users.find(u => (email && u.email === email) || (phone && u.phone === phone) || u.displayName === displayName);
  if (conflict) return res.status(400).json({ error: 'User with same email/phone/display name already exists' });

  const newU = { id: nextUserId++, displayName, email: email || null, phone: phone || null, password, role: role || 'fan', district: district || null };
  users.push(newU);

  // if role is artist, add minimal artist record
  if (newU.role === 'artist') {
    const newArtist = {
      id: artists.length + 1,
      displayName: newU.displayName,
      bio: '',
      photoUrl: '/assets/placeholder.png',
      lat: -13.9626,
      lng: 33.7741,
      district: newU.district || '',
      genres: [],
      mood: [],
      avgRating: 0,
      hasUpcomingEvent: false,
      tracks: []
    };
    artists.push(newArtist);
  }

  // return token (mock) and user
  res.json({ token: 'mock-token-' + newU.id, user: newU });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body;
  const u = findUserByIdentifier(identifier);
  if (!u || u.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: 'mock-token-' + u.id, user: u });
});

/* -----------------------
   Events endpoints
   ----------------------- */

// GET /api/events
app.get('/api/events', (req, res) => {
  res.json(events);
});

// GET /api/events/:id
app.get('/api/events/:id', (req, res) => {
  const id = Number(req.params.id);
  const ev = events.find(e => e.id === id);
  if (!ev) return res.status(404).json({ error: 'Event not found' });
  res.json(ev);
});

// POST /api/artists/:id/events  (create event for artist)
app.post('/api/artists/:id/events', (req, res) => {
  const artistId = Number(req.params.id);
  const artist = artists.find(a => a.id === artistId);
  if (!artist) return res.status(404).json({ error: 'Artist not found' });

  const { title, description, event_date, district } = req.body;
  if (!title || !event_date) return res.status(400).json({ error: 'Missing title or event_date' });

  const newEv = {
    id: nextEventId++,
    title,
    description: description || '',
    event_date,
    district: district || artist.district || '',
    artistId: artist.id,
    artist: { id: artist.id, displayName: artist.displayName }
  };
  events.push(newEv);
  artist.hasUpcomingEvent = true;

  res.status(201).json(newEv);
});

/* -----------------------
   Artist onboarding helper
   ----------------------- */

// POST /api/artist/onboard
// simple endpoint used by onboarding page; creates/updates minimal artist profile
app.post('/api/artist/onboard', (req, res) => {
  const { displayName, bio, district, genres, photoUrl } = req.body;
  if (!displayName) return res.status(400).json({ error: 'Missing displayName' });

  // Try to find existing artist by displayName
  let artist = artists.find(a => a.displayName === displayName);
  if (artist) {
    // update
    artist.bio = bio || artist.bio;
    artist.district = district || artist.district;
    artist.genres = Array.isArray(genres) ? genres : artist.genres;
    artist.photoUrl = photoUrl || artist.photoUrl;
    return res.json(artist);
  }

  // create new artist
  const newArtist = {
    id: artists.length + 1,
    displayName,
    bio: bio || '',
    photoUrl: photoUrl || '/assets/placeholder.png',
    lat: -13.9626,
    lng: 33.7741,
    district: district || '',
    genres: Array.isArray(genres) ? genres : [],
    mood: [],
    avgRating: 0,
    hasUpcomingEvent: false,
    tracks: []
  };
  artists.push(newArtist);
  res.status(201).json(newArtist);
});

/* -----------------------
   Start server
   ----------------------- */
app.listen(port, () => {
  console.log(`Mock server listening at http://localhost:${port}`);
  console.log(`Serving static assets from /assets (public_assets folder)`);
  console.log('Available endpoints (mock):');
  console.log('GET  /api/artists');
  console.log('GET  /api/featured');
  console.log('GET  /api/artists/:id');
  console.log('GET  /api/artists/:id/ratings');
  console.log('POST /api/artists/:id/ratings');
  console.log('POST /api/auth/register');
  console.log('POST /api/auth/login');
  console.log('GET  /api/events');
  console.log('GET  /api/events/:id');
  console.log('POST /api/artists/:id/events');
  console.log('POST /api/artist/onboard');
});
