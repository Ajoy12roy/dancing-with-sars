import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const aoi = searchParams.get('aoi');

  if (!aoi) {
    return NextResponse.json({ error: 'Missing AOI parameter' }, { status: 400 });
  }

  try {
    const dataPath = path.join(process.cwd(), 'data', 'precomputed', aoi, 'result.json');
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ error: 'Data not found for this AOI' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Provide URLs to images assuming they are served via our API
    return NextResponse.json({
      ...data,
      beforeImage: `/api/images?aoi=${aoi}&type=before`,
      afterImage: `/api/images?aoi=${aoi}&type=after`,
      changeMapImage: `/api/images?aoi=${aoi}&type=change-map`,
    });
  } catch (error) {
    console.error('Error reading change detection data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
