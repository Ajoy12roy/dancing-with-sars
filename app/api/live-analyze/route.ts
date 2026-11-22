import { NextRequest, NextResponse } from 'next/server';
import { shouldProbeService } from '@/lib/service-probe';
import { validateLiveRequest } from '@/lib/live-validate';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getServiceUrl(): string {
  return (
    process.env.PROCESSING_API_URL ||
    process.env.NEXT_PUBLIC_PROCESSING_API_URL ||
    ''
  )
    .trim()
    .replace(/\/+$/, '');
}

function getHostName(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host') || '';
  const first = host.split(',')[0]?.trim() || '';
  return first.split(':')[0] || '';
}

export async function POST(request: NextRequest) {
  const hostname = getHostName(request);
  const apiUrl = getServiceUrl();

  // If deployed on a non-local host without a configured external service URL, return 503
  if (!shouldProbeService(hostname, apiUrl)) {
    return NextResponse.json(
      {
        error:
          'Live area analysis requires a connected backend service. The service is not configured for this deployment.',
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  const validation = validateLiveRequest(body);
  if (!validation.valid) {
    return NextResponse.json(
      {
        error: validation.error,
        window: validation.window,
      },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${apiUrl}/live/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validation.data),
    });

    const resJson = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = resJson.detail || resJson.error;
      if (res.status === 429) {
        return NextResponse.json(
          { error: msg || 'Server busy, try again in a minute' },
          { status: 429 }
        );
      }
      if (res.status === 503) {
        return NextResponse.json(
          {
            error:
              msg ||
              'Earth Engine is not set up on this computer. Run earthengine authenticate and set EARTHENGINE_PROJECT.',
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: msg || 'Failed to initialize live analysis job.' },
        { status: res.status }
      );
    }

    return NextResponse.json(resJson, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error:
          'Unable to connect to the processing server. Please ensure the local python-service is running.',
      },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  const hostname = getHostName(request);
  const apiUrl = getServiceUrl();

  // If deployed on a non-local host without a configured external service URL, return 503
  if (!shouldProbeService(hostname, apiUrl)) {
    return NextResponse.json(
      {
        error:
          'Live area analysis requires a connected backend service. The service is not configured for this deployment.',
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const jobId = searchParams.get('id');

  if (action === 'status') {
    try {
      const res = await fetch(`${apiUrl}/live/status`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
      return NextResponse.json({
        installed: false,
        initialized: false,
        project: null,
      });
    } catch {
      return NextResponse.json({
        installed: false,
        initialized: false,
        project: null,
      });
    }
  }

  if (!jobId) {
    return NextResponse.json(
      { error: "Missing required query parameter 'id'." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${apiUrl}/live/jobs/${encodeURIComponent(jobId)}`, {
      method: 'GET',
      cache: 'no-store',
    });

    const resJson = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(
          { error: resJson.detail || `Job '${jobId}' not found.` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: resJson.detail || 'Failed to retrieve job status.' },
        { status: res.status }
      );
    }

    return NextResponse.json(resJson);
  } catch {
    return NextResponse.json(
      {
        error:
          'Unable to connect to the processing server. Please ensure the local python-service is running.',
      },
      { status: 502 }
    );
  }
}
