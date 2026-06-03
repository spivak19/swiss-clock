import type { PagesFunction } from '@cloudflare/workers-types';
import {
  type Env,
  type EmployeeStats,
  getEmployees,
  getDateRange,
  listAttendanceKeys,
  fetchAttendanceData,
  calculateEmployeeStats,
  jsonResponse,
} from '../_shared';

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const today = new Date().toISOString().split('T')[0];
  const { from, to } = getDateRange(url.searchParams, today);

  const [employees, keyNames] = await Promise.all([
    getEmployees(ctx.env),
    listAttendanceKeys(ctx.env.ATTENDANCE_KV, from, to),
  ]);

  if (employees.length === 0) return jsonResponse([]);

  const attendanceByDate = await fetchAttendanceData(ctx.env.ATTENDANCE_KV, keyNames);

  const stats: EmployeeStats[] = employees.map((emp) =>
    calculateEmployeeStats(emp, attendanceByDate, today),
  );

  return jsonResponse(stats);
};
