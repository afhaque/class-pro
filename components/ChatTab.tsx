'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  ablyClient, 
  getChannelName, 
  publishMessage, 
  subscribeToMessages, 
  unsubscribeFromMessages,
  AblyMessage
} from '../lib/ably';
import Ably from 'ably';

interface ChatMessage {
  id: string;
  text: string;
  timestamp: number;
  sender: string;
  detectedLanguage?: {
    code: string;
    name: string;
  };
  autoTranslation?: {
    text: string;
  };
  translation?: {
    text: string;
    targetLang: string;
  };
}

const STORAGE_KEY = 'class-pro-chat-messages';
const STUDENT_NAME_STORAGE_KEY = 'class-pro-student-name';

interface ChatTabProps {
  userLanguage: string;
  userType?: 'teacher' | 'student';
}

export default function ChatTab({ userLanguage, userType }: ChatTabProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [showLanguageInput, setShowLanguageInput] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('');
  const [autoTranslatingIds, setAutoTranslatingIds] = useState<Set<string>>(new Set());
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());
  const [loggedConfidenceIds, setLoggedConfidenceIds] = useState<Set<string>>(new Set());
  
  // Student name state
  const [studentName, setStudentName] = useState<string>('');
  const [showNameInput, setShowNameInput] = useState<boolean>(false);
  
  // Ably channel reference
  const ablyChannelRef = useRef<Ably.RealtimeChannel | null>(null);
  const currentSenderRef = useRef<string>('');

  // Scenario handler: listen for events dispatched from ControlPanel
  useEffect(() => {
    const handleRunScenario = (e: Event) => {
      const custom = e as CustomEvent<{ id: string }>;
      const scenarioId = custom.detail?.id;
      if (!scenarioId) return;

      startScenarioStream(scenarioId);
    };

    window.addEventListener('classpro-run-scenario', handleRunScenario as EventListener);
    return () => {
      window.removeEventListener('classpro-run-scenario', handleRunScenario as EventListener);
    };
  }, []);

  // Streaming scenario messages
  const scenarioTimersRef = useRef<number[]>([]);

  const clearScenarioTimers = () => {
    scenarioTimersRef.current.forEach((t) => window.clearTimeout(t));
    scenarioTimersRef.current = [];
  };

  useEffect(() => {
    return () => clearScenarioTimers();
  }, []);

  const startScenarioStream = (scenarioId: string) => {
    clearScenarioTimers();

    const baseTime = Date.now();
    const makeId = () => `${baseTime}-${Math.random().toString(36).slice(2)}`;

    // Create 30 messages with randomized delays to mimic real responses
    const messagesToSend: Array<{ delay: number; msg: ChatMessage }> = [];

    const push = (text: string, sender: string, delay: number) => {
      messagesToSend.push({
        delay,
        msg: { id: makeId(), text, timestamp: baseTime + delay, sender }
      });
    };

    // Helper to get delay spread between ~0.8s and ~14s as responses trickle in
    const delayed = (index: number) => 800 + Math.floor(Math.random() * 1200) + index * 250;

    const namesPool = [
      'Ivy','Ravi','Nora','Ken','Zara','Leo','Ava','Noah','Ben','Liam',
      'Maya','Ethan','Grace','Hassan','Lucia','Owen','Sara','Diego','Amara','Nina',
      'Jonas','Camille','Sofia','Rafa','Yuki','Hana','Louis','Valeria','Hugo','Eva',
      'Mateo','Aisha','Priya','Ivan','Mina','Ana','Zoe','Kai','Olivia','Jackson',
      'Mila','Aria','Luca','Elena','Marco','Alice','Tom','Emily','Daniel','Sophia'
    ];

    const lostPhrases = [
      'Estoy un poco perdido con el último concepto.',
      'No entiendo la parte de fórmulas.',
      '¿Podemos repasar el último paso?',
      'Still a bit lost on the notation.',
      'Could we see more examples?',
      '조금 헷갈려요. 다시 설명해 주실 수 있나요?',
      '조금 더 예시가 있으면 좋겠어요.',
      'Un peu perdu sur un détail.',
      'Je suis un peu perdu sur la notación.',
      'もう一度ゆっくりお願いします。'
    ];

    const understandPhrases = [
      'Understood, thanks!',
      'All good here.',
      'Crystal clear here.',
      'I fully get it, ready to move on.',
      'I understand the core idea.',
      'Je comprends bien, merci.',
      'Je comprends.',
      'Compris, merci.',
      'Alles klar.',
      'Entiendo bien.'
    ];

    if (scenarioId === 'scenario-1') {
      // Mixed: roughly balanced lost vs understand, multilingual
      for (let i = 0; i < 30; i++) {
        const phraseList = i % 2 === 0 ? lostPhrases : understandPhrases;
        const text = phraseList[i % phraseList.length];
        const sender = namesPool[i % namesPool.length];
        push(text, sender, delayed(i));
      }
    } else if (scenarioId === 'scenario-2') {
      // Mostly understand, few lost (about 80% understand)
      for (let i = 0; i < 30; i++) {
        const isLost = i % 5 === 0; // ~6 of 30
        const phraseList = isLost ? lostPhrases : understandPhrases;
        const text = phraseList[i % phraseList.length];
        const sender = namesPool[i % namesPool.length];
        push(text, sender, delayed(i));
      }
    } else if (scenarioId === 'scenario-3') {
      // Mixed 1–5 with overall average 4.5 across 30 students
      // Distribution: 19x "5", 8x "4", 2x "3", 1x "2" => (19*5 + 8*4 + 2*3 + 1*2) / 30 = 135/30 = 4.5
      const scores: string[] = [
        ...Array(19).fill('5'),
        ...Array(8).fill('4'),
        ...Array(2).fill('3'),
        ...Array(1).fill('2'),
      ];
      // Shuffle to interleave values for more realistic variety
      scores.sort(() => Math.random() - 0.5);
      for (let i = 0; i < 30; i++) {
        const score = scores[i];
        push(score, namesPool[i % namesPool.length], delayed(i));
      }
    } else if (scenarioId === 'scenario-4') {
      // Scale ~2.5 from a mix of highs and lows (mostly 2-3 with a few 5s) across 30 students
      for (let i = 0; i < 30; i++) {
        const isFive = i % 10 === 4; // ~3 of 30 are 5s
        const score = isFive ? '5' : (i % 2 === 0 ? '2' : '3');
        push(score, namesPool[i % namesPool.length], delayed(i));
      }
    }

    // Schedule timeouts
    messagesToSend.forEach(({ delay, msg }) => {
      const timer = window.setTimeout(async () => {
        setMessages(prev => [...prev, msg]);
        
        // Also publish to Ably for real-time distribution
        try {
          if (userType && ablyChannelRef.current) {
            const channelName = getChannelName();
            await publishMessage(channelName, {
              text: msg.text,
              sender: msg.sender,
              senderType: 'student', // Scenario messages are from students
            });
          }
        } catch (error) {
          console.error('Failed to publish scenario message to Ably:', error);
        }
      }, delay);
      scenarioTimersRef.current.push(timer);
    });
  };

  // Load messages and student name from local storage on mount
  useEffect(() => {
    if (!userType) return;

    // Load messages from local storage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMessages(parsed);
        // Set initial length to prevent scroll on load
        prevMessagesLengthRef.current = parsed.length;
        // Prime confidence logging set so we don't re-log historical messages
        const initialIds = new Set<string>();
        if (Array.isArray(parsed)) {
          for (const m of parsed) {
            if (m?.id) initialIds.add(String(m.id));
          }
        }
        setLoggedConfidenceIds(initialIds);
      } catch (error) {
        console.error('Error loading messages from local storage:', error);
      }
    }

    // Load student name if user is a student
    if (userType === 'student') {
      const storedName = localStorage.getItem(STUDENT_NAME_STORAGE_KEY);
      if (storedName) {
        setStudentName(storedName);
      } else {
        setShowNameInput(true);
      }
    }
  }, [userType]);

  // Update current sender ref when student name changes
  useEffect(() => {
    if (userType === 'student') {
      currentSenderRef.current = studentName;
    } else {
      currentSenderRef.current = 'Teacher';
    }
  }, [userType, studentName]);

  // Setup Ably connection (separate effect to avoid reconnection issues)
  useEffect(() => {
    if (!userType) return;

    // Setup Ably connection
    const channelName = getChannelName();
    console.log(`Setting up Ably connection for ${userType} on global channel: ${channelName}`);
    
    const channel = subscribeToMessages(channelName, (ablyMessage: AblyMessage) => {
      console.log('🔥 NEW CODE ACTIVE: Received Ably message:', ablyMessage);
      
      // Convert AblyMessage to ChatMessage format
      const chatMessage: ChatMessage = {
        id: ablyMessage.id,
        text: ablyMessage.text,
        timestamp: ablyMessage.timestamp,
        sender: ablyMessage.sender,
        detectedLanguage: ablyMessage.detectedLanguage,
        autoTranslation: ablyMessage.autoTranslation,
        translation: ablyMessage.translation,
      };
      
      // FORCE REFRESH: Add all messages - no duplicate prevention
      console.log(`🔥 NEW CODE: Adding message from ${ablyMessage.sender} (current sender: ${currentSenderRef.current})`);
      setMessages(prev => {
        console.log(`🔥 NEW CODE: Current messages count: ${prev.length}, adding new message`);
        return [...prev, chatMessage];
      });
    });

    ablyChannelRef.current = channel;

    // Cleanup function
    return () => {
      if (ablyChannelRef.current) {
        unsubscribeFromMessages(ablyChannelRef.current);
        ablyChannelRef.current = null;
      }
    };
  }, [userType]); // Remove studentName dependency to avoid reconnection

  // Save messages to local storage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Log confidence to backend for new messages (Chat + scenarios + generated tests)
  useEffect(() => {
    const toLog = messages.filter((m) => !loggedConfidenceIds.has(m.id));
    if (toLog.length === 0) return;

    (async () => {
      for (const msg of toLog) {
        try {
          await fetch('/api/log-confidence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: msg.text,
              sender: msg.sender,
              timestamp: msg.timestamp,
            }),
          });
        } catch (e) {
          console.error('Failed to log confidence for message', msg.id, e);
        } finally {
          setLoggedConfidenceIds((prev) => {
            const next = new Set(prev);
            next.add(msg.id);
            return next;
          });
        }
        // Small delay to avoid burst calls
        if (toLog.indexOf(msg) < toLog.length - 1) {
          await new Promise((r) => setTimeout(r, 150));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Only scroll if messages were actually added (not on load or other state changes)
    if (messages.length > 0 && messages.length > prevMessagesLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Auto-detect language and translate incoming messages using DeepL
  useEffect(() => {
    const processIncomingMessages = async () => {
      // Find messages that need language detection and haven't been processed yet
      const messagesToProcess = messages.filter(msg => 
        msg.sender !== 'You' && 
        !msg.detectedLanguage && 
        !autoTranslatingIds.has(msg.id) &&
        !processedMessageIds.has(msg.id) // Don't reprocess
      );

      if (messagesToProcess.length === 0) return;

      console.log(`Processing ${messagesToProcess.length} new messages with DeepL`);

      // Process each message
      for (const msg of messagesToProcess) {
        // Mark as being processed and as processed
        setAutoTranslatingIds(prev => new Set(prev).add(msg.id));
        setProcessedMessageIds(prev => new Set(prev).add(msg.id));

        try {
          // Use DeepL for both language detection AND translation in one call
          console.log('Sending message to DeepL:', msg.id);
          const translateResponse = await fetch('/api/translate-deepl', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: msg.text,
              targetLanguage: userLanguage,
            }),
          });

          if (!translateResponse.ok) {
            let errorBody: any = null;
            let errorText = '';
            try {
              errorBody = await translateResponse.clone().json();
            } catch {}
            if (!errorBody) {
              try {
                errorText = await translateResponse.text();
              } catch {}
            }
            console.error('DeepL error:', {
              status: translateResponse.status,
              statusText: translateResponse.statusText,
              body: errorBody || errorText || null,
            });
            const message =
              (errorBody && (errorBody.details || errorBody.error)) ||
              errorText ||
              `Translation failed (HTTP ${translateResponse.status})`;
            throw new Error(message);
          }

          const data = await translateResponse.json();
          console.log('DeepL response:', {
            detected: data.detectedLanguageName,
            needsTranslation: data.needsTranslation
          });
          
          // Update message with detected language and translation (if needed)
          setMessages(prev => prev.map(m => 
            m.id === msg.id
              ? {
                  ...m,
                  detectedLanguage: {
                    code: data.detectedSourceLanguage,
                    name: data.detectedLanguageName,
                  },
                  autoTranslation: data.needsTranslation && data.translatedText ? {
                    text: data.translatedText,
                  } : undefined
                }
              : m
          ));

        } catch (error) {
          console.error('Auto-translation error for message', msg.id, ':', error);
          
          // Check if it's a rate limit error
          if (error instanceof Error && error.message.includes('Rate limit')) {
            console.warn('Rate limit hit - will retry later');
            // Remove from processed set so it can be retried
            setProcessedMessageIds(prev => {
              const next = new Set(prev);
              next.delete(msg.id);
              return next;
            });
            // Wait a bit before allowing retry
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } finally {
          // Remove from processing set
          setAutoTranslatingIds(prev => {
            const next = new Set(prev);
            next.delete(msg.id);
            return next;
          });
        }
        
        // Add a small delay between messages to avoid hitting rate limits
        if (messagesToProcess.indexOf(msg) < messagesToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    };

    processIncomingMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, userLanguage]); // Only trigger when message count changes, not content

  // Re-translate all existing non-user messages when the target language changes
  useEffect(() => {
    const retranslateAll = async () => {
      if (!userLanguage || messages.length === 0) return;

      const targets = messages.filter((m) => m.sender !== 'You');
      if (targets.length === 0) return;

      // Mark as processing to disable controls while re-translating
      setAutoTranslatingIds((prev) => {
        const next = new Set(prev);
        targets.forEach((m) => next.add(m.id));
        return next;
      });

      try {
        const results = await Promise.all(
          targets.map(async (msg) => {
            try {
              const response = await fetch('/api/translate-deepl', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  text: msg.text,
                  targetLanguage: userLanguage,
                  sourceLanguage: msg.detectedLanguage?.code,
                }),
              });

              if (!response.ok) {
                return { id: msg.id, error: true } as const;
              }

              const data = await response.json();
              return {
                id: msg.id,
                detectedLanguage: {
                  code: data.detectedSourceLanguage,
                  name: data.detectedLanguageName,
                },
                translation: data.needsTranslation ? data.translatedText : undefined,
                error: false,
              } as const;
            } catch {
              return { id: msg.id, error: true } as const;
            }
          })
        );

        // Apply results in one pass
        setMessages((prev) =>
          prev.map((m) => {
            const r = results.find((x) => x.id === m.id);
            if (!r) return m;
            if (r.error) return m;
            return {
              ...m,
              detectedLanguage: r.detectedLanguage || m.detectedLanguage,
              autoTranslation: r.translation ? { text: r.translation } : undefined,
            };
          })
        );
      } finally {
        // Clear processing marks
        setAutoTranslatingIds((prev) => {
          const next = new Set(prev);
          targets.forEach((m) => next.delete(m.id));
          return next;
        });
      }
    };

    retranslateAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLanguage]);

  const handleStudentNameSubmit = () => {
    if (!studentName.trim()) return;
    
    localStorage.setItem(STUDENT_NAME_STORAGE_KEY, studentName.trim());
    setShowNameInput(false);
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;

    // For students, check if they have entered their name
    if (userType === 'student' && !studentName.trim()) {
      setShowNameInput(true);
      return;
    }

    const messageText = message.trim();
    const sender = userType === 'student' ? studentName.trim() : 'Teacher';
    
    // Create message for local state
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: messageText,
      timestamp: Date.now(),
      sender: sender,
    };

    // Add to local state immediately for better UX
    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // Publish to Ably for real-time distribution
    try {
      if (userType && ablyChannelRef.current) {
        const channelName = getChannelName();
        console.log(`Publishing message to Ably on global channel: ${channelName}`, {
          text: messageText,
          sender: sender,
          senderType: userType,
        });
        await publishMessage(channelName, {
          text: messageText,
          sender: sender,
          senderType: userType,
        });
        console.log('Message published successfully to Ably');
      }
    } catch (error) {
      console.error('Failed to publish message to Ably:', error);
      // Message is already in local state, so user experience isn't affected
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
  };

  const clearChat = () => {
    if (!confirm('Are you sure you want to clear all messages? This will also clear analytics.')) return;

    (async () => {
      try {
        await fetch('/api/log-confidence', { method: 'DELETE' });
      } catch (e) {
        console.error('Failed to clear ClickHouse table:', e);
      } finally {
        // Stop any scheduled scenario message timers
        clearScenarioTimers();
        // Reset local UI state and storage
        setMessages([]);
        setAutoTranslatingIds(new Set());
        setProcessedMessageIds(new Set());
        setLoggedConfidenceIds(new Set());
        localStorage.removeItem(STORAGE_KEY);
      }
    })();
  };

  // Generate and simulate incoming message in different language
  const generateTestMessage = async (language: string, languageCode: string, sender: string) => {
    try {
      const response = await fetch('/api/generate-student-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: language,
          languageCode: languageCode,
        }),
      });

      if (!response.ok) {
        console.error('Failed to generate message');
        return;
      }

      const data = await response.json();
      
      const testMessage: ChatMessage = {
        id: Date.now().toString(),
        text: data.message,
        timestamp: Date.now(),
        sender: sender,
      };
      
      setMessages(prev => [...prev, testMessage]);
      
      // Also publish to Ably for real-time distribution
      try {
        if (userType && ablyChannelRef.current) {
          const channelName = getChannelName();
          await publishMessage(channelName, {
            text: data.message,
            sender: sender,
            senderType: 'student', // Test messages are from students
          });
        }
      } catch (error) {
        console.error('Failed to publish test message to Ably:', error);
      }
    } catch (error) {
      console.error('Error generating test message:', error);
    }
  };

  const initiateTranslation = (messageId: string) => {
    setSelectedMessageId(messageId);
    setShowLanguageInput(true);
    setTargetLanguage('');
  };

  const handleTranslate = async () => {
    if (!selectedMessageId || !targetLanguage.trim()) return;

    const messageToTranslate = messages.find(m => m.id === selectedMessageId);
    if (!messageToTranslate) return;

    setTranslatingId(selectedMessageId);
    setShowLanguageInput(false);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: messageToTranslate.text,
          targetLang: targetLanguage.trim(),
        }),
      });

      if (!response.ok) {
        let errorBody: any = null;
        let errorText = '';
        try {
          errorBody = await response.clone().json();
        } catch {}
        if (!errorBody) {
          try {
            errorText = await response.text();
          } catch {}
        }
        const msg = (errorBody && (errorBody.details || errorBody.error)) || errorText || `HTTP ${response.status}`;
        alert(`Translation failed: ${msg}`);
        return;
      }

      const data = await response.json();

      // Update the message with the translation
      setMessages(prev => prev.map(msg => 
        msg.id === selectedMessageId 
          ? { 
              ...msg, 
              translation: { 
                text: data.translatedText, 
                targetLang: targetLanguage.toUpperCase() 
              } 
            }
          : msg
      ));

    } catch (error) {
      console.error('Translation error:', error);
      alert('Failed to translate message. Please try again.');
    } finally {
      setTranslatingId(null);
      setSelectedMessageId(null);
      setTargetLanguage('');
    }
  };

  const cancelTranslation = () => {
    setShowLanguageInput(false);
    setSelectedMessageId(null);
    setTargetLanguage('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Student Name Input Modal */}
      {showNameInput && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-[15px] font-semibold mb-2 text-[#0D0D0D]">Enter Your Name</h3>
            <p className="text-[13px] text-[#8B8D98] mb-4">
              Please enter your name to start chatting in the class.
            </p>
            <input
              type="text"
              placeholder="Your name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStudentNameSubmit()}
              className="w-full px-3 py-2 text-[13px] bg-[#FAFAFA] border border-[#E5E5E5] rounded-md focus:outline-none focus:bg-white focus:border-[#D4D4D4] mb-4 placeholder:text-[#B4B8BF] transition-colors"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleStudentNameSubmit}
                disabled={!studentName.trim()}
                className="px-4 py-2 text-[13px] font-medium bg-[#5E6AD2] text-white hover:bg-[#4A5BC4] rounded-md transition-all disabled:bg-[#F5F5F5] disabled:text-[#D4D4D4] disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Language Input Modal */}
      {showLanguageInput && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-[15px] font-semibold mb-2 text-[#0D0D0D]">Enter Target Language</h3>
            <p className="text-[13px] text-[#8B8D98] mb-4">
              Enter the language code (e.g., ES for Spanish, FR for French, DE for German, JA for Japanese)
            </p>
            <input
              type="text"
              placeholder="e.g., ES, FR, DE, JA"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTranslate()}
              className="w-full px-3 py-2 text-[13px] bg-[#FAFAFA] border border-[#E5E5E5] rounded-md focus:outline-none focus:bg-white focus:border-[#D4D4D4] mb-4 placeholder:text-[#B4B8BF] transition-colors"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelTranslation}
                className="px-4 py-2 text-[13px] font-medium text-[#6B6F76] hover:bg-[#F5F5F5] rounded-md transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleTranslate}
                disabled={!targetLanguage.trim()}
                className="px-4 py-2 text-[13px] font-medium bg-[#0D0D0D] text-white hover:bg-[#3D3D3D] rounded-md transition-all disabled:bg-[#F5F5F5] disabled:text-[#D4D4D4] disabled:cursor-not-allowed"
              >
                Translate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center text-[#B4B8BF] mt-8">
              <p className="text-[13px]">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                className="bg-[#FAFAFA] rounded-lg border border-[#E5E5E5] p-3.5 hover:bg-white hover:border-[#D4D4D4] transition-all"
              >
                <div className="flex justify-between items-baseline mb-2">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium text-[#0D0D0D]">{msg.sender}</p>
                    {/* Language Detection Label */}
                    {msg.detectedLanguage && (
                      <span className="px-1.5 py-0.5 bg-[#F5F5F5] text-[#6B6F76] text-[10px] font-medium rounded border border-[#E5E5E5]">
                        {msg.detectedLanguage.name}
                      </span>
                    )}
                    {autoTranslatingIds.has(msg.id) && !msg.detectedLanguage && (
                      <span className="px-1.5 py-0.5 bg-[#F5F5F5] text-[#8B8D98] text-[10px] rounded animate-pulse">
                        Detecting...
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#B4B8BF]">{formatTimestamp(msg.timestamp)}</p>
                </div>
                
                {/* Auto-translation Section (shown first if available) */}
                {msg.autoTranslation && (
                  <>
                    <div className="mb-2 p-2.5 bg-white rounded border border-[#E5E5E5]">
                      <p className="text-[10px] font-medium text-[#8B8D98] mb-1.5 uppercase tracking-wide">
                        Translated
                      </p>
                      <p className="text-[13px] text-[#0D0D0D] whitespace-pre-wrap break-words leading-relaxed">
                        {msg.autoTranslation.text}
                      </p>
                    </div>
                    <details className="mt-2">
                      <summary className="text-[11px] text-[#8B8D98] cursor-pointer hover:text-[#6B6F76] transition-colors">
                        Show original
                      </summary>
                      <p className="text-[13px] text-[#8B8D98] whitespace-pre-wrap break-words mt-2 pl-3 border-l border-[#E5E5E5]">
                        {msg.text}
                      </p>
                    </details>
                  </>
                )}
                
                {/* Original message (shown normally if no auto-translation) */}
                {!msg.autoTranslation && (
                  <p className="text-[13px] text-[#0D0D0D] whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                )}
                
                {/* Manual Translation Section */}
                {msg.translation && (
                  <div className="mt-2 pt-2 border-t border-[#E5E5E5]">
                    <p className="text-[10px] font-medium text-[#8B8D98] mb-1 uppercase tracking-wide">
                      Translation ({msg.translation.targetLang})
                    </p>
                    <p className="text-[13px] text-[#0D0D0D] whitespace-pre-wrap break-words leading-relaxed">
                      {msg.translation.text}
                    </p>
                  </div>
                )}

                {/* Translate Button */}
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => initiateTranslation(msg.id)}
                    disabled={translatingId === msg.id || autoTranslatingIds.has(msg.id)}
                    className="text-[11px] text-[#6B6F76] hover:text-[#0D0D0D] font-medium disabled:text-[#D4D4D4] disabled:cursor-not-allowed transition-colors"
                  >
                    {autoTranslatingIds.has(msg.id) 
                      ? 'Processing...' 
                      : translatingId === msg.id 
                        ? 'Translating...' 
                        : msg.translation 
                          ? 'Re-translate' 
                          : 'Translate'}
                  </button>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-[#E5E5E5] flex-shrink-0 bg-white">
        <div className="px-4 py-2 flex justify-between items-center">
          <div className="flex gap-3">
            <button
              onClick={clearChat}
              className="text-[11px] text-[#8B8D98] hover:text-[#6B6F76] font-medium"
              title="Clear chat and analytics"
            >
              Clear
            </button>
            {/* Test buttons for different languages */}
            <button
              onClick={() => generateTestMessage('Spanish', 'es', 'Maria')}
              className="text-[11px] text-[#8B8D98] hover:text-[#6B6F76] font-medium"
              title="Generate Spanish student message"
            >
              Test ES
            </button>
            <button
              onClick={() => generateTestMessage('French', 'fr', 'Pierre')}
              className="text-[11px] text-[#8B8D98] hover:text-[#6B6F76] font-medium"
              title="Generate French student message"
            >
              Test FR
            </button>
            <button
              onClick={() => generateTestMessage('Japanese', 'ja', 'Yuki')}
              className="text-[11px] text-[#8B8D98] hover:text-[#6B6F76] font-medium"
              title="Generate Japanese student message"
            >
              Test JA
            </button>
            <button
              onClick={() => generateTestMessage('Arabic', 'ar', 'Ahmed')}
              className="text-[11px] text-[#8B8D98] hover:text-[#6B6F76] font-medium"
              title="Generate Arabic student message"
            >
              Test AR
            </button>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 px-4 py-3 border-t border-[#E5E5E5]">
          <input
            type="text"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            className="px-3 py-2 text-[13px] bg-[#FAFAFA] border border-[#E5E5E5] rounded-md focus:outline-none focus:bg-white focus:border-[#D4D4D4] transition-colors placeholder:text-[#B4B8BF]"
          />
          <button 
            onClick={handleSubmit}
            disabled={!message.trim()}
            className="px-4 py-2 text-[13px] font-medium bg-[#0D0D0D] text-white hover:bg-[#3D3D3D] rounded-md transition-all disabled:bg-[#F5F5F5] disabled:text-[#D4D4D4] disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

