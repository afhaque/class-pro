'use client';

import { useDaily, useTranscription } from '@daily-co/daily-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface TranscriptMessage {
  id: string;
  text: string;
  participantName: string;
  participantId: string;
  timestamp: Date;
  isFinal: boolean;
  detectedLanguage?: {
    code: string;
    name: string;
  };
  autoTranslation?: {
    text: string;
  };
  isTranslating?: boolean;
}

interface TranscriptProps {
  userLanguage: string;
}

export default function Transcript({ userLanguage }: TranscriptProps) {
  const callObject = useDaily();
  const transcription = useTranscription();
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const prevMessagesLengthRef = useRef(0);
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [autoTranslatingIds, setAutoTranslatingIds] = useState<Set<string>>(new Set());
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Only scroll if messages were actually added (not on other state changes)
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
        msg.isFinal && 
        !msg.detectedLanguage && 
        !autoTranslatingIds.has(msg.id) &&
        !processedMessageIds.has(msg.id) // Don't reprocess
      );

      if (messagesToProcess.length === 0) return;

      console.log(`Processing ${messagesToProcess.length} new transcript messages with DeepL`);

      // Process each message
      for (const msg of messagesToProcess) {
        // Mark as being processed and as processed
        setAutoTranslatingIds(prev => new Set(prev).add(msg.id));
        setProcessedMessageIds(prev => new Set(prev).add(msg.id));

        try {
          // Use DeepL for both language detection AND translation in one call
          console.log('Sending transcript message to DeepL:', msg.id);
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
            console.error('DeepL error for transcript:', {
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
          console.log('DeepL response for transcript:', {
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
          console.error('Auto-translation error for transcript message', msg.id, ':', error);
          
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

  // Re-translate all existing final transcript segments when language changes
  useEffect(() => {
    const retranslateExisting = async () => {
      if (!userLanguage || messages.length === 0) return;

      const finals = messages.filter((m) => m.isFinal);
      if (finals.length === 0) return;

      // Mark as processing to disable controls while re-translating
      setAutoTranslatingIds((prev) => {
        const next = new Set(prev);
        finals.forEach((m) => next.add(m.id));
        return next;
      });

      try {
        const results = await Promise.all(
          finals.map(async (msg) => {
            try {
              const response = await fetch('/api/translate-deepl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                autoTranslation: data.needsTranslation && data.translatedText ? {
                  text: data.translatedText,
                } : undefined,
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
            if (!m.isFinal) return m;
            const r = results.find((x) => x.id === m.id);
            if (!r) return m;
            if (r.error) return m;
            return {
              ...m,
              detectedLanguage: r.detectedLanguage || m.detectedLanguage,
              autoTranslation: r.autoTranslation,
            };
          })
        );
      } finally {
        // Clear processing marks
        setAutoTranslatingIds((prev) => {
          const next = new Set(prev);
          finals.forEach((m) => next.delete(m.id));
          return next;
        });
      }
    };

    retranslateExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLanguage]);

  // Listen for injected test transcript events from the UI
  useEffect(() => {
    const handleTestTranscript = (e: any) => {
      try {
        const incoming = Array.isArray(e?.detail?.messages) ? e.detail.messages : [];
        if (incoming.length === 0) return;

        // Normalize, sort by timestamp ascending, and map to TranscriptMessage
        const mapped: TranscriptMessage[] = incoming
          .map((m: any, idx: number) => {
            const speaker: string = m.speaker === 'Student' ? 'Student' : 'Instructor';
            const participantId = speaker === 'Student' ? 'student-1' : 'instructor';
            const ts = new Date(m.timestamp || Date.now());
            return {
              id: `test-${participantId}-${ts.getTime()}-${idx}`,
              text: String(m.text || '').trim(),
              participantName: speaker,
              participantId,
              timestamp: ts,
              isFinal: true,
            } as TranscriptMessage;
          })
          .filter((m: TranscriptMessage) => m.text.length > 0)
          .sort((a: TranscriptMessage, b: TranscriptMessage) => a.timestamp.getTime() - b.timestamp.getTime());

        setMessages(prev => {
          const combined = [...prev, ...mapped];
          combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          return combined;
        });
      } catch (err) {
        console.error('Failed to handle test transcript event', err);
      }
    };

    const handleTranscriptLoading = (e: any) => {
      try {
        const isLoading = e?.detail?.isLoading === true;
        setIsGeneratingTranscript(isLoading);
      } catch (err) {
        console.error('Failed to handle transcript loading event', err);
      }
    };

    window.addEventListener('classpro-test-transcript', handleTestTranscript as EventListener);
    window.addEventListener('classpro-transcript-loading', handleTranscriptLoading as EventListener);
    return () => {
      window.removeEventListener('classpro-test-transcript', handleTestTranscript as EventListener);
      window.removeEventListener('classpro-transcript-loading', handleTranscriptLoading as EventListener);
    };
  }, []);

  // Listen for transcription messages
  useEffect(() => {
    if (!callObject) return;

    const handleTranscriptionMessage = (event: any) => {
      console.log('Transcription message received:', event);
      
      // According to Daily docs, the event object directly contains the fields
      const { text, participantId, timestamp, is_final, session_id } = event;
      
      if (!text || !participantId) {
        console.warn('Invalid transcription message:', event);
        return;
      }
      
      // Get participant info
      const participants = callObject.participants();
      const participant = participants[participantId];
      const participantName = participant?.user_name || participant?.user_id || 'Instructor';

      const newMessage: TranscriptMessage = {
        id: `${session_id || participantId}-${timestamp}-${Date.now()}`,
        text,
        participantName,
        participantId,
        timestamp: new Date(timestamp),
        isFinal: is_final || false,
      };

      setMessages((prev) => {
        console.log('Adding message:', { 
          isFinal: is_final, 
          participantName, 
          text: text.substring(0, 50),
          currentMessageCount: prev.length 
        });
        
        // If it's a final transcript, add it and remove any interim messages from same participant
        if (is_final) {
          // Keep all final messages and remove only interim messages from the same participant
          const filtered = prev.filter((m) => m.isFinal || m.participantId !== participantId);
          console.log('Final message - filtered from', prev.length, 'to', filtered.length);
          return [...filtered, newMessage];
        }
        
        // For interim messages, append as new to show continuous streaming
        // They will be cleaned up when a final message arrives for this participant
        console.log('Interim message - appended');
        return [...prev, newMessage];
      });
    };

    const handleTranscriptionError = (event: any) => {
      console.error('Transcription error:', event);
      
      let errorMsg = 'Transcription error occurred';
      
      if (event.errorMsg) {
        errorMsg = event.errorMsg;
      } else if (event.error) {
        errorMsg = event.error;
      } else if (event.message) {
        errorMsg = event.message;
      }
      
      // Check for common error types
      if (JSON.stringify(event).includes('not enabled') || JSON.stringify(event).includes('subscription')) {
        errorMsg = 'Transcription is not enabled for your Daily account. Please enable it in the Daily dashboard.';
      }
      
      setError(errorMsg);
    };

    const handleTranscriptionStarted = (event: any) => {
      console.log('Transcription started:', event);
      // Capture transcriptId from event (can be used with REST APIs)
      if (event?.transcriptId) {
        setTranscriptId(event.transcriptId);
        console.log('Transcript ID:', event.transcriptId);
      }
      setIsTranscribing(true);
      setError(null);
    };

    const handleTranscriptionStopped = () => {
      console.log('Transcription stopped');
      setIsTranscribing(false);
      setTranscriptId(null);
    };

    // Add event listeners
    callObject.on('transcription-message', handleTranscriptionMessage);
    callObject.on('transcription-error', handleTranscriptionError);
    callObject.on('transcription-started', handleTranscriptionStarted);
    callObject.on('transcription-stopped', handleTranscriptionStopped);

    return () => {
      callObject.off('transcription-message', handleTranscriptionMessage);
      callObject.off('transcription-error', handleTranscriptionError);
      callObject.off('transcription-started', handleTranscriptionStarted);
      callObject.off('transcription-stopped', handleTranscriptionStopped);
    };
  }, [callObject]);

  const startTranscription = async () => {
    if (!callObject) return;
    
    try {
      setError(null);
      
      // Check if we're in a call first
      const meetingState = callObject.meetingState();
      if (meetingState !== 'joined-meeting') {
        setError('Please join the call before starting transcription');
        return;
      }
      
      // Start transcription with settings
      // See https://docs.daily.co/guides/products/transcription for full parameter list
      await callObject.startTranscription();
      console.log('Transcription start requested');
    } catch (err: any) {
      console.error('Error starting transcription:', err);
      const errorMessage = err.message || err.error || JSON.stringify(err);
      
      // Provide more helpful error messages
      if (errorMessage.includes('not enabled') || errorMessage.includes('subscription')) {
        setError('Transcription not enabled. Please enable it in your Daily dashboard or upgrade your plan.');
      } else if (errorMessage.includes('permission')) {
        setError('Permission denied. Check your Daily API key and room settings.');
      } else {
        setError(`Failed to start transcription: ${errorMessage}`);
      }
    }
  };

  const stopTranscription = async () => {
    if (!callObject) return;
    
    try {
      await callObject.stopTranscription();
      console.log('Transcription stop requested');
    } catch (err: any) {
      console.error('Error stopping transcription:', err);
      setError(err.message || 'Failed to stop transcription');
    }
  };

  const clearTranscript = () => {
    setMessages([]);
  };

  // Group consecutive messages by the same speaker so the UI shows a single box
  const groupedMessages = useMemo(() => {
    const groups: Array<{
      id: string;
      participantId: string;
      participantName: string;
      messages: TranscriptMessage[];
      isFinal: boolean;
      timestamp: Date;
    }> = [];

    for (const msg of messages) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.participantId === msg.participantId) {
        lastGroup.messages.push(msg);
        lastGroup.isFinal = msg.isFinal; // reflect latest status
        lastGroup.timestamp = msg.timestamp;
      } else {
        groups.push({
          id: `group-${msg.id}`,
          participantId: msg.participantId,
          participantName: msg.participantName,
          messages: [msg],
          isFinal: msg.isFinal,
          timestamp: msg.timestamp,
        });
      }
    }
    return groups;
  }, [messages]);

  if (!callObject) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-[#8B8D98]">
        <p className="text-[13px]">Connecting to call...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Error Display (if any) */}
      {error && (
        <div className="m-3 p-3 bg-[#DF2D36] bg-opacity-10 border-l-2 border-[#DF2D36] rounded-md text-[#DF2D36] text-[13px] font-medium">
          {error}
        </div>
      )}

      {/* Transcript Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isGeneratingTranscript ? (
          <div className="flex flex-col items-center justify-center h-full text-[#8B8D98]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5E6AD2] mb-3"></div>
            <p className="text-[15px] font-medium">Generating transcript...</p>
            <p className="text-[13px] mt-1">Please wait while we create your test transcript</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#8B8D98]">
            <p className="text-[15px] font-medium">No transcripts yet</p>
            <p className="text-[13px] mt-1">
              {isTranscribing ? 'Waiting for audio...' : 'Click the record button to start transcription'}
            </p>
          </div>
        ) : (
          groupedMessages.map((group) => {
            const lastMsg = group.messages[group.messages.length - 1];
            const anyTranslating = group.messages.some((m) => autoTranslatingIds.has(m.id));
            const lastDetectedLanguage = [...group.messages]
              .reverse()
              .find((m) => m.detectedLanguage)?.detectedLanguage;
            const hasAnyTranslation = group.messages.some((m) => !!m.autoTranslation);
            const translatedJoined = group.messages
              .map((m) => m.autoTranslation?.text ?? m.text)
              .join(' ');
            const originalJoined = group.messages.map((m) => m.text).join(' ');

            return (
              <div
                key={group.id}
                className={`p-3 rounded-lg border border-[#E5E5E5] ${
                  group.isFinal ? 'bg-white' : 'bg-[#FAFAFA]'
                }`}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#0D0D0D] text-[13px]">
                      {group.participantName}
                    </span>
                    {lastDetectedLanguage && (
                      <span className="px-1.5 py-0.5 bg-[#F5F5F5] text-[#6B6F76] text-[10px] font-medium rounded border border-[#E5E5E5]">
                        {lastDetectedLanguage.name}
                      </span>
                    )}
                    {anyTranslating && (
                      <span className="px-2 py-0.5 bg-[#F5F5F5] text-[#8B8D98] text-[11px] rounded animate-pulse">
                        Detecting...
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#8B8D98]">
                    {group.timestamp.toLocaleTimeString()}
                  </span>
                </div>

                {hasAnyTranslation ? (
                  <>
                    <div className="mb-2 p-2.5 bg-white rounded border border-[#E5E5E5]">
                      <p className="text-[10px] font-medium text-[#8B8D98] mb-1.5 uppercase tracking-wide">
                        Translated
                      </p>
                      <p className="text-[13px] text-[#0D0D0D]">{translatedJoined}</p>
                    </div>
                    <details className="mt-2">
                      <summary className="text-[11px] text-[#8B8D98] cursor-pointer hover:text-[#6B6F76] transition-colors">
                        Show original
                      </summary>
                      <p className="text-[13px] text-[#8B8D98] mt-2 pl-3 border-l border-[#E5E5E5]">
                        {originalJoined}
                      </p>
                    </details>
                  </>
                ) : (
                  <p className={`text-[13px] text-[#0D0D0D] ${!group.isFinal && 'italic opacity-60'}`}>
                    {originalJoined}
                  </p>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Control Bar at Bottom */}
      <div className="p-3 border-t border-[#E5E5E5] bg-[#FAFAFA] flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          {isTranscribing && (
            <div className="flex items-center gap-2 text-[#00B386]">
              <span className="inline-block w-2 h-2 bg-[#00B386] rounded-full animate-pulse"></span>
              <span className="font-medium text-[12px]">Recording</span>
            </div>
          )}
          {transcriptId && (
            <span className="text-[#8B8D98] text-[11px]" title={`Transcript ID: ${transcriptId}`}>
              ID: {transcriptId.substring(0, 8)}...
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearTranscript}
              className="px-3 py-1 text-[12px] text-[#DF2D36] hover:text-[#C52830] transition-colors font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

