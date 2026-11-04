import { NextResponse } from 'next/server';
import { getNisarTimeseriesData } from '@/lib/nisar';

export const dynamic = 'force-static';

export async function GET() {
  try {
    const data = getNisarTimeseriesData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to load NISAR timeseries data:', error);
    return NextResponse.json(
      { error: 'Failed to load NISAR timeseries data' },
      { status: 500 }
    );
  }
}

