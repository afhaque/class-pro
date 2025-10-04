import { NextRequest, NextResponse } from 'next/server';
import { createClient, ClickHouseClient } from '@clickhouse/client';

type LogConfidenceBody = {
  text: string;
  sender: string; // student name
  timestamp?: number; // ms epoch from client
};

async function classifyQuestionWithOpenAI(text: string): Promise<{ isQuestion: boolean; confidence: number }> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_HACKATHON_KEY;
  if (!apiKey) {
    // Fallback: simple heuristic if no key configured
    const hasQuestionMark = text.includes('?');
    const hasQuestionWords = /\b(what|how|why|when|where|who|can|could|would|should|is|are|do|does|did)\b/i.test(text);
    return { 
      isQuestion: hasQuestionMark || hasQuestionWords, 
      confidence: hasQuestionMark ? 0.9 : hasQuestionWords ? 0.6 : 0.1 
    };
  }

  const system = `You analyze whether a student message is asking a question or seeking clarification. 
Return ONLY valid JSON: {"isQuestion": <boolean>, "confidence": <number 0-1>}.
Guidelines:
- Questions include: direct questions, requests for clarification, asking for examples, expressing confusion that needs an answer
- NOT questions: statements, observations, expressions of understanding, simple acknowledgments
- Confidence: 0.9+ for clear questions, 0.7-0.8 for likely questions, 0.4-0.6 for ambiguous, 0.1-0.3 for likely not questions`;

  const user = `Student message: "${text}"`;

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0,
        max_tokens: 50,
        response_format: { type: 'json_object' },
      }),
    });

    if (!resp.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);
    
    return {
      isQuestion: Boolean(parsed?.isQuestion),
      confidence: Math.max(0, Math.min(1, Number(parsed?.confidence) || 0.5))
    };
  } catch (error) {
    // Fallback heuristic on failure
    const hasQuestionMark = text.includes('?');
    const hasQuestionWords = /\b(what|how|why|when|where|who|can|could|would|should|is|are|do|does|did)\b/i.test(text);
    return { 
      isQuestion: hasQuestionMark || hasQuestionWords, 
      confidence: hasQuestionMark ? 0.9 : hasQuestionWords ? 0.6 : 0.1 
    };
  }
}

async function getClickHouseClient(): Promise<ClickHouseClient> {
  const url = process.env.CLICKHOUSE_URL || 'https://d8irwr6qnd.us-east1.gcp.clickhouse.cloud:8443';
  const username = process.env.CLICKHOUSE_USERNAME || 'default';
  const password = process.env.CLICKHOUSE_PASSWORD || 'yABbAN.S3f0Og';

  return createClient({ url, username, password });
}

function clampToScale(score: number): number {
  if (!Number.isFinite(score)) return 3;
  const rounded = Math.round(score);
  return Math.max(1, Math.min(5, rounded));
}

function parseInlineScore(text: string): number | null {
  // Handle simple numeric-only messages like "4.4" or "5"
  const trimmed = String(text || '').trim();
  // Allow formats like 4, 4.0, 4/5, score: 4.5 etc. Prefer first number found
  const match = trimmed.match(/(-?\d+(?:[\.,]\d+)?)/);
  if (!match) return null;
  const n = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  // If the message clearly expresses a numeric confidence (and isn't obviously something else), use it
  if (/^\s*\d+(?:[\.,]\d+)?\s*(?:\/\s*5)?\s*$/i.test(trimmed)) {
    return clampToScale(n);
  }
  return null;
}

async function scoreConfidenceWithOpenAI(text: string): Promise<number> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_HACKATHON_KEY;
  if (!apiKey) {
    // Fallback: heuristic if no key configured
    const heuristic = parseInlineScore(text);
    return heuristic ?? 3;
  }

  const system = `You rate a student's confidence from 1 to 5 (5 = most confident, 1 = least confident).
Return ONLY valid JSON: {"score": <integer 1-5>}.
Guidelines:
- 1: very lost, confused, asking for help
- 2: mostly lost, tentative, uncertainty words
- 3: mixed/neutral, some understanding, some doubt
- 4: mostly confident, clear understanding
- 5: very confident, ready to move on`;

  const user = `Message: ${text}`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
      max_tokens: 20,
      response_format: { type: 'json_object' },
    }),
  });

  if (!resp.ok) {
    // Fallback heuristic on failure
    const heuristic = parseInlineScore(text);
    return heuristic ?? 3;
  }

  const data = await resp.json();
  try {
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);
    const raw = Number(parsed?.score);
    return clampToScale(raw);
  } catch {
    const heuristic = parseInlineScore(text);
    return heuristic ?? 3;
  }
}

async function ensureTable(client: ClickHouseClient) {
  const ddl = `
CREATE TABLE IF NOT EXISTS class_pro_confidence (
  ts DateTime,
  student String,
  text String,
  confidence UInt8,
  is_question UInt8 DEFAULT 0,
  question_confidence Float32 DEFAULT 0.0
)
ENGINE = MergeTree
ORDER BY (student, ts)`;
  // Use command for DDL
  await client.command({ query: ddl });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LogConfidenceBody;
    const text = (body?.text ?? '').toString();
    const sender = (body?.sender ?? '').toString() || 'Unknown';
    const tsMs = Number(body?.timestamp) || Date.now();

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    // Quick fast-path: numeric-like inputs (e.g., "4.4")
    const inline = parseInlineScore(text);
    const score = inline ?? (await scoreConfidenceWithOpenAI(text));
    
    // Classify if this is a question
    const questionClassification = await classifyQuestionWithOpenAI(text);

    const client = await getClickHouseClient();
    await ensureTable(client);

    const ts = new Date(tsMs);

    await client.insert({
      table: 'class_pro_confidence',
      values: [
        {
          ts: ts.toISOString().slice(0, 19).replace('T', ' '), // ClickHouse DateTime string
          student: sender,
          text,
          confidence: score,
          is_question: questionClassification.isQuestion ? 1 : 0,
          question_confidence: questionClassification.confidence,
        },
      ],
      format: 'JSONEachRow',
    });

    return NextResponse.json({ 
      ok: true, 
      confidence: score,
      isQuestion: questionClassification.isQuestion,
      questionConfidence: questionClassification.confidence
    });
  } catch (err: any) {
    console.error('log-confidence error:', err);
    return NextResponse.json(
      { error: 'Failed to log confidence', details: err?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const client = await getClickHouseClient();
    // Ensure table exists before attempting to truncate
    await ensureTable(client);
    // Truncate all rows from the table
    await client.command({ query: 'TRUNCATE TABLE class_pro_confidence' });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('log-confidence DELETE error:', err);
    return NextResponse.json(
      { error: 'Failed to clear confidence logs', details: err?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


