import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square, RotateCcw, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';

export function MicrophoneRecorder({
  onTranscriptChange,
  transcript = '',
  placeholder = 'Speak clearly into your microphone...',
  showTextInputFallback = true
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'prompt' | 'granted' | 'denied' | 'unsupported'
  const [speechApiSupported, setSpeechApiSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const recognitionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recorderRef = useRef(null);

  useEffect(() => {
    // Feature detection for Web Speech API and MediaDevices
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    if (SpeechRecognition) {
      setSpeechApiSupported(true);
    } else if (!hasMedia) {
      setPermissionStatus('unsupported');
    }

    // Cleanup resources strictly on unmount
    return () => {
      stopAllTracks();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  function stopAllTracks() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      mediaStreamRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {}
    }
  }

  async function startRecording() {
    setErrorMessage('');
    setIsProcessing(false);

    // Check mediaDevices permission first
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionStatus('unsupported');
      setErrorMessage('Audio recording is not supported by this browser. You can type your response instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setPermissionStatus('granted');

      // Use Web Speech API if supported for live text transcription
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = event => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          const clean = currentTranscript.trim();
          if (clean) {
            onTranscriptChange(clean);
          }
        };

        recognition.onerror = event => {
          console.warn('Speech recognition event error:', event.error);
          if (event.error === 'not-allowed') {
            setPermissionStatus('denied');
            setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser settings.');
          } else if (event.error === 'no-speech') {
            // No speech detected yet, keep recording or inform user
          } else {
            setErrorMessage(`Speech recognition notice: ${event.error}. You can also type or edit your words below.`);
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          stopAllTracks();
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        // Fallback to MediaRecorder for environments without Web Speech API
        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;
        recorder.ondataavailable = () => {};
        recorder.onstop = () => {
          setIsRecording(false);
          stopAllTracks();
        };
        recorder.start();
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Microphone access error:', err);
      setIsRecording(false);
      stopAllTracks();

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        setErrorMessage('Microphone permission was denied. Please enable microphone access in your browser address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No microphone device was detected on your computer.');
      } else {
        setErrorMessage('Could not initialize microphone: ' + (err.message || 'Unknown error'));
      }
    }
  }

  function stopRecording() {
    setIsProcessing(true);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    stopAllTracks();
    setIsRecording(false);
    setTimeout(() => setIsProcessing(false), 300);
  }

  function handleReset() {
    stopRecording();
    onTranscriptChange('');
    setErrorMessage('');
  }

  return (
    <div className={`mic-recorder-card ${isRecording ? 'recording' : ''}`}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          className={`mic-action-btn ${isRecording ? 'active' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={permissionStatus === 'unsupported' || isProcessing}
          aria-label={isRecording ? 'Stop recording voice' : 'Start speaking with microphone'}
        >
          {isProcessing ? (
            <Loader2 className="spin" size={26} />
          ) : isRecording ? (
            <Square size={24} />
          ) : (
            <Mic size={28} />
          )}
        </button>

        <span className="mic-status-label">
          {isRecording
            ? 'Listening to your voice… Click to stop'
            : isProcessing
            ? 'Processing voice input…'
            : transcript
            ? 'Response captured. You can re-record or adjust below.'
            : 'Click microphone and speak your answer'}
        </span>
      </div>

      {errorMessage && (
        <div className="form-error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {permissionStatus === 'denied' && (
        <div style={{ fontSize: '12.5px', color: '#8a2b20', background: '#fdf1ef', padding: '10px 14px', borderRadius: '10px' }}>
          <b>Microphone Blocked:</b> Click the lock or camera/mic icon in your browser URL bar to allow microphone access, then click try again.
        </div>
      )}

      {showTextInputFallback && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#68795f' }}>
            <span>Recognized transcript (editable):</span>
            {transcript && (
              <button
                type="button"
                className="text-button"
                style={{ fontSize: '12px' }}
                onClick={handleReset}
              >
                <RotateCcw size={12} /> Clear text
              </button>
            )}
          </div>
          <textarea
            className="mic-transcript-area"
            value={transcript}
            onChange={e => onTranscriptChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            aria-label="Spoken transcript input"
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#7a8c72' }}>
        <Info size={14} />
        <span>Voice audio is processed locally in your browser for privacy. No raw audio is permanently stored.</span>
      </div>
    </div>
  );
}
