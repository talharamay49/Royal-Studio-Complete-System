import { NextRequest, NextResponse } from 'next/server';
import { handleAdminApi } from '@/lib/admin/apiHandler';
import { dbInstance } from '@/lib/admin/db';

function withSecurityHeaders(response: Response): Response {
  try {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Cache-Control', 'no-store, max-age=0');
  } catch {
    // Immutable headers fallback
  }
  return response;
}

async function dispatchSafe(
  request: NextRequest,
  paramsPromise: Promise<{ slug: string[] }>
): Promise<Response> {
  try {
    await dbInstance.ensureHydrated();
    const resolved = await paramsPromise;
    const slug = Array.isArray(resolved?.slug) ? resolved.slug : [];
    const response = await handleAdminApi(request, slug);
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      await dbInstance.save();
    }
    return withSecurityHeaders(response);
  } catch (err: any) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : 'An unexpected server error occurred.';
    return withSecurityHeaders(
      NextResponse.json({ error: message }, { status: 500 })
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  return dispatchSafe(request, params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  return dispatchSafe(request, params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  return dispatchSafe(request, params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  return dispatchSafe(request, params);
}
