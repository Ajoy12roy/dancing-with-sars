import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const aoi = searchParams.get('aoi');
  const type = searchParams.get('type');

  if (!aoi || !type) {
    return new NextResponse('Missing parameters', { status: 400 });
  }

  try {
    const imagePath = path.join(process.cwd(), 'data', 'precomputed', aoi, `${type}.png`);
    
    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      return new NextResponse(imageBuffer, {
        headers: { 'Content-Type': 'image/png' },
      });
    }

    // Fallback placeholder SVG if file does not exist
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
      <rect width="100%" height="100%" fill="#333" />
      <text x="50%" y="50%" font-family="sans-serif" font-size="24" fill="#fff" text-anchor="middle" dominant-baseline="middle">
        ${aoi.toUpperCase()} - ${type.toUpperCase()}
      </text>
    </svg>`;
    
    return new NextResponse(svg, {
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  } catch {
    return new NextResponse('Internal Error', { status: 500 });
  }
}
