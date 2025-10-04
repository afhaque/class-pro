'use client';

import VideoCall from './VideoCall';
import ControlPanel from './ControlPanel';
import TeachingAssistantOverlay from './TeachingAssistantOverlay';

export default function VideoSection({ userType }: { userType: 'teacher' | 'student' }) {
  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex-1 overflow-hidden rounded-lg bg-[#0D0D0D] shadow relative">
        <VideoCall />
        <TeachingAssistantOverlay userType={userType} />
      </div>
      
      {/* Control Panel */}
      <ControlPanel />
    </div>
  );
}

