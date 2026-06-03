import type { PagesFunction } from '@cloudflare/workers-types';
import type { Env } from './_shared';
import { getSessionToken, getSession } from './_shared';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequest: PagesFunction<Env> = async (ctx) => {
  if (ctx.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const { pathname } = new URL(ctx.request.url);

  // Auth routes are public
  if (!pathname.startsWith('/api/auth/')) {
    const token = getSessionToken(ctx.request);
    if (!token) {
      return Response.json({ error: 'Not authenticated' }, { status: 401, headers: CORS });
    }
    const session = await getSession(ctx.env.ATTENDANCE_KV, token);
    if (!session) {
      return Response.json({ error: 'Invalid session' }, { status: 401, headers: CORS });
    }
  }

  const response = await ctx.next();
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Access-Control-Allow-Origin', '*');
  return newResponse;
};
