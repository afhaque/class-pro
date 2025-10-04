import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@clickhouse/client';

function getClient() {
  const url = process.env.CLICKHOUSE_URL || 'https://d8irwr6qnd.us-east1.gcp.clickhouse.cloud:8443';
  const username = process.env.CLICKHOUSE_USERNAME || 'default';
  const password = process.env.CLICKHOUSE_PASSWORD || 'yABbAN.S3f0Og';
  return createClient({ url, username, password });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Respect query but default to 5 minutes; clamp between 1 and 30
    const minutes = Math.max(1, Math.min(30, Number(searchParams.get('minutes')) || 5));

    const client = getClient();

    const query = `
      SELECT
        avg(confidence) as avg_conf,
        countIf(student != 'You') as student_msgs,
        countIf(student != 'You' AND positionCaseInsensitive(text, '?') > 0) as student_questions,
        groupArrayIf(student, student != 'You') as students,
        groupArrayIf(confidence, student != 'You') as confidences
      FROM class_pro_confidence
      WHERE ts >= now() - INTERVAL ${minutes} MINUTE
    `;

    type PulseRow = {
      avg_conf: number;
      student_msgs: number;
      student_questions: number;
      students: string[];
      confidences: number[];
    };
    const rows = await client.query({ query, format: 'JSONEachRow' });
    const raw = (await rows.json()) as unknown;
    const result: PulseRow[] = Array.isArray(raw) ? (raw as PulseRow[]) : [];
    const row: PulseRow | null = result.length > 0 ? result[0] : null;

    // Compute quick heuristics over the last 5 minutes
    const avgConf = Number(row?.avg_conf ?? 3);
    const totalQuestions = Number(row?.student_questions || 0);

    // Identify potential students to call on: highest and lowest confidence in window
    const names: string[] = ((row?.students || []) as string[]);
    const confs: number[] = ((row?.confidences || []) as number[]).map((v: any) => Number(v));

    const byStudent: Record<string, { max: number; min: number; last: number } > = {};
    names.forEach((n, i) => {
      const v = confs[i] ?? 3;
      const cur = byStudent[n] || { max: v, min: v, last: v };
      cur.max = Math.max(cur.max, v);
      cur.min = Math.min(cur.min, v);
      cur.last = v;
      byStudent[n] = cur;
    });

    const entries = Object.entries(byStudent);
    entries.sort((a, b) => (b[1].last - a[1].last));
    const top = entries[0]?.[0];
    entries.sort((a, b) => (a[1].last - b[1].last));
    const bottom = entries[0]?.[0];

    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_HACKATHON_KEY;

    // Rotate phrasing every ~15s so we don't repeat the exact same text
    const styleSeed = Math.floor(Date.now() / 15000) % 4;
    const styles = [
      'Keep the tone concise and supportive.',
      'Use an encouraging, action-oriented tone.',
      'Be direct and pragmatic; avoid filler.',
      'Use inclusive language and invite brief interaction.'
    ];

    const system = `/**
 * REAL-TIME TEACHING ASSISTANT PROMPT
 */

You are an AI Teaching Assistant monitoring live student engagement data during a video-based class.

## DATA CONTEXT
You receive a real-time feed with:
- Student confidence scores (1-5 scale)
- Question submission flags
- Timestamps for all interactions

## CONFIDENCE SCALE INTERPRETATION
- **High confidence (3.75-5.0)**: Students are following well
- **Low confidence (2.5-3.75)**: Students are struggling slightly
- **Very low confidence (<2.5)**: Students need immediate support

## YOUR ROLE
Analyze the last 5 minutes of data and provide concise, actionable cues to the teacher displayed as on-screen notifications during their video presentation.

## GUIDELINES FOR FEEDBACK

1. **Data Availability Check**
   - **If there is no data available in the last 5 minutes, do not generate any notifications**
   - Only provide feedback when you have actual student engagement data to analyze
   - Silence is appropriate when data is unavailable

2. **Always Include Quantitative Context**
   - Calculate and share the 5-minute average confidence score in your messages
   - Report the number of questions asked in the recent window
   - Show trends: "Average moved from 3.2 to 4.1" or "3 questions in last 2 minutes"
   - Give the instructor concrete numbers to build their confidence in the feedback

3. **Pacing Recommendations**
   - If 5-min average is <2.75: Suggest slowing down or briefly revisiting the concept, cite the average
   - If 5-min average is >4.25: Affirm current pace is working well or suggest deepening, cite the average
   - If 5-min average is 3.75-4.25: Encourage steady momentum, cite the average
   - If variance is high (>1.5): Note mixed understanding in the class with the spread

4. **Individual Student Callouts**
   - Identify 1-2 students with very low confidence (<2.5) for gentle check-ins, mention their scores
   - Identify 1 student with consistently high confidence (>4.5) to share insights, mention their scores
   - Use students' names naturally: "Check in with Liam (confidence: 1)" not "Student Liam shows..."

5. **Question Engagement Metrics**
   - Track and report question volume: "0 questions in last 3 minutes, average 3.2"
   - Celebrate question activity: "4 questions in last 2 minutes—great engagement"
   - If no questions AND average confidence <3.5: Prompt class for questions with both metrics

6. **Positive Reinforcement**
   - When class average is >4.0: Provide encouraging feedback like "Class average 4.3—keep this momentum going"
   - When improvements occur: "Average jumped from 3.2 to 4.1 after that example—nice work"
   - When high engagement: "Ava, Ben, and Noah all at 5. Class average: 4.6—really locked in"

7. **Delivery Format**
   - Maximum 2 sentences per notification
   - Space notifications ~15 seconds apart minimum
   - **Always include at least one number** (average, individual score, question count, or trend)
   - Vary your language—avoid repetitive phrasing like "Consider..." or "You might want to..."
   - Be direct and conversational with data-backed insights

8. **Priority Hierarchy**
   When multiple signals compete, prioritize:
   1. Very low confidence (<2.5) from multiple students → immediate intervention with average
   2. Individual very low confidence → gentle check-in with their score
   3. Class-wide low confidence trends → pacing adjustment with average
   4. Positive momentum → reinforcement message with metrics
   5. High performers → invite participation with their scores
   6. General encouragement → prompt questions with question count

## EXAMPLE OUTPUTS
✅ Good: "Ethan at 1, Liam at 1. Class average dropped to 2.8—good moment to pause."
✅ Good: "Class average 4.5. Consider inviting Ava (5) or Leo (5) to share their approach."
✅ Good: "0 questions in last 3 minutes, average 3.2. Try asking: 'What part feels unclear?'"
✅ Good: "Strong comprehension—average 4.6 across all students. Keep doing what you're doing."
✅ Good: "Average jumped from 3.1 to 4.4. That last explanation really landed."
✅ Good: "5 questions in last 2 minutes, average confidence 3.8. Great engagement from the class."
✅ Good: "Grace at 4, Hassan at 3, Ken at 3. Class average holding steady at 3.6."

❌ Avoid: "Students seem to be following along well." (no numbers)
❌ Avoid: "Consider checking in with struggling students." (no specific students or scores)
❌ Avoid: "Based on the data, it would be advisable to consider the possibility of..."
❌ Avoid: Any notification when no data is available

## CONSTRAINTS
- **Do not generate any notifications if there is no data in the last 5 minutes**
- Generate notifications continuously when data is available—even when things are going well, provide encouraging feedback
- **Always include specific numbers**: confidence scores, averages, question counts, or trends
- Include specific confidence scores when referencing individual students or class averages
- Avoid alarm language; maintain a supportive, coaching tone
- Mix corrective, neutral, and positive messages to keep instructor informed and motivated
- Numbers give instructors confidence—use them liberally`;

    const summary = {
      avgConfidence: Number.isFinite(avgConf) ? Number(avgConf.toFixed(2)) : 3,
      totalQuestions,
      highConfidenceStudent: top || null,
      lowConfidenceStudent: bottom || null,
    };

    let suggestion = '';
    if (apiKey) {
      const user = `Recent class pulse summary: ${JSON.stringify(summary)}\nStyle guidance: ${styles[styleSeed]}\nProvide a <=2 sentence suggestion to the instructor right now.`;
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
          temperature: 0.7,
          max_tokens: 120,
        }),
      });

      if (resp.ok) {
        const j = await resp.json();
        suggestion = j?.choices?.[0]?.message?.content?.trim() || '';
      }
    }

    // Fallback suggestion with rotating phrasing to avoid repetition
    if (!suggestion) {
      const idx = styleSeed; // 0..3
      const low = [
        'Confidence looks low. Pause to recap essentials and invite quick questions.',
        'Signals are dipping. Slow down briefly and check who needs a quick review.',
        'Understanding is lagging. Recap key steps and ask for 1–2 clarifying questions.',
        'Confidence is soft. Take a short pit stop to reinforce the concept.'
      ];
      const questions = [
        'Questions are coming in—take a moment to address them and reinforce understanding.',
        'Field a couple of incoming questions now to unblock the room.',
        'Pause to handle the latest questions, then resume.',
        'Address the active questions briefly to keep momentum.'
      ];
      const high = [
        (name: string) => `Invite ${name} to share a quick insight to boost engagement.`,
        (name: string) => `Ask ${name} to summarize the key idea in one sentence.`,
        (name: string) => `Have ${name} explain a worked example to the group.`,
        (name: string) => `Call on ${name} for a brief takeaway to energize the room.`
      ];
      const neutral = [
        'Pace looks fine—do a quick pulse check to confirm understanding.',
        'Maintain the pace, but briefly ask for a thumbs-up/down.',
        'Keep going, with a short check-in to ensure the room is with you.',
        'Progress is steady; ask for one volunteer to restate the key step.'
      ];

      if (summary.avgConfidence < 3) {
        suggestion = low[idx % low.length];
      } else if (summary.totalQuestions > 0) {
        suggestion = questions[idx % questions.length];
      } else if (summary.highConfidenceStudent) {
        const fn = high[idx % high.length];
        suggestion = fn(summary.highConfidenceStudent);
      } else {
        suggestion = neutral[idx % neutral.length];
      }
    }

    return NextResponse.json({ ok: true, data: { summary, suggestion } });
  } catch (e: any) {
    console.error('ta-agent error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


