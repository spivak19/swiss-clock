import type { PagesFunction } from '@cloudflare/workers-types';
import { type Env, type DailyAttendance, parseTime, jsonResponse, errorResponse } from '../_shared';

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date + 'T00:00:00'));
}

function isValidTime(time: string): boolean {
  return /^([0-1]\d|2[0-3]):([0-5]\d)$/.test(time);
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { date } = ctx.params as { date: string };

  if (!isValidDate(date)) return errorResponse('Invalid date format. Use YYYY-MM-DD');

  const data = await ctx.env.ATTENDANCE_KV.get<DailyAttendance>(
    `attendance:${date}`,
    'json',
  );
  return jsonResponse(data ?? {});
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  const { date } = ctx.params as { date: string };

  if (!isValidDate(date)) return errorResponse('Invalid date format. Use YYYY-MM-DD');

  let body: DailyAttendance;
  try {
    body = await ctx.request.json<DailyAttendance>();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  for (const [employeeId, record] of Object.entries(body)) {
    if (!employeeId) continue;
    if (record.arrival && !isValidTime(record.arrival)) {
      return errorResponse(`Invalid arrival time for employee ${employeeId}`);
    }
    if (record.departure && !isValidTime(record.departure)) {
      return errorResponse(`Invalid departure time for employee ${employeeId}`);
    }
    if (record.arrival && record.departure) {
      if (parseTime(record.departure) < parseTime(record.arrival)) {
        return errorResponse(
          `Departure cannot be before arrival for employee ${employeeId}`,
        );
      }
    }
  }

  await ctx.env.ATTENDANCE_KV.put(`attendance:${date}`, JSON.stringify(body));
  return jsonResponse({ saved: true });
};
