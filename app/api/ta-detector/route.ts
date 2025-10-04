import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@clickhouse/client';

function getClient() {
  const url = process.env.CLICKHOUSE_URL || 'https://d8irwr6qnd.us-east1.gcp.clickhouse.cloud:8443';
  const username = process.env.CLICKHOUSE_USERNAME || 'default';
  const password = process.env.CLICKHOUSE_PASSWORD || 'yABbAN.S3f0Og';
  return createClient({ url, username, password });
}

type DetectorRow = {
  avg_conf: number;
  min_conf: number;
  max_conf: number;
  student_cnt: number;
  question_cnt_5m: number;
  question_cnt_3m: number;
  students: string[];
  confidences: number[];
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minutes = Math.max(1, Math.min(30, Number(searchParams.get('minutes')) || 5));

    const client = getClient();

    // Current 5 minutes
    const curQuery = `
      SELECT
        avg(confidence) as avg_conf,
        min(confidence) as min_conf,
        max(confidence) as max_conf,
        uniqExactIf(student, student != 'You') as student_cnt,
        countIf(student != 'You' AND positionCaseInsensitive(text, '?') > 0) as question_cnt_5m,
        countIf(student != 'You' AND positionCaseInsensitive(text, '?') > 0 AND ts >= now() - INTERVAL 3 MINUTE) as question_cnt_3m,
        groupArrayIf(student, student != 'You') as students,
        groupArrayIf(confidence, student != 'You') as confidences
      FROM class_pro_confidence
      WHERE ts >= now() - INTERVAL ${minutes} MINUTE
    `;

    // Previous 5 minutes
    const prevQuery = `
      SELECT
        avg(confidence) as avg_conf
      FROM class_pro_confidence
      WHERE ts >= now() - INTERVAL ${minutes * 2} MINUTE
        AND ts < now() - INTERVAL ${minutes} MINUTE
    `;

    const [curRows, prevRows] = await Promise.all([
      client.query({ query: curQuery, format: 'JSONEachRow' }),
      client.query({ query: prevQuery, format: 'JSONEachRow' }),
    ]);

    const curData = await curRows.json<DetectorRow[]>();
    const prevData = await prevRows.json<{ avg_conf: number }[]>();
    const cur: DetectorRow | null = curData && curData.length > 0 ? curData[0] : null;
    const prevAvg = Number(prevData && prevData.length > 0 ? prevData[0].avg_conf : NaN);

    // No/insufficient data checks
    if (!cur || !Array.isArray(cur.confidences) || cur.confidences.length === 0) {
      return NextResponse.json({ ok: true, data: { notable_event: false, reason: 'no_data' } });
    }
    if (cur.confidences.length < 3) {
      return NextResponse.json({ ok: true, data: { notable_event: false, reason: 'insufficient_data' } });
    }

    const avg = Number(cur.avg_conf || 0);
    const min = Math.min(...cur.confidences);
    const max = Math.max(...cur.confidences);
    const std = (() => {
      const mean = avg || 0;
      const v = cur.confidences.reduce((s: number, x: number) => s + Math.pow((x - mean), 2), 0) / cur.confidences.length;
      return Math.sqrt(v);
    })();

    const uniqueStudents = Array.from(new Set(cur.students || []));
    const lowStudents = uniqueStudents
      .map((name, i) => ({ name, score: Number(cur.confidences[i] ?? 3) }))
      .filter(x => x.score < 2.5);
    const highStudents = uniqueStudents
      .map((name, i) => ({ name, score: Number(cur.confidences[i] ?? 3) }))
      .filter(x => x.score >= 4.0);

    const pctBelow25 = cur.confidences.filter((v: number) => v < 2.5).length / cur.confidences.length;
    const pctAbove40 = cur.confidences.filter((v: number) => v >= 4.0).length / cur.confidences.length;

    const deltaFromPrev = Number.isFinite(prevAvg) ? (avg - prevAvg) : 0;

    // Deterministic rule-based detection per spec
    let notable = false;
    let event_type: string = 'neutral';
    let severity: 'critical' | 'moderate' | 'positive' | 'neutral' = 'neutral';
    let summary = '';

    // Very low sentiment (critical)
    if (min === 1 || avg < 2.0 || pctBelow25 >= 0.5) {
      notable = true;
      event_type = 'very_low_sentiment';
      severity = 'critical';
      summary = `Critical sentiment: avg ${avg.toFixed(2)}, min ${min}, ${Math.round(pctBelow25*100)}% < 2.5`;
    }
    // Low sentiment
    else if (avg < 2.75 || lowStudents.length >= 3 || (Number.isFinite(prevAvg) && deltaFromPrev < -1.0) || avg < 3.0) {
      notable = true;
      event_type = (Number.isFinite(prevAvg) && deltaFromPrev < -1.0) ? 'confidence_drop' : 'low_sentiment';
      severity = 'moderate';
      summary = `Low sentiment: avg ${avg.toFixed(2)}, low students ${lowStudents.length}`;
    }
    // Question engagement
    else if ((cur.question_cnt_3m === 0 && avg < 3.5) || cur.question_cnt_5m >= 4 || cur.question_cnt_5m === 0) {
      notable = true;
      event_type = cur.question_cnt_5m >= 4 ? 'question_surge' : (cur.question_cnt_5m === 0 ? 'no_questions' : 'no_questions');
      severity = cur.question_cnt_5m >= 4 ? 'positive' : 'neutral';
      summary = `Questions 5m: ${cur.question_cnt_5m}, 3m: ${cur.question_cnt_3m}, avg ${avg.toFixed(2)}`;
    }
    // High sentiment (positive)
    else if (avg > 4.25 || (Number.isFinite(prevAvg) && deltaFromPrev > 1.0) || pctAbove40 >= 0.8 || avg > 4.5) {
      notable = true;
      event_type = (Number.isFinite(prevAvg) && deltaFromPrev > 1.0) ? 'confidence_surge' : 'high_sentiment';
      severity = 'positive';
      summary = `High sentiment: avg ${avg.toFixed(2)}, +${deltaFromPrev.toFixed(2)} vs prev`;
    }
    // Mixed signals
    else if (std > 1.5 || (pctBelow25 > 0 && pctAbove40 > 0.45)) {
      notable = true;
      event_type = std > 1.5 ? 'high_variance' : 'polarized';
      severity = 'neutral';
      summary = `Mixed: std ${std.toFixed(2)}, low ${Math.round(pctBelow25*100)}%, high ${Math.round(pctAbove40*100)}%`;
    }

    const payload = {
      notable_event: notable,
      event_type,
      severity,
      summary,
      metrics: {
        average_confidence: Number(avg.toFixed(2)),
        min_confidence: min,
        max_confidence: max,
        question_count: cur.question_cnt_5m,
        student_count: cur.student_cnt,
        low_confidence_students: lowStudents.slice(0, 5).map(s => s.name),
        high_confidence_students: highStudents.slice(0, 5).map(s => s.name),
      },
    };

    return NextResponse.json({ ok: true, data: payload });
  } catch (e: any) {
    console.error('ta-detector error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


