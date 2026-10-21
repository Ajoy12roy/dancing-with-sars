import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawn } from 'child_process';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Allow at most 2 concurrent analyses; extra requests get 429
let activeAnalyses = 0;
const MAX_CONCURRENT = 2;

const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250 MB
const MAX_BODY_SIZE = 520 * 1024 * 1024; // 520 MB
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_TEMP_AGE_MS = 30 * 60 * 1000; // 30 minutes

let cachedPythonBin: string | null = null;

async function checkPythonExecutable(executable: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    try {
      const proc = spawn(executable, ['--version'], { windowsHide: true });
      proc.on('error', () => resolve(false));
      proc.on('close', (code) => resolve(code === 0));
    } catch {
      resolve(false);
    }
  });
}

async function resolvePythonExecutable(): Promise<string> {
  if (cachedPythonBin) {
    return cachedPythonBin;
  }

  const venvPython = path.join(
    process.cwd(),
    'python-service',
    '.venv',
    process.platform === 'win32' ? 'Scripts' : 'bin',
    process.platform === 'win32' ? 'python.exe' : 'python'
  );

  const candidates: string[] = [];
  if (process.env.PYTHON_BIN) {
    candidates.push(process.env.PYTHON_BIN);
  }
  candidates.push(venvPython);
  candidates.push('python');
  candidates.push('python3');
  candidates.push('py');

  for (const candidate of candidates) {
    if (await checkPythonExecutable(candidate)) {
      cachedPythonBin = candidate;
      return candidate;
    }
  }

  return 'python';
}

function isValidTiffBuffer(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  // Little-endian classic TIFF: II*\0 (0x49, 0x49, 0x2A, 0x00)
  if (buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00) return true;
  // Big-endian classic TIFF: MM\0* (0x4D, 0x4D, 0x00, 0x2A)
  if (buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a) return true;
  // Little-endian BigTIFF: II+\0 (0x49, 0x49, 0x2B, 0x00)
  if (buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2b && buf[3] === 0x00) return true;
  // Big-endian BigTIFF: MM\0+ (0x4D, 0x4D, 0x00, 0x2B)
  if (buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2b) return true;
  return false;
}

// Delete temp directories older than 30 minutes at the start of each request
async function cleanOldTempDirs() {
  try {
    const tmpBase = os.tmpdir();
    const entries = await fs.promises.readdir(tmpBase, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('sars-')) {
        const dirPath = path.join(tmpBase, entry.name);
        try {
          const stat = await fs.promises.stat(dirPath);
          if (now - stat.mtimeMs > MAX_TEMP_AGE_MS) {
            await fs.promises.rm(dirPath, { recursive: true, force: true });
          }
        } catch {
          // Ignore individual directory cleanup errors
        }
      }
    }
  } catch {
    // Ignore cleanup scan errors
  }
}

function isGeoTiff(fileName: string): boolean {
  return /\.(tif|tiff)$/i.test(fileName);
}

