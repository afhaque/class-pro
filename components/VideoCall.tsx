'use client';

import { useDaily, useLocalSessionId, useParticipantIds, useVideoTrack, useAudioTrack } from '@daily-co/daily-react';
import { useEffect, useRef, useState } from 'react';

function Participant({ sessionId, isLocal }: { sessionId: string; isLocal?: boolean }) {
  const videoState = useVideoTrack(sessionId);
  const audioState = useAudioTrack(sessionId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (videoState.persistentTrack && videoState.state === 'playable') {
        videoRef.current.srcObject = new MediaStream([videoState.persistentTrack]);
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [videoState.persistentTrack, videoState.state]);

  useEffect(() => {
    if (audioRef.current && audioState.persistentTrack) {
      audioRef.current.srcObject = new MediaStream([audioState.persistentTrack]);
    }
  }, [audioState.persistentTrack]);

  const isVideoOff = videoState.isOff || videoState.state === 'off';

  return (
    <div className="relative w-full h-full bg-gray-900">
      {isVideoOff ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="text-6xl mb-2">👤</div>
            <div className="text-white text-sm">{isLocal ? 'You' : 'Participant'}</div>
            <div className="text-gray-400 text-xs">Video off</div>
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      )}
      <audio ref={audioRef} autoPlay playsInline muted={isLocal} />
    </div>
  );
}

export default function VideoCall() {
  const callObject = useDaily();
  const localSessionId = useLocalSessionId();
  const remoteParticipantIds = useParticipantIds({ filter: 'remote' });
  const [connectionState, setConnectionState] = useState<string>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!callObject) return;

    const handleConnectionStateChange = (event: any) => {
      console.log('Daily connection state changed:', event);
      setConnectionState(event?.connectionState || 'unknown');
      
      if (event?.connectionState === 'failed') {
        setError('Failed to connect to video call. Please check your internet connection and try again.');
      } else if (event?.connectionState === 'connected') {
        setError(null);
      }
    };

    const handleError = (event: any) => {
      console.error('Daily error:', event);
      setError(`Video error: ${event?.error?.message || 'Unknown error'}`);
    };

    const handleCameraError = (event: any) => {
      console.error('Camera error:', event);
      setError('Camera access denied. Please allow camera permissions and refresh the page.');
    };

    callObject.on('joined-meeting', handleConnectionStateChange);
    callObject.on('left-meeting', handleConnectionStateChange);
    callObject.on('error', handleError);
    callObject.on('camera-error', handleCameraError);

    return () => {
      callObject.off('joined-meeting', handleConnectionStateChange);
      callObject.off('left-meeting', handleConnectionStateChange);
      callObject.off('error', handleError);
      callObject.off('camera-error', handleCameraError);
    };
  }, [callObject]);

  if (!callObject || !localSessionId) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-xl">
        <div className="text-center">
          <div className="text-2xl mb-2">📹</div>
          <div>Connecting to video call...</div>
          <div className="text-sm text-gray-400 mt-2">State: {connectionState}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-900 text-white text-center p-4">
        <div>
          <div className="text-2xl mb-2">⚠️</div>
          <div className="text-lg mb-2">Video Connection Error</div>
          <div className="text-sm text-red-200 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Always include local participant, plus any remote participants
  const allParticipants = [localSessionId, ...remoteParticipantIds];

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      {allParticipants.length === 1 ? (
        // Single participant view (just local)
        <Participant sessionId={localSessionId} isLocal={true} />
      ) : (
        // Grid view for multiple participants
        <div className={`grid gap-2 p-2 h-full ${
          allParticipants.length === 2 ? 'grid-cols-2' :
          allParticipants.length <= 4 ? 'grid-cols-2 grid-rows-2' :
          allParticipants.length <= 6 ? 'grid-cols-3 grid-rows-2' :
          'grid-cols-3 grid-rows-3'
        }`}>
          {allParticipants.map((sessionId) => (
            <div key={sessionId} className="relative rounded overflow-hidden">
              <Participant sessionId={sessionId} isLocal={sessionId === localSessionId} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

