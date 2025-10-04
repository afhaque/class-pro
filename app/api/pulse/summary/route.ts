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
    const minutes = Math.max(1, Math.min(24 * 60, Number(searchParams.get('minutes')) || 120));

    const client = getClient();

    // Active students, question count (AI classified), total messages, average confidence
    const query = `
      SELECT
        countIf(student != 'You') AS total_messages,
        countIf(student != 'You' AND is_question = 1) AS question_count,
        uniqExactIf(student, student != 'You') AS active_students,
        avg(confidence) AS avg_conf
      FROM class_pro_confidence
      WHERE ts >= now() - INTERVAL ${minutes} MINUTE
    `;

    const rows = await client.query({ query, format: 'JSONEachRow' });
    const [data] = await rows.json<any[]>();

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    console.error('pulse/summary error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


