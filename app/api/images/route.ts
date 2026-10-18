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

  // Sanitize path parameters to prevent directory traversal
  const cleanAoi = aoi.replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanType = type.replace(/[^a-zA-Z0-9_-]/g, '');

  try {
    const candidates = [
      path.join(process.cwd(), 'data', 'precomputed', cleanAoi, `${cleanType}.png`),
      path.join(process.cwd(), 'data', cleanAoi, `${cleanType}.png`),
    ];

    if (cleanType === 'change-map' || cleanType === 'change_map') {
      candidates.push(
        path.join(process.cwd(), 'data', 'precomputed', cleanAoi, 'change-map.png'),
        path.join(process.cwd(), 'data', 'precomputed', cleanAoi, 'change_map.png'),
        path.join(process.cwd(), 'data', 'precomputed', cleanAoi, `${cleanAoi}_change_map.png`),
        path.join(process.cwd(), 'data', cleanAoi, 'change-map.png'),
        path.join(process.cwd(), 'data', cleanAoi, `${cleanAoi}_change_map.png`)
      );
    } else if (cleanType === 'before') {
      candidates.push(
        path.join(process.cwd(), 'data', 'precomputed', cleanAoi, `${cleanAoi}_before.png`),
        path.join(process.cwd(), 'data', cleanAoi, `${cleanAoi}_before.png`)
      );
    } else if (cleanType === 'after') {
      candidates.push(
        path.join(process.cwd(), 'data', 'precomputed', cleanAoi, `${cleanAoi}_after.png`),
        path.join(process.cwd(), 'data', cleanAoi, `${cleanAoi}_after.png`)
      );
    }

    for (const cand of candidates) {
      if (fs.existsSync(/* turbopackIgnore: true */ cand)) {
        const imageBuffer = fs.readFileSync(/* turbopackIgnore: true */ cand);
        return new NextResponse(imageBuffer, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    }

    // Fallback placeholder SVG if file does not exist (adheres to DESIGN_SYSTEM.md)
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <rect width="100%" height="100%" fill="#141618" />
      <rect x="1" y="1" width="798" height="598" fill="none" stroke="#C7C4BC" stroke-width="1" stroke-dasharray="4 4" />
      <text x="50%" y="46%" font-family="monospace, 'IBM Plex Mono', sans-serif" font-size="20" font-weight="600" fill="#EDEBE6" text-anchor="middle" dominant-baseline="middle" letter-spacing="1.5">
        ${cleanAoi.toUpperCase()} - ${cleanType.toUpperCase()}
      </text>
      <text x="50%" y="54%" font-family="system-ui, 'Public Sans', sans-serif" font-size="13" fill="#C7C4BC" text-anchor="middle" dominant-baseline="middle">
        Preview unavailable &bull; SAR data placeholder
      </text>
    </svg>`;
    
    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache',
      },
    });
  } catch {
    return new NextResponse('Internal Error', { status: 500 });
  }
}
