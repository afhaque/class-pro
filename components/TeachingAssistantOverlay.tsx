'use client';

import { useEffect, useRef, useState } from 'react';

interface TeachingAssistantOverlayProps {
  userType: 'teacher' | 'student';
}

export default function TeachingAssistantOverlay({ userType }: TeachingAssistantOverlayProps) {
  const [message, setMessage] = useState<string>('');
  const [visible, setVisible] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  async function fetchSuggestion() {
    try {
      // First call detector to decide if we should show a modal
      const det = await fetch('/api/ta-detector?minutes=5', { cache: 'no-store' });
      if (!det.ok) return;
      const detJson = await det.json();
      const shouldShow = Boolean(detJson?.data?.notable_event);
      if (!shouldShow) {
        setVisible(false);
        return;
      }

      const resp = await fetch('/api/ta-agent?minutes=5', { cache: 'no-store' });
      if (!resp.ok) return;
      const data = await resp.json();
      const suggestion: string | undefined = data?.data?.suggestion;
      if (suggestion && typeof suggestion === 'string') {
        setMessage(suggestion);
        setVisible(true);
        // Auto-hide after 8s to prevent clutter
        setTimeout(() => setVisible(false), 8000);
      }
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    if (userType !== 'teacher') return;

    // Fetch immediately, then every 15s
    fetchSuggestion();
    timerRef.current = setInterval(fetchSuggestion, 15000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [userType]);

  if (userType !== 'teacher' || !visible || !message) return null;

  return (
    <div className="absolute top-4 left-4 z-40">
      <div className="max-w-[320px] bg-white/95 backdrop-blur border border-[#E5E5E5] shadow-[0_6px_20px_rgba(0,0,0,0.12)] rounded-lg p-3">
        <div className="text-[11px] uppercase tracking-wide text-[#6B6F76] mb-1 font-semibold">Teaching Assistant</div>
        <div className="text-[13px] text-[#0D0D0D] leading-snug">{message}</div>
      </div>
    </div>
  );
}


