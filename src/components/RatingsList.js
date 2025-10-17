//src/components/RatingsList.js
import React, { useEffect, useState } from 'react';
import axios from '../api/axiosConfig';

export default function RatingsList({ artistId, refreshKey = 0 }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios.get(`/artists/${artistId}/ratings`)
      .then(res => {
        if (!cancelled) setRatings(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setRatings([]);
      }) 
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [artistId, refreshKey]); // refetch when refreshKey changes

  if (loading) return <div>Loading reviews...</div>;
  if (!ratings.length) return <div className="text-muted">No reviews yet. Be the first to rate!</div>;

  const avg = (ratings.reduce((s, r) => s + Number(r.stars), 0) / ratings.length).toFixed(1);

  return (
    <div>
      <div className="mb-2">
        <strong>Average</strong> <span className="badge bg-success ms-2">{avg} ★</span>
        <small className="text-muted ms-2">({ratings.length} reviews)</small>
      </div>

      <div className="list-group">
        {ratings.map(r => (
          <div key={r.id} className="list-group-item">
            <div className="d-flex justify-content-between">
              <div><strong>{r.reviewerName || 'Anonymous'}</strong></div>
              <div className="text-muted small">{r.stars} ★</div>
            </div>
            <div className="small text-muted">{new Date(r.createdAt).toLocaleString()}</div>
            <div className="mt-1">{r.comment}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
