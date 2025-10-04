'use client';

import { useDaily, useLocalSessionId, useVideoTrack, useAudioTrack } from '@daily-co/daily-react';
import { RiMicFill, RiMicOffFill, RiVideoFill, RiVideoOffFill, RiPhoneFill, RiRecordCircleLine, RiRecordCircleFill } from 'react-icons/ri';
import { useState, useEffect } from 'react';

export default function ControlPanel() {
  const callObject = useDaily();
  const localSessionId = useLocalSessionId();
  const localVideo = useVideoTrack(localSessionId || '');
  const localAudio = useAudioTrack(localSessionId || '');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);

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

  const runScenario = () => {
    if (!selectedScenario) return;
    try {
      window.dispatchEvent(new CustomEvent('classpro-run-scenario', { detail: { id: selectedScenario } }));
    } catch (e) {
      console.error('Failed to dispatch scenario event', e);
    }
  };

  const createTestTranscript = async () => {
    try {
      setIsGeneratingTranscript(true);
      const res = await fetch('/api/generate-test-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutesElapsed: 15 }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('Failed to generate test transcript:', text);
        return;
      }
      const data = await res.json();
      const messages = Array.isArray(data?.messages) ? data.messages : [];
      window.dispatchEvent(new CustomEvent('classpro-test-transcript', { detail: { messages } }));
    } catch (e) {
      console.error('Error generating test transcript', e);
    } finally {
      setIsGeneratingTranscript(false);
    }
  };

  // Listen for transcription status
  useEffect(() => {
    if (!callObject) return;

    const handleTranscriptionStarted = () => {
      console.log('Transcription started');
      setIsTranscribing(true);
    };

    const handleTranscriptionStopped = () => {
      console.log('Transcription stopped');
      setIsTranscribing(false);
    };

    const handleTranscriptionError = (event: any) => {
      console.error('Transcription error:', event);
      setIsTranscribing(false);
    };

    callObject.on('transcription-started', handleTranscriptionStarted);
    callObject.on('transcription-stopped', handleTranscriptionStopped);
    callObject.on('transcription-error', handleTranscriptionError);

    return () => {
      callObject.off('transcription-started', handleTranscriptionStarted);
      callObject.off('transcription-stopped', handleTranscriptionStopped);
      callObject.off('transcription-error', handleTranscriptionError);
    };
  }, [callObject]);

  const toggleTranscription = async () => {
    if (!callObject) return;

    try {
      if (isTranscribing) {
        // Optimistically update UI
        setIsTranscribing(false);
        await callObject.stopTranscription();
        console.log('Transcription stop requested');
      } else {
        const meetingState = callObject.meetingState();
        if (meetingState !== 'joined-meeting') {
          console.error('Please join the call before starting transcription');
          return;
        }
        // Optimistically update UI
        setIsTranscribing(true);
        await callObject.startTranscription();
        console.log('Transcription start requested');
      }
    } catch (err: any) {
      console.error('Error toggling transcription:', err);
      // Revert on error
      setIsTranscribing(prev => !prev);
    }
  };

  if (!callObject || !localSessionId) {
    return (
      <div className="bg-white rounded-lg border border-[#E5E5E5] p-3">
        <div className="flex items-center justify-center gap-2">
          <p className="text-[13px] text-[#6B6F76]">Connecting...</p>
        </div>
      </div>
    );
  }

  const isVideoOff = localVideo.isOff || localVideo.state === 'off' || !currentVideoState;
  const isAudioOff = localAudio.isOff || localAudio.state === 'off' || !currentAudioState;

  return (
    <div className="bg-white rounded-lg border border-[#E5E5E5] p-3 relative">
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={toggleTranscription}
          className={`w-10 h-10 rounded-md flex items-center justify-center transition-all ${
            isTranscribing
              ? 'bg-[#00B386] text-white hover:bg-[#009670]'
              : 'bg-[#F5F5F5] text-[#0D0D0D] hover:bg-[#E5E5E5]'
          }`}
          title={isTranscribing ? 'Stop Recording' : 'Start Recording'}
        >
          {isTranscribing ? <RiRecordCircleFill size={18} className="animate-pulse" /> : <RiRecordCircleLine size={18} />}
        </button>

        <button
          onClick={toggleMicrophone}
          className={`w-10 h-10 rounded-md flex items-center justify-center transition-all ${
            isAudioOff
              ? 'bg-[#DF2D36] text-white hover:bg-[#C52830]'
              : 'bg-[#F5F5F5] text-[#0D0D0D] hover:bg-[#E5E5E5]'
          }`}
          title={isAudioOff ? 'Unmute' : 'Mute'}
        >
          {isAudioOff ? <RiMicOffFill size={18} /> : <RiMicFill size={18} />}
        </button>
        
        <button
          onClick={toggleCamera}
          className={`w-10 h-10 rounded-md flex items-center justify-center transition-all ${
            isVideoOff
              ? 'bg-[#DF2D36] text-white hover:bg-[#C52830]'
              : 'bg-[#F5F5F5] text-[#0D0D0D] hover:bg-[#E5E5E5]'
          }`}
          title={isVideoOff ? 'Start Video' : 'Stop Video'}
        >
          {isVideoOff ? <RiVideoOffFill size={18} /> : <RiVideoFill size={18} />}
        </button>

        <button
          onClick={leaveCall}
          className="w-10 h-10 rounded-md flex items-center justify-center bg-[#DF2D36] text-white hover:bg-[#C52830] transition-all"
          title="Leave"
        >
          <RiPhoneFill size={18} />
        </button>
      </div>

      {/* Scenario & test controls (top-right) */}
      <div className="absolute right-3 top-3 flex items-center gap-2">
        <select
          value={selectedScenario}
          onChange={(e) => setSelectedScenario(e.target.value)}
          className="h-8 px-2 text-[12px] bg-[#FAFAFA] border border-[#E5E5E5] rounded-md focus:outline-none focus:bg-white focus:border-[#D4D4D4] transition-colors text-[#6B6F76]"
          title="Select a test scenario"
        >
          <option value="">Scenario…</option>
          <option value="scenario-1">Mixed lost vs understand</option>
          <option value="scenario-2">Mostly understand, few lost</option>
          <option value="scenario-3">Scale ~5</option>
          <option value="scenario-4">Scale ~2.5</option>
        </select>
        <button
          onClick={runScenario}
          disabled={!selectedScenario}
          className="h-8 px-2 text-[12px] font-medium bg-[#F5F5F5] text-[#0D0D0D] hover:bg-[#E5E5E5] rounded-md transition-all disabled:bg-[#F5F5F5] disabled:text-[#D4D4D4] disabled:cursor-not-allowed"
          title="Run selected scenario"
        >
          Run
        </button>
        <button
          onClick={createTestTranscript}
          disabled={isGeneratingTranscript}
          className="h-8 px-2 text-[12px] font-medium bg-[#FAFAFA] text-[#6B6F76] hover:bg-[#F0F0F0] border border-[#E5E5E5] rounded-md transition-all disabled:bg-[#F5F5F5] disabled:text-[#D4D4D4] disabled:cursor-not-allowed"
          title="Create a test transcript"
        >
          {isGeneratingTranscript ? 'Creating…' : 'Test Transcript'}
        </button>
      </div>
    </div>
  );
}