export async function POST(request: Request) {
  // Reject early using Content-Length header before parsing form
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return NextResponse.json(
      { error: 'File upload exceeds the 520 MB limit.' },
      { status: 413 }
    );
  }

  // Allow at most 2 concurrent analyses; extra requests get 429
  if (activeAnalyses >= MAX_CONCURRENT) {
    return NextResponse.json(
      { error: 'Another analysis is running, please wait.' },
      { status: 429 }
    );
  }

  // Reserve concurrency slot immediately after limit check, before ANY await
  activeAnalyses++;

  let tmpDir: string | null = null;

  const cleanupTempDir = async () => {
    if (tmpDir) {
      try {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup error
      }
    }
  };

  try {
    // Delete temp directories older than 30 minutes at the start of request
    await cleanOldTempDirs();

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse form data.' },
        { status: 400 }
      );
    }

    const beforeImage = formData.get('beforeImage');
    const afterImage = formData.get('afterImage');

    const modeRaw = formData.get('mode');
    const dateARaw = formData.get('dateA');
    const dateBRaw = formData.get('dateB');

    // Validate mode against the four allowed strings (default to 'flood' if absent)
    const allowedModes = ['flood', 'river-erosion', 'deforestation', 'surface-water'];
    const mode = typeof modeRaw === 'string' && modeRaw.trim() ? modeRaw.trim() : 'flood';
    if (!allowedModes.includes(mode)) {
      return NextResponse.json(
        { error: `Invalid mode '${mode}'. Allowed values: ${allowedModes.join(', ')}.` },
        { status: 400 }
      );
    }

    // Validate dates against /^\d{4}-\d{2}-\d{2}$/
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    let dateA: string | undefined;
    if (dateARaw && typeof dateARaw === 'string' && dateARaw.trim()) {
      const trimmedA = dateARaw.trim();
      if (!dateRegex.test(trimmedA)) {
        return NextResponse.json(
          { error: `Invalid dateA format: '${trimmedA}'. Expected YYYY-MM-DD.` },
          { status: 400 }
        );
      }
      dateA = trimmedA;
    }

    let dateB: string | undefined;
    if (dateBRaw && typeof dateBRaw === 'string' && dateBRaw.trim()) {
      const trimmedB = dateBRaw.trim();
      if (!dateRegex.test(trimmedB)) {
        return NextResponse.json(
          { error: `Invalid dateB format: '${trimmedB}'. Expected YYYY-MM-DD.` },
          { status: 400 }
        );
      }
      dateB = trimmedB;
    }

    if (
      !beforeImage ||
      !(beforeImage instanceof File) ||
      !afterImage ||
      !(afterImage instanceof File)
    ) {
      return NextResponse.json(
        { error: 'Both beforeImage and afterImage files are required.' },
        { status: 400 }
      );
    }

    // Validate both files end in .tif or .tiff (case-insensitive)
    if (!isGeoTiff(beforeImage.name) || !isGeoTiff(afterImage.name)) {
      return NextResponse.json(
        {
          error:
            'Please upload GeoTIFF (.tif/.tiff) files. A normal photo has no geospatial metadata, so area cannot be measured.',
        },
        { status: 400 }
      );
    }

    // Max size 250 MB per file; return 413 with a clear message above that
    if (beforeImage.size > MAX_FILE_SIZE || afterImage.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds the 250 MB limit. Please upload files under 250 MB.' },
        { status: 413 }
      );
    }

    const id = crypto.randomUUID();
    tmpDir = path.join(os.tmpdir(), `sars-${id}`);
    const outDir = path.join(tmpDir, 'out');

    await fs.promises.mkdir(tmpDir, { recursive: true });
    await fs.promises.mkdir(outDir, { recursive: true });

    const pathA = path.join(tmpDir, 'image_a.tif');
    const pathB = path.join(tmpDir, 'image_b.tif');

    const bufferA = Buffer.from(await beforeImage.arrayBuffer());
    const bufferB = Buffer.from(await afterImage.arrayBuffer());

    await fs.promises.writeFile(pathA, bufferA);
    await fs.promises.writeFile(pathB, bufferB);

    // Verify first 4 bytes match a valid TIFF signature (II*\0, MM\0*, or BigTIFF II+\0 / MM\0+)
    if (!isValidTiffBuffer(bufferA) || !isValidTiffBuffer(bufferB)) {
      await cleanupTempDir();
      return NextResponse.json(
        {
          error:
            'Please upload GeoTIFF (.tif/.tiff) files. A normal photo has no geospatial metadata, so area cannot be measured.',
        },
        { status: 400 }
      );
    }

    const pythonServiceDir = path.join(process.cwd(), 'python-service');
    const pythonBin = await resolvePythonExecutable();

    // Run the pipeline with child_process.spawn
    // Argument array only (no shell: true) to avoid command injection
    const pyArgs = [
      'process_change.py',
      '--aoi',
      id,
      '--input-dir',
      tmpDir,
      '--output-dir',
      outDir,
      '--mode',
      mode,
    ];
    if (dateA) {
      pyArgs.push('--date-a', dateA);
    }
    if (dateB) {
      pyArgs.push('--date-b', dateB);
    }

    const pyProcess = spawn(/*turbopackIgnore: true*/ pythonBin, pyArgs, {
      cwd: pythonServiceDir,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    pyProcess.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    pyProcess.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      pyProcess.kill();
    }, TIMEOUT_MS);

    const exitCode = await new Promise<number | null>((resolve) => {
      pyProcess.on('close', (code) => {
        clearTimeout(timeoutTimer);
        resolve(code);
      });
      pyProcess.on('error', (err) => {
        clearTimeout(timeoutTimer);
        stderr += `\n${err.message}`;
        resolve(-1);
      });
    });

    if (timedOut) {
      await cleanupTempDir();
      return NextResponse.json(
        {
          error:
            'Analysis timed out after 5 minutes. The files may be too large to process within the limit.',
        },
        { status: 504 }
      );
    }

    if (exitCode !== 0) {
      await cleanupTempDir();
      if (stderr.includes('ENOENT') || stderr.includes('spawn python') || stderr.includes('spawn python3')) {
        return NextResponse.json(
          {
            error:
              'Python runtime is not available on this system. Please install Python and dependencies in python-service to analyze custom uploads.',
          },
          { status: 503 }
        );
      }

      if (stderr.includes('No module named') || stderr.includes('ModuleNotFoundError')) {
        const moduleMatch = stderr.match(/No module named ['"]([^'"]+)['"]/);
        const moduleName = moduleMatch ? moduleMatch[1] : 'required dependencies';
        return NextResponse.json(
          {
            error: `Missing Python dependency (${moduleName}). Please install requirements: pip install -r python-service/requirements.txt`,
          },
          { status: 503 }
        );
      }

      // On script failure return 422 with the last meaningful line of stderr
      const errLines = stderr
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      const outLines = stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      let lastMeaningfulLine =
        errLines.length > 0 ? errLines[errLines.length - 1] : '';

      if (!lastMeaningfulLine && outLines.length > 0) {
        lastMeaningfulLine = outLines[outLines.length - 1];
      }

      if (!lastMeaningfulLine) {
        lastMeaningfulLine = 'Change detection processing failed. Please verify the uploaded GeoTIFF files.';
      }

      return NextResponse.json({ error: lastMeaningfulLine }, { status: 422 });
    }

    const resultJsonPath = path.join(outDir, 'result.json');
    if (!fs.existsSync(resultJsonPath)) {
      await cleanupTempDir();
      return NextResponse.json(
        { error: 'Pipeline completed but result.json was not generated.' },
        { status: 500 }
      );
    }

    const resultRaw = await fs.promises.readFile(resultJsonPath, 'utf-8');
    const resultData = JSON.parse(resultRaw);

    const baseUrl = `/api/analyze-upload/${id}`;

    return NextResponse.json({
      name: 'Uploaded SAR Imagery',
      dateBefore: resultData.dates?.a || 'Before Scene',
      dateAfter: resultData.dates?.b || 'After Scene',
      ...resultData,
      aoiId: id,
      beforeImage: `${baseUrl}/before.png`,
      afterImage: `${baseUrl}/after.png`,
      changeMapImage: `${baseUrl}/change-map.png`,
      changeMapUrl: `${baseUrl}/change-map.png`,
    });
  } catch (err: unknown) {
    await cleanupTempDir();
    console.error('Upload processing error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  } finally {
    activeAnalyses--;
  }
}
