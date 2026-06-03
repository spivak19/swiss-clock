import type { PagesFunction } from '@cloudflare/workers-types';
import {
  type Env,
  getEmployees,
  getDateRange,
  listAttendanceKeys,
  fetchAttendanceData,
  calculateEmployeeStats,
  jsonResponse,
  errorResponse,
} from '../_shared';

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const { employeeId } = ctx.params as { employeeId: string };
  const url = new URL(ctx.request.url);
  const today = new Date().toISOString().split('T')[0];
  const { from, to } = getDateRange(url.searchParams, today);

  const employees = await getEmployees(ctx.env);
  const employee = employees.find((e) => e.id === employeeId);

  if (!employee) return errorResponse('Employee not found', 404);

  const keyNames = await listAttendanceKeys(ctx.env.ATTENDANCE_KV, from, to);
  const attendanceByDate = await fetchAttendanceData(ctx.env.ATTENDANCE_KV, keyNames);

  const stats = calculateEmployeeStats(employee, attendanceByDate, today);
  return jsonResponse(stats);
};
