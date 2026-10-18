import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, AlertCircle, Loader2 } from 'lucide-react';

export function AudioPlayer({ audioUrl, passage, title = 'Audio Passage' }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showPassage, setShowPassage] = useState(false);

  const audioRef = useRef(null);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setHasError(false);

    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [audioUrl]);

  function togglePlay() {
    if (!audioRef.current || hasError) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error('Audio playback error:', err);
          setHasError(true);
          setIsPlaying(false);
        });
    }
  }

  function handleReplay() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setHasError(true));
  }

  function handleTimeUpdate() {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  }

  function handleLoadedMetadata() {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
    setIsLoading(false);
    setHasError(false);
  }

  function handleSeek(e) {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }

  function togglePlaybackRate() {
    const nextRate = playbackRate === 1.0 ? 0.8 : 1.0;
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }

  function formatTime(sec) {
    if (isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  return (
    <div className="audio-player-card">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
          setIsPlaying(false);
        }}
      />

      <div className="audio-player-controls">
        <button
          className="audio-play-btn"
          onClick={togglePlay}
          disabled={isLoading || hasError}
          aria-label={isPlaying ? 'Pause audio passage' : 'Play audio passage'}
        >
          {isLoading ? (
            <Loader2 className="spin" size={20} />
          ) : isPlaying ? (
            <Pause size={20} />
          ) : (
            <Play size={20} style={{ marginLeft: '2px' }} />
          )}
        </button>

        <button
          className="icon-button"
          onClick={handleReplay}
          disabled={isLoading || hasError}
          aria-label="Replay audio passage"
          title="Restart from beginning"
        >
          <RotateCcw size={18} />
        </button>

        <div className="audio-track-info">
          <div className="audio-scrubber-wrap">
            <input
              type="range"
              className="audio-scrubber"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              disabled={isLoading || hasError}
              aria-label="Audio progress scrubber"
            />
            <span className="audio-time-label">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        <button
          className="audio-speed-btn"
          onClick={togglePlaybackRate}
          aria-label={`Playback speed: ${playbackRate}x`}
          title="Toggle playback speed (1.0x or 0.8x for slower practice)"
        >
          {playbackRate}x
        </button>
      </div>

      {hasError && (
        <div className="form-error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>Audio could not be loaded. Please verify your connection or try restarting the player.</span>
        </div>
      )}

      {passage && (
        <div>
          <button
            className="audio-passage-toggle"
            onClick={() => setShowPassage(!showPassage)}
            aria-expanded={showPassage}
          >
            <Volume2 size={15} />
            <span>{showPassage ? 'Hide passage transcript' : 'Show passage transcript (read along)'}</span>
          </button>
          {showPassage && <div className="audio-passage-box">{passage}</div>}
        </div>
      )}
    </div>
  );
}
