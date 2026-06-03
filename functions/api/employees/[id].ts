import type { PagesFunction } from '@cloudflare/workers-types';
import {
  type Env,
  getEmployees,
  saveEmployees,
  jsonResponse,
  errorResponse,
} from '../_shared';

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  const { id } = ctx.params as { id: string };

  let body: { name?: string };
  try {
    body = await ctx.request.json<{ name?: string }>();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const name = body.name?.trim();
  if (!name) return errorResponse('Name is required');

  const employees = await getEmployees(ctx.env);
  const index = employees.findIndex((e) => e.id === id);

  if (index === -1) return errorResponse('Employee not found', 404);

  if (
    employees.some(
      (e, i) => i !== index && e.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    return errorResponse('An employee with this name already exists', 409);
  }

  employees[index] = { ...employees[index], name };
  await saveEmployees(ctx.env, employees);

  return jsonResponse(employees[index]);
};

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const { id } = ctx.params as { id: string };

  const employees = await getEmployees(ctx.env);
  const filtered = employees.filter((e) => e.id !== id);

  if (filtered.length === employees.length) {
    return errorResponse('Employee not found', 404);
  }

  await saveEmployees(ctx.env, filtered);
  return new Response(null, { status: 204 });
};
