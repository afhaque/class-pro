'use client';

import { useDaily, useLocalSessionId, useVideoTrack, useAudioTrack } from '@daily-co/daily-react';

export default function ControlPanel() {
  const callObject = useDaily();
  const localSessionId = useLocalSessionId();
  const localVideo = useVideoTrack(localSessionId || '');
  const localAudio = useAudioTrack(localSessionId || '');

  console.log('Video state details:', {
    isOff: localVideo.isOff,
    state: localVideo.state,
    track: localVideo.track,
    persistentTrack: localVideo.persistentTrack
  });
  
  console.log('Audio state details:', {
    isOff: localAudio.isOff,
    state: localAudio.state,
    track: localAudio.track
  });

  // Check the actual current local media state from Daily
  const currentVideoState = callObject?.localVideo();
  const currentAudioState = callObject?.localAudio();
  
  console.log('Daily call object states:', {
    video: currentVideoState,
    audio: currentAudioState
  });

  const toggleCamera = async () => {
    if (callObject) {
      try {
        const current = callObject.localVideo();
        console.log('Current video state from callObject:', current);
        await callObject.setLocalVideo(!current);
        console.log('Video toggled to:', !current);
      } catch (error) {
        console.error('Error toggling camera:', error);
      }
    }
  };

  const toggleMicrophone = async () => {
    if (callObject) {
      try {
        const current = callObject.localAudio();
        await callObject.setLocalAudio(!current);
        console.log('Audio toggled to:', !current);
      } catch (error) {
        console.error('Error toggling microphone:', error);
      }
    }
  };

  const leaveCall = () => {
    if (callObject) {
      callObject.leave();
    }
  };

  if (!callObject || !localSessionId) {
    return (
      <div className="bg-yellow-200 rounded-lg p-6">
        <div className="flex items-center justify-center gap-4">
          <p className="text-gray-600">Connecting...</p>
        </div>
      </div>
    );
  }

  const isVideoOff = localVideo.isOff || localVideo.state === 'off' || !currentVideoState;
  const isAudioOff = localAudio.isOff || localAudio.state === 'off' || !currentAudioState;

  return (
    <div className="bg-yellow-200 rounded-lg p-6">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={toggleMicrophone}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isAudioOff
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-gray-700 text-white hover:bg-gray-800'
          }`}
        >
          {isAudioOff ? '🔇 Unmute' : '🎤 Mute'}
        </button>
        
        <button
          onClick={toggleCamera}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isVideoOff
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-gray-700 text-white hover:bg-gray-800'
          }`}
        >
          {isVideoOff ? '📹 Start Video' : '🎥 Stop Video'}
        </button>

        <button
          onClick={leaveCall}
          className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
        >
          📞 Leave
        </button>
      </div>
    </div>
  );
}

