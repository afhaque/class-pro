import { NextRequest, NextResponse } from 'next/server';

const MESSAGE_TYPES = [
  "Ask a specific question about the topic",
  "Express confusion about something",
  "Show understanding and enthusiasm",
  "Request clarification on a detail",
  "Share an insight or connection",
  "Ask for an example",
  "Express being overwhelmed",
  "Show excitement about learning",
  "Ask a follow-up question",
  "Request the professor to slow down or repeat",
];

export async function POST(request: NextRequest) {
  try {
    const { language, languageCode } = await request.json();

    if (!language || !languageCode) {
      return NextResponse.json(
        { error: 'Missing language or language code' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_HACKATHON_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Pick a random message type
    const messageType = MESSAGE_TYPES[Math.floor(Math.random() * MESSAGE_TYPES.length)];

    console.log(`Generating ${language} student message: ${messageType}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a student in a classroom sending a quick message to the professor during a lecture. Generate a realistic, casual student message in ${language}. The message should be:
- Short and conversational (1-2 sentences max)
- Natural for a student to say during class
- In ${language} only
- Appropriate for the context: ${messageType}

Return ONLY the message text, nothing else.`
          },
          {
            role: 'user',
            content: `Generate a student message in ${language}`
          }
        ],
        temperature: 0.9,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate message', details: error.error?.message },
        { status: 500 }
      );
    }

    const data = await response.json();
    const message = data.choices[0]?.message?.content?.trim();

    if (!message) {
      return NextResponse.json(
        { error: 'No message generated' },
        { status: 500 }
      );
    }

    console.log(`Generated message: ${message}`);

    return NextResponse.json({
      message: message,
      messageType: messageType,
    });

  } catch (error) {
    console.error('Message generation error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

