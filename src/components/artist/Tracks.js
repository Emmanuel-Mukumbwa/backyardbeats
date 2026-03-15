// src/components/artist/Tracks.js
import React, { useRef, useContext } from 'react';
import { Button } from 'react-bootstrap';
import { FaDownload } from 'react-icons/fa';
import axios from '../../api/axiosConfig';
import { AuthContext } from '../../context/AuthContext';

/**
 * Simple tracks list used in artist area
 * Props:
 *  - tracks: array
 *  - resolveToBackend: fn
 *  - fmtDuration: fn
 *  - onDownload: optional fn(trackId)
 */
export default function TracksPanel({ tracks = [], resolveToBackend, fmtDuration = (d) => (d ? `${d}s` : '-'), onDownload = null }) {
  const playingRef = useRef(null);
  const { user, artist: myArtist } = useContext(AuthContext);

  function handlePlay(el, t) {
    if (playingRef.current && playingRef.current !== el) {
      try { playingRef.current.pause(); } catch (e) {}
    }
    playingRef.current = el;

    // record listen (best-effort) unless current user is owner
    if (user && user.id && t && t.id) {
      if (myArtist && t.artist && Number(myArtist.id) === Number(t.artist.id)) {
        // skip
      } else {
        axios.post('/fan/listens', { track_id: t.id, artist_id: t.artist?.id || null }).catch(() => {});
      }
    }
  }

  function handlePause(el) {
    if (playingRef.current === el) playingRef.current = null;
  }

  function sanitizeFilename(s) {
    if (!s) return '';
    return String(s)
      .replace(/["'<>:\\/|?*]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 190);
  }

  async function downloadTrackById(trackId) {
    // if parent supplied an onDownload handler, prefer that
    if (typeof onDownload === 'function') return onDownload(trackId);

    try {
      const res = await axios.get(`/download/${trackId}`, { responseType: 'blob' });

      const disposition = (res.headers && (res.headers['content-disposition'] || res.headers['Content-Disposition'])) || '';
      let filename = null;
      if (disposition) {
        const fnStar = disposition.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
        if (fnStar && fnStar[1]) {
          try { filename = decodeURIComponent(fnStar[1].replace(/['"]/g, '')); } catch (e) { filename = fnStar[1].replace(/['"]/g, ''); }
        }
        if (!filename) {
          const quoted = disposition.match(/filename\s*=\s*"([^"]+)"/i);
          if (quoted && quoted[1]) filename = quoted[1];
        }
        if (!filename) {
          const unq = disposition.match(/filename\s*=\s*([^;]+)/i);
          if (unq && unq[1]) filename = unq[1].replace(/['"]/g, '').trim();
        }
      }

      if (!filename) {
        const title = (res.headers && (res.headers['x-track-title'] || res.headers['X-Track-Title'])) || '';
        const mime = (res.data && res.data.type) || '';
        let ext = '.mp3';
        if (mime.includes('mpeg')) ext = '.mp3';
        else if (mime.includes('audio/mp4') || mime.includes('m4a')) ext = '.m4a';
        else if (mime.includes('ogg')) ext = '.ogg';
        else if (mime.includes('wav')) ext = '.wav';
        else if (mime.includes('flac')) ext = '.flac';
        filename = `${sanitizeFilename(title || `track-${trackId}`)}${ext}`;
      }

      filename = filename && sanitizeFilename(filename) ? filename : `track-${trackId}.mp3`;

      const blob = res.data;
      if ((blob.type || '').includes('application/json')) {
        const txt = await blob.text();
        let parsed;
        try { parsed = JSON.parse(txt); } catch (e) { parsed = txt; }
        // fallback: alert
        alert(`Download failed: ${JSON.stringify(parsed)}`);
        return;
      }

      let fileToSave;
      try {
        fileToSave = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
      } catch (e) {
        fileToSave = blob;
      }

      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(fileToSave, filename);
      } else {
        const url = window.URL.createObjectURL(fileToSave);
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      // silent fail for now
      try {
        let message = err.message || 'Download failed';
        if (err.response && err.response.data) {
          const data = err.response.data;
          if (data instanceof Blob) {
            const txt = await data.text();
            try { const parsed = JSON.parse(txt); message = parsed.error || JSON.stringify(parsed); } catch (_) { message = txt; }
          } else if (typeof data === 'object') { message = data.error || JSON.stringify(data); } else { message = String(data); }
        }
        alert(`Download failed: ${message}`);
      } catch (_) {
        alert('Download failed');
      }
    }
  }

  return (
    <div>
      {tracks && tracks.length > 0 ? (
        <div className="list-group mt-2">
          {tracks.map(t => {
            const previewRaw = t.preview_url || t.previewUrl || t.file_url || t.preview || t.file || null;
            const previewUrl = previewRaw ? (typeof resolveToBackend === 'function' ? resolveToBackend(previewRaw) : previewRaw) : null;
            return (
              <div key={t.id} className="list-group-item d-flex justify-content-between align-items-center">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="fw-bold text-truncate">{t.title}</div>
                  <div className="small text-muted">{t.genre ? `${t.genre} · ` : ''}{fmtDuration(t.duration)}</div>
                  {t.is_rejected && <div className="small text-danger">Track rejected{t.rejection_reason ? `: ${t.rejection_reason}` : ''}. <a href="/support">Appeal</a></div>}
                  {!t.is_approved && !t.is_rejected && <div className="small text-muted">Pending approval</div>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {previewUrl ? (
                    <>
                      <audio
                        controls
                        preload="none"
                        controlsList="nodownload"
                        style={{ width: 320, maxWidth: '40vw' }}
                        src={previewUrl}
                        onPlay={(e) => handlePlay(e.target, t)}
                        onPause={(e) => handlePause(e.target)}
                        onEnded={() => handlePause(null)}
                      />
                      <Button size="sm" variant="outline-secondary" onClick={() => downloadTrackById(t.id)} title="Download track">
                        <FaDownload />
                      </Button>
                    </>
                  ) : (
                    <div className="small text-muted">No preview</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-muted">No tracks uploaded yet.</div>
      )}
    </div>
  );
}