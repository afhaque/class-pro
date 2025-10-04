'use client';

import Transcript from './Transcript';

interface TranscriptTabProps {
  userLanguage: string;
}

export default function TranscriptTab({ userLanguage }: TranscriptTabProps) {
  return <Transcript userLanguage={userLanguage} />;
}

