import type { PagesFunction } from '@cloudflare/workers-types';
import {
  type Env,
  getEmployees,
  saveEmployees,
  jsonResponse,
  errorResponse,
} from '../_shared';

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const employees = await getEmployees(ctx.env);
  return jsonResponse(employees);
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let body: { name?: string };
  try {
    body = await ctx.request.json<{ name?: string }>();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const name = body.name?.trim();
  if (!name) return errorResponse('Name is required');

  const employees = await getEmployees(ctx.env);

  if (employees.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
    return errorResponse('An employee with this name already exists', 409);
  }

  const newEmployee = { id: crypto.randomUUID(), name };
  employees.push(newEmployee);
  await saveEmployees(ctx.env, employees);

  return jsonResponse(newEmployee, 201);
};
