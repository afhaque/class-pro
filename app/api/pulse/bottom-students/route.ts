'use server';
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
    const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit')) || 5));
    const minMsgs = Math.max(1, Math.min(1000, Number(searchParams.get('minMsgs')) || 1));

    const client = getClient();

    const query = `
      SELECT
        student AS student_id,
        round(avg(confidence), 2) AS avg_conf,
        count() AS msgs
      FROM class_pro_confidence
      WHERE ts >= now() - INTERVAL ${minutes} MINUTE AND student != 'You'
      GROUP BY student
      HAVING msgs >= ${minMsgs}
      ORDER BY avg_conf ASC, msgs DESC, student_id ASC
      LIMIT ${limit}
    `;

    const rows = await client.query({ query, format: 'JSONEachRow' });
    const data = await rows.json<Array<{ student_id: string; avg_conf: number; msgs: number }>>();

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    console.error('pulse/bottom-students error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


