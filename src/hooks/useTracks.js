// src/hooks/useTracks.js
import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from '../api/axiosConfig';

export default function useTracks(path = '/public/tracks/recent', opts = {}) {
  const { limit = 12, params = {} } = opts;

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce(n => n + 1), []);

  // stringify params safely for dependency tracking
  const paramsKey = useMemo(() => JSON.stringify(params || {}), [params]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    axios.get(path, { params: { limit, ...(params || {}) } })
      .then(res => {
        if (cancelled) return;

        const items = Array.isArray(res.data?.items) ? res.data.items : [];

        const mapped = items.map(t => ({
          id: t.id,
          title: t.title,
          preview_url: t.preview_url || t.previewUrl || null,
          artwork_url: t.artwork_url || t.artworkUrl || null,
          duration: t.duration ?? null,
          genre: t.genre || null,
          artist: t.artist
            ? (typeof t.artist === 'object'
                ? t.artist
                : { id: t.artist_id || null, display_name: t.artist_name || null })
            : null,
          release_date: t.release_date || null,
          created_at: t.created_at || null
        }));

        setTracks(mapped);
      })
      .catch(err => {
        if (cancelled) return;

        setTracks([]);
        setError(
          err?.message ||
          err?.response?.data?.error ||
          'Failed to load tracks'
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, limit, paramsKey, params, nonce]);

  return { tracks, loading, error, reload };
}