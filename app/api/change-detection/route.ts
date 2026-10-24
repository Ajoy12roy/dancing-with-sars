import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 15;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const aoi = searchParams.get('aoi');

  if (!aoi) {
    return NextResponse.json({ error: 'Missing AOI parameter' }, { status: 400 });
  }

  try {
    const cleanAoi = aoi.replace(/[^a-zA-Z0-9_-]/g, '');
    const dataPath = path.join(process.cwd(), 'data', 'precomputed', cleanAoi, 'result.json');
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ error: 'Data not found for this AOI' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Provide URLs to images assuming they are served via our API, passing all new fields unchanged
    return NextResponse.json({
      aoiId: data.aoiId || cleanAoi,
      name: data.name || cleanAoi,
      dateBefore: data.dateBefore || (data.dates?.a ? data.dates.a : 'Before Scene'),
      dateAfter: data.dateAfter || (data.dates?.b ? data.dates.b : 'After Scene'),
      ...data,
      beforeImage: `/api/images?aoi=${cleanAoi}&type=before`,
      afterImage: `/api/images?aoi=${cleanAoi}&type=after`,
      changeMapImage: `/api/images?aoi=${cleanAoi}&type=change-map`,
    });
  } catch (error) {
    console.error('Error reading change detection data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
