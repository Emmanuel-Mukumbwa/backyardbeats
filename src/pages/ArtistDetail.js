import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../api/axiosConfig';
import AudioPlayer from '../components/AudioPlayer';
import RatingsList from '../components/RatingsList';
import RatingsForm from '../components/RatingsForm';

export default function ArtistDetail() {
  const { id } = useParams();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // key to trigger ratings refresh
  const [ratingsKey, setRatingsKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    axios.get(`/artists/${id}`)
      .then(res => setArtist(res.data))
      .catch(err => setError(err.message || 'Failed to load artist'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-5">Loading artist...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!artist) return <div className="alert alert-warning">Artist not found</div>;

  const handleRatingSubmitted = (newRating) => {
    // bump key so RatingsList refetches
    setRatingsKey(k => k + 1);
    // optional: you can also update artist.avgRating locally if you want instant average change
  };

  return (
    <div>
      {/* Hero / header */}
      <div className="card mb-4">
        <div style={{height:200, overflow:'hidden'}}>
          <img src={artist.photoUrl || '/assets/placeholder.png'} alt={artist.displayName} style={{width:'100%', objectFit:'cover'}} />
        </div>
        <div className="card-body">
          <h2 className="card-title mb-1">{artist.displayName}</h2>
          <div className="mb-2 text-muted small">{artist.district} • {artist.genres?.join(', ')}</div>
          <p className="card-text">{artist.bio}</p>
        </div>
      </div>

      {/* Tracks + Player */}
      <div className="mb-4">
        <h4>Tracks</h4>
        {artist.tracks && artist.tracks.length > 0 ? (
          <div>
            <AudioPlayer tracks={artist.tracks} />
            <div className="list-group mt-3">
              {artist.tracks.map(t => (
                <div key={t.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{t.title}</strong>
                    <div className="small text-muted">{Math.floor(t.duration/60)}:{String(t.duration%60).padStart(2,'0')} preview</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-muted">No tracks uploaded yet.</div>
        )}
      </div>

      {/* Ratings */}
      <div className="row">
        <div className="col-md-6">
          <h4>Ratings & Reviews</h4>
          <RatingsList artistId={artist.id} refreshKey={ratingsKey} />
        </div>
        <div className="col-md-6">
          <h4>Leave a Rating</h4>
          <RatingsForm artistId={artist.id} onSubmitted={handleRatingSubmitted} />
        </div>
      </div>
    </div>
  );
}
