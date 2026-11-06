import { NextResponse } from 'next/server';
import { getSylhetExposureData } from '@/lib/exposure';

export const dynamic = 'force-static';

export async function GET() {
  try {
    const data = getSylhetExposureData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to load Sylhet exposure data:', error);
    return NextResponse.json(
      {
        error: 'Failed to load Sylhet exposure data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
