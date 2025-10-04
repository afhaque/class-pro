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

    const query = `
      SELECT confidence, count() AS cnt
      FROM class_pro_confidence
      WHERE ts >= now() - INTERVAL ${minutes} MINUTE
      GROUP BY confidence
      ORDER BY confidence
    `;

    const rows = await client.query({ query, format: 'JSONEachRow' });
    const data = await rows.json<{ confidence: number; cnt: number }[]>();

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    console.error('pulse/distribution error', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


