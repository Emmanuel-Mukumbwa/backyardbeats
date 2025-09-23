// File: src/components/AudioPlayer.jsx
import React, { useRef, useState, useEffect } from 'react';

export default function AudioPlayer({ tracks = [] }) {
  const audioRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setProgress(audio.currentTime);
    const onEnd = () => {
      // auto-advance to next preview if exists
      if (currentIndex < tracks.length - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        setPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [currentIndex, tracks.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = tracks[currentIndex]?.previewUrl || '';
    audio.load();
    if (playing) audio.play().catch(() => setPlaying(false));
  }, [currentIndex, tracks, playing]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }

  return (
    <div className="card p-3">
      <div className="d-flex align-items-center">
        <div className="me-3">
          <button className={`btn btn-sm ${playing ? 'btn-danger' : 'btn-success'}`} onClick={togglePlay}>
            {playing ? 'Pause' : 'Play'}
          </button>
        </div>
        <div className="flex-grow-1">
          <div className="fw-bold">{tracks[currentIndex]?.title || 'No track selected'}</div>
          <div className="small text-muted">Preview</div>
          <div className="progress mt-2" style={{height:6}}>
            <div className="progress-bar" role="progressbar" style={{width: tracks[currentIndex] && tracks[currentIndex].duration ? `${(progress / tracks[currentIndex].duration) * 100}%` : '0%'}} />
          </div>
          <div className="small mt-1 text-muted">{Math.floor(progress)}s / {tracks[currentIndex]?.duration || 0}s</div>
        </div>
        <div className="ms-3">
          <div className="btn-group-vertical">
            <button className="btn btn-outline-secondary btn-sm" onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}>Prev</button>
            <button className="btn btn-outline-secondary btn-sm" onClick={() => setCurrentIndex(i => Math.min(tracks.length - 1, i + 1))}>Next</button>
          </div>
        </div>
      </div>
      <audio ref={audioRef} />
    </div>
  );
}
