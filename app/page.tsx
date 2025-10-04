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
        
        if (!roomUrl) {
          console.error('NEXT_PUBLIC_DAILY_ROOM_URL environment variable is not set');
          return;
        }

        console.log('Attempting to join call with room URL:', roomUrl);
        
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
            console.log('Got token, joining with permissions...');
            // Join with token (includes transcription permissions for teachers)
            await callObject.join({ 
              url: roomUrl,
              token,
            });
            console.log(`Joined as ${userType} with transcription permissions`);
          } else {
            const errorData = await response.json();
            console.warn('Failed to get token:', errorData);
            // Fallback: join without token
            console.warn('Joining without token as fallback');
            await callObject.join({ 
              url: roomUrl,
              userName: userType === 'teacher' ? 'Teacher' : `Student ${Math.floor(Math.random() * 1000)}`,
            });
          }
          setHasJoined(true);
        } catch (error) {
          console.error('Error joining call:', error);
          // Show user-friendly error
          alert('Failed to connect to video call. Please check your internet connection and try again.');
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
  const [browserSupported, setBrowserSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // Check browser compatibility
    const checkBrowserSupport = () => {
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasWebRTC = !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection);
      const isHTTPS = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      
      const supported = hasGetUserMedia && hasWebRTC && isHTTPS;
      setBrowserSupported(supported);
      
      if (!supported) {
        console.error('Browser compatibility issues:', {
          hasGetUserMedia,
          hasWebRTC,
          isHTTPS,
          userAgent: navigator.userAgent
        });
      }
      
      return supported;
    };

    if (!checkBrowserSupport()) {
      return;
    }

    // Create Daily call object with enhanced configuration
    const call = DailyIframe.createCallObject({
      audioSource: true,
      videoSource: true,
      // Add configuration for better deployment compatibility
      dailyConfig: {
        useDevicePreferenceCookies: true,
        enableChromeOnAndroid: true,
        enableSafari: true,
        enableFirefox: true,
        enableEdge: true,
      },
    });

    // Add error handling for call object
    call.on('error', (event) => {
      console.error('Daily call object error:', event);
    });

    setCallObject(call);

    return () => {
      call?.destroy();
    };
  }, []);

  if (browserSupported === false) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Browser Not Supported</h1>
          <p className="text-gray-600 mb-4">
            Your browser doesn't support video calling features. Please use a modern browser like Chrome, Firefox, Safari, or Edge.
          </p>
          <p className="text-sm text-gray-500">
            Make sure you're using HTTPS and have granted camera/microphone permissions.
          </p>
        </div>
      </div>
    );
  }

  if (!callObject) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">📹</div>
          <div className="text-sm text-[#6B6F76] font-medium">Initializing video call...</div>
        </div>
      </div>
    );
  }

  return (
    <DailyProvider callObject={callObject}>
      <CallInterface />
    </DailyProvider>
  );
}
