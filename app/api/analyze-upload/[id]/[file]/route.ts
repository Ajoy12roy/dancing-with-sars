import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_FILES = new Set(['change-map.png', 'before.png', 'after.png']);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; file: string }> }
) {
  const { id, file } = await params;

  // Sanitize id to UUID format to prevent path traversal
  if (!id || !UUID_REGEX.test(id)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }

  // Allow only change-map.png, before.png, after.png; reject any other filename
  if (!file || !ALLOWED_FILES.has(file)) {
    return NextResponse.json({ error: 'File not permitted' }, { status: 404 });
  }

  const filePath = path.join(os.tmpdir(), `sars-${id}`, 'out', file);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const fileBuffer = await fs.promises.readFile(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error serving upload PNG:', error);
    return NextResponse.json({ error: 'Error reading file' }, { status: 500 });
  }
}
