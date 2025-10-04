import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_HACKATHON_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { status: 'error', message: 'OPENAI_HACKATHON_KEY is not set' },
        { status: 500 }
      );
    }

    // Optional topic override
    const { topic = 'Introduction to Machine Learning', minutesElapsed = 15 } = await request.json().catch(() => ({}));

    const prompt = `You are generating a realistic classroom transcript for a college lecture.
Lecture topic: ${topic}.
The lecture has been running for ${minutesElapsed} minutes. Create a believable sequence of short utterances (natural speech) representing an ongoing class: mostly the Instructor speaking, with 2-4 brief Student questions sprinkled in.

Rules:
- Output strictly as JSON matching this TypeScript type: { messages: { speaker: 'Instructor' | 'Student', text: string, secondsAgo: number }[] }
- Include 18-32 utterances.
- Make text concise and spoken-like (5-25 words each). Avoid labels like "Instructor:" inside text.
- Use secondsAgo to indicate when the utterance happened relative to now (0 = most recent). Range 900..0 (15 minutes to now). Ensure strictly decreasing secondsAgo values from earlier to later utterances.
- Keep content coherent: the Instructor explains concepts, gives examples, and segues; Students ask clarifying questions.
- Do not include any keys other than { messages }.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You only output valid JSON. No commentary.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        { status: 'error', message: 'OpenAI error', details: err },
        { status: 500 }
      );
    }

    const data = await response.json();
    let parsed: any;
    try {
      const content = data.choices?.[0]?.message?.content ?? '{}';
      parsed = JSON.parse(content);
    } catch (e) {
      return NextResponse.json(
        { status: 'error', message: 'Failed to parse JSON output from OpenAI' },
        { status: 500 }
      );
    }

    const messages = Array.isArray(parsed?.messages) ? parsed.messages : [];

    // Normalize and clamp values, compute timestamps
    const now = Date.now();
    const normalized = messages.map((m: any, idx: number) => {
      const secondsAgo = Math.max(0, Math.min(900, Number(m.secondsAgo) || 0));
      return {
        speaker: m.speaker === 'Student' ? 'Student' : 'Instructor',
        text: String(m.text || '').trim(),
        timestamp: new Date(now - secondsAgo * 1000).toISOString(),
      };
    });

    return NextResponse.json({ status: 'success', messages: normalized });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to generate test transcript',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


