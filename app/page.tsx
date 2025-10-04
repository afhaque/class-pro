'use client';

import { useState, useEffect } from 'react';
import { DailyProvider, useDaily } from '@daily-co/daily-react';
import DailyIframe from '@daily-co/daily-js';
import VideoCall from '@/components/VideoCall';
import ControlPanel from '@/components/ControlPanel';

function CallInterface() {
  const [activeTab, setActiveTab] = useState<'chat' | 'transcript' | 'pulse'>('chat');
  const [userType, setUserType] = useState<'teacher' | 'student'>('teacher');
  const callObject = useDaily();

  useEffect(() => {
    if (callObject) {
      const roomUrl = process.env.NEXT_PUBLIC_DAILY_ROOM_URL;
      if (roomUrl) {
        callObject.join({ url: roomUrl });
      }
    }
  }, [callObject]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-[#1a1a1a] text-white px-8 py-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">ClassPro</h1>
        <div className="flex gap-4">
          <button
            onClick={() => setUserType('teacher')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              userType === 'teacher'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Teacher
          </button>
          <button
            onClick={() => setUserType('student')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              userType === 'student'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Student
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Video and Chat Section */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 mb-8">
          {/* Video Area */}
          <div className="flex flex-col">
            <div className="rounded-lg aspect-video mb-4 overflow-hidden">
              <VideoCall />
            </div>
            
            {/* Control Panel */}
            <ControlPanel />
          </div>

          {/* Chat/Transcript/Pulse Sidebar */}
          <div className="flex flex-col border-2 border-gray-300 rounded-lg overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b-2 border-gray-300">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-3 px-4 font-medium transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-white border-b-4 border-blue-500'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('transcript')}
                className={`flex-1 py-3 px-4 font-medium transition-colors ${
                  activeTab === 'transcript'
                    ? 'bg-white border-b-4 border-blue-500'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Transcript
              </button>
              <button
                onClick={() => setActiveTab('pulse')}
                className={`flex-1 py-3 px-4 font-medium transition-colors ${
                  activeTab === 'pulse'
                    ? 'bg-white border-b-4 border-blue-500'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Pulse
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white p-6 flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <p className="text-2xl font-semibold text-gray-800">Custom</p>
                <p className="text-xl text-gray-600 mt-2">Chat Interface</p>
              </div>
            </div>

            {/* Input Area */}
            <div className="grid grid-cols-[1fr_auto] gap-2 p-4 border-t-2 border-gray-300">
              <input
                type="text"
                placeholder="Text Goes here"
                className="px-4 py-3 border-2 border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
              <button className="px-6 py-3 bg-gray-700 text-white rounded hover:bg-gray-800 transition-colors font-medium">
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* Graphs and Dashboard Section */}
        <div className="border-2 border-gray-300 rounded-lg p-12 min-h-[400px] flex items-center justify-center">
          <p className="text-2xl font-medium text-gray-700">Graphs and Dashboard</p>
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <DailyProvider callObject={callObject}>
      <CallInterface />
    </DailyProvider>
  );
}
