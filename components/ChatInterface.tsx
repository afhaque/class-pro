'use client';

import { useState, useEffect } from 'react';
import ChatTab from './ChatTab';
import TranscriptTab from './TranscriptTab';
import PulseTab from './PulseTab';

type TabType = 'chat' | 'transcript' | 'pulse';

const LANGUAGE_STORAGE_KEY = 'class-pro-user-language';

const COMMON_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'it', name: 'Italian' },
];

interface ChatInterfaceProps {
  userType: 'teacher' | 'student';
}

export default function ChatInterface({ userType }: ChatInterfaceProps) {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [userLanguage, setUserLanguage] = useState<string>('en');
  const [showLanguageSettings, setShowLanguageSettings] = useState(false);

  // Load user language preference from local storage
  useEffect(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored) {
      setUserLanguage(stored);
    }
  }, []);

  // Switch away from pulse tab if user switches to student view
  useEffect(() => {
    if (userType === 'student' && activeTab === 'pulse') {
      setActiveTab('chat');
    }
  }, [userType, activeTab]);

  // Save user language preference to local storage
  const handleLanguageChange = (langCode: string) => {
    setUserLanguage(langCode);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
    setShowLanguageSettings(false);
  };

  const currentLanguageName = COMMON_LANGUAGES.find(l => l.code === userLanguage)?.name || 'English';

  return (
    <div className="flex flex-col rounded-lg border border-[#E5E5E5] overflow-hidden h-full bg-white shadow">
      {/* Tabs and Language Selector */}
      <div className="flex border-b border-[#E5E5E5] bg-[#FAFAFA]">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2.5 px-4 text-[13px] font-medium transition-all ${
            activeTab === 'chat'
              ? 'text-[#5E6AD2] border-b-2 border-[#5E6AD2] bg-white'
              : 'text-[#6B6F76] hover:text-[#0D0D0D]'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('transcript')}
          className={`flex-1 py-2.5 px-4 text-[13px] font-medium transition-all ${
            activeTab === 'transcript'
              ? 'text-[#5E6AD2] border-b-2 border-[#5E6AD2] bg-white'
              : 'text-[#6B6F76] hover:text-[#0D0D0D]'
          }`}
        >
          Transcript
        </button>
        {userType === 'teacher' && (
          <button
            onClick={() => setActiveTab('pulse')}
            className={`flex-1 py-2.5 px-4 text-[13px] font-medium transition-all ${
              activeTab === 'pulse'
                ? 'text-[#5E6AD2] border-b-2 border-[#5E6AD2] bg-white'
                : 'text-[#6B6F76] hover:text-[#0D0D0D]'
            }`}
          >
            Pulse
          </button>
        )}
        
        {/* Language Settings Button */}
        <div className="relative">
          <button
            onClick={() => setShowLanguageSettings(!showLanguageSettings)}
            className="px-4 py-2.5 text-[13px] text-[#6B6F76] hover:text-[#0D0D0D] border-l border-[#E5E5E5] transition-all flex items-center gap-2"
            title="Language Settings"
          >
            🌐 <span className="text-xs">{currentLanguageName}</span>
          </button>
          
          {showLanguageSettings && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg border border-[#E5E5E5] shadow-md z-50 w-48 max-h-96 overflow-y-auto">
              <div className="p-2">
                <p className="text-[11px] text-[#8B8D98] px-3 py-2 font-medium">Select language</p>
                {COMMON_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-all text-[13px] ${
                      userLanguage === lang.code ? 'bg-[#5E6AD2] text-white' : 'text-[#0D0D0D] hover:bg-[#F5F5F5]'
                    }`}
                  >
                    {lang.name}
                    {userLanguage === lang.code && ' ✓'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Content - keep tabs mounted so transcript keeps running in background */}
      <div className="flex-1 overflow-hidden">
        <div className={activeTab === 'chat' ? 'h-full' : 'hidden'}>
          <ChatTab userLanguage={userLanguage} userType={userType} />
        </div>
        <div className={activeTab === 'transcript' ? 'h-full' : 'hidden'}>
          <TranscriptTab userLanguage={userLanguage} />
        </div>
        {userType === 'teacher' && (
          <div className={activeTab === 'pulse' ? 'h-full' : 'hidden'}>
            <PulseTab />
          </div>
        )}
      </div>
    </div>
  );
}

