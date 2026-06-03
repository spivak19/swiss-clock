import type { PagesFunction } from '@cloudflare/workers-types';
import type { Env } from '../_shared';
import { getSessionToken } from '../_shared';

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const origin = new URL(ctx.request.url).origin;
  const token = getSessionToken(ctx.request);

  if (token) {
    await ctx.env.ATTENDANCE_KV.delete(`session:${token}`);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${origin}/`,
      'Set-Cookie': 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    },
  });
};
