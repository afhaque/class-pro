'use client';

import { useState, useEffect } from 'react';
import { DailyProvider, useDaily } from '@daily-co/daily-react';
import DailyIframe from '@daily-co/daily-js';
import Navbar from '@/components/Navbar';
import VideoSection from '@/components/VideoSection';
import ChatInterface from '@/components/ChatInterface';

function CallInterface() {
  const [userType, setUserType] = useState<'teacher' | 'student'>('teacher');
  const callObject = useDaily();
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    const joinCall = async () => {
      if (callObject && !hasJoined) {
        const roomUrl = process.env.NEXT_PUBLIC_DAILY_ROOM_URL;
        if (roomUrl) {
          try {
            // Get meeting token with appropriate permissions
            const response = await fetch('/api/get-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ userType }),
            });
            
            if (response.ok) {
              const { token } = await response.json();
              // Join with token (includes transcription permissions for teachers)
              await callObject.join({ 
                url: roomUrl,
                token,
              });
              console.log(`Joined as ${userType} with transcription permissions`);
            } else {
              // Fallback: join without token
              console.warn('Failed to get token, joining without it');
              await callObject.join({ 
                url: roomUrl,
                userName: userType === 'teacher' ? 'Teacher' : `Student ${Math.floor(Math.random() * 1000)}`,
              });
            }
            setHasJoined(true);
          } catch (error) {
            console.error('Error joining call:', error);
          }
        }
      }
    };
    
    joinCall();
  }, [callObject, userType, hasJoined]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <Navbar userType={userType} onUserTypeChange={setUserType} />

      {/* Main Content with generous spacing */}
      <main className="flex-1 p-8 max-w-[1600px] mx-auto w-full">
        {/* Video and Chat Section - clean layout with breathing room */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 h-[calc(100vh-120px)] min-h-[600px]">
          <VideoSection userType={userType} />
          <ChatInterface userType={userType} />
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  const [callObject, setCallObject] = useState<ReturnType<typeof DailyIframe.createCallObject> | null>(null);

  useEffect(() => {
    const call = DailyIframe.createCallObject({
      audioSource: true,
      videoSource: true,
    });
    setCallObject(call);

    return () => {
      call?.destroy();
    };
  }, []);

  if (!callObject) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-sm text-[#6B6F76] font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <DailyProvider callObject={callObject}>
      <CallInterface />
    </DailyProvider>
  );
}
