import type { PagesFunction } from '@cloudflare/workers-types';
import type { Env } from '../_shared';
import { getSessionToken, getSession, jsonResponse, errorResponse } from '../_shared';

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const token = getSessionToken(ctx.request);
  if (!token) return errorResponse('Not authenticated', 401);

  const session = await getSession(ctx.env.ATTENDANCE_KV, token);
  if (!session) return errorResponse('Invalid session', 401);

  return jsonResponse(session);
};
