'use client';

import { useDaily, useLocalSessionId, useParticipantIds, useVideoTrack, useAudioTrack } from '@daily-co/daily-react';
import { useEffect, useRef } from 'react';

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
      <audio ref={audioRef} autoPlay playsInline />
    </div>
  );
}

export default function VideoCall() {
  const callObject = useDaily();
  const localSessionId = useLocalSessionId();
  const remoteParticipantIds = useParticipantIds({ filter: 'remote' });

  if (!callObject || !localSessionId) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-xl">
        Connecting to video call...
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

