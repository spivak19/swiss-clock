import type { PagesFunction } from '@cloudflare/workers-types';
import type { Env } from '../_shared';

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const origin = url.origin;

  if (!code || !state) {
    return Response.redirect(`${origin}/?auth_error=missing_params`, 302);
  }

  // CSRF check
  const stateKey = `oauth_state:${state}`;
  const stateValid = await ctx.env.ATTENDANCE_KV.get(stateKey);
  if (!stateValid) {
    return Response.redirect(`${origin}/?auth_error=invalid_state`, 302);
  }
  await ctx.env.ATTENDANCE_KV.delete(stateKey);

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: ctx.env.GOOGLE_CLIENT_ID,
      client_secret: ctx.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${origin}/api/auth/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return Response.redirect(`${origin}/?auth_error=token_failed`, 302);
  }

  const { access_token } = await tokenRes.json() as { access_token: string };

  // Fetch user profile
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userRes.ok) {
    return Response.redirect(`${origin}/?auth_error=userinfo_failed`, 302);
  }

  const user = await userRes.json() as { email: string; name: string; picture: string };

  // Create session
  const token = crypto.randomUUID();
  await ctx.env.ATTENDANCE_KV.put(
    `session:${token}`,
    JSON.stringify({ email: user.email, name: user.name, picture: user.picture }),
    { expirationTtl: SESSION_TTL },
  );

  const isHttps = url.protocol === 'https:';
  const cookie = [
    `session=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL}`,
    ...(isHttps ? ['Secure'] : []),
  ].join('; ');

  return new Response(null, {
    status: 302,
    headers: { Location: origin, 'Set-Cookie': cookie },
  });
};
