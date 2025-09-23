import React, { useState } from 'react';
import axios from '../api/axiosConfig';

export default function RatingsForm({ artistId, onSubmitted }) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = { stars, comment, reviewerName };
      const res = await axios.post(`/artists/${artistId}/ratings`, payload);
      const newRating = res.data;
      setComment('');
      setStars(5);
      setReviewerName('');
      setSuccessMsg('Thanks! Your review was submitted.');
      // notify parent to refresh ratings list
      if (onSubmitted) onSubmitted(newRating);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save rating');
    } finally {
      setLoading(false);
      // remove success message after a few seconds
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="mb-2">
        <label className="form-label">Your name (optional)</label>
        <input className="form-control" value={reviewerName} onChange={e => setReviewerName(e.target.value)} placeholder="e.g. Anna" />
      </div>

      <div className="mb-2">
        <label className="form-label">Stars</label>
        <select className="form-select" value={stars} onChange={e => setStars(Number(e.target.value))}>
          {[5,4,3,2,1].map(s => <option key={s} value={s}>{s} stars</option>)}
        </select>
      </div>

      <div className="mb-2">
        <label className="form-label">Comment</label>
        <textarea className="form-control" rows={3} value={comment} onChange={e => setComment(e.target.value)} />
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <div className="d-grid">
        <button className="btn btn-success" type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Review'}</button>
      </div>
    </form>
  );
}
