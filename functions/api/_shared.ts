export interface Employee {
  id: string;
  name: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'remote';

export interface AttendanceRecord {
  arrival?: string;
  departure?: string;
  status?: AttendanceStatus;
  notes?: string;
}

export interface DailyAttendance {
  [employeeId: string]: AttendanceRecord;
}

export interface MonthlyData {
  month: string;
  label: string;
  daysAttended: number;
  avgArrival: string | null;
  avgDeparture: string | null;
}

export interface DailyData {
  date: string;
  arrival: string | null;
  departure: string | null;
  status: string;
  hours: number | null;
}

export interface EmployeeStats {
  employeeId: string;
  employeeName: string;
  totalDays: number;
  daysThisMonth: number;
  daysThisYear: number;
  avgArrival: string | null;
  avgDeparture: string | null;
  earliestArrival: string | null;
  latestArrival: string | null;
  earliestDeparture: string | null;
  latestDeparture: string | null;
  avgHoursPerDay: number | null;
  totalOvertimeHours: number;
  monthlyData: MonthlyData[];
  dailyData: DailyData[];
}

export interface Env {
  ATTENDANCE_KV: KVNamespace;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

export interface UserSession {
  email: string;
  name: string;
  picture: string;
}

export function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  return match ? match[1] : null;
}

export async function getSession(
  kv: KVNamespace,
  token: string,
): Promise<UserSession | null> {
  return kv.get<UserSession>(`session:${token}`, 'json');
}

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

export function errorResponse(message: string, status = 400): Response {
  return Response.json({ error: message }, { status, headers: CORS_HEADERS });
}

export async function getEmployees(env: Env): Promise<Employee[]> {
  const data = await env.ATTENDANCE_KV.get<Employee[]>('employees', 'json');
  return data ?? [];
}

export async function saveEmployees(env: Env, employees: Employee[]): Promise<void> {
  await env.ATTENDANCE_KV.put('employees', JSON.stringify(employees));
}

export function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function getMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function getDateRange(
  searchParams: URLSearchParams,
  today: string,
): { from: string; to: string } {
  const preset = searchParams.get('preset');

  if (preset === 'last30') {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    return { from: d.toISOString().split('T')[0], to: today };
  }
  if (preset === 'last90') {
    const d = new Date(today);
    d.setDate(d.getDate() - 90);
    return { from: d.toISOString().split('T')[0], to: today };
  }
  if (preset === 'thisYear') {
    return { from: `${today.slice(0, 4)}-01-01`, to: today };
  }

  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (from && to) return { from, to };

  return { from: '2000-01-01', to: today };
}

export async function listAttendanceKeys(
  kv: KVNamespace,
  from: string,
  to: string,
): Promise<string[]> {
  const keys: string[] = [];
  let cursor: string | undefined;

  do {
    const result = await kv.list({ prefix: 'attendance:', cursor, limit: 1000 });
    for (const key of result.keys) {
      const date = key.name.slice('attendance:'.length);
      if (date >= from && date <= to) keys.push(key.name);
    }
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return keys;
}

export async function fetchAttendanceData(
  kv: KVNamespace,
  keyNames: string[],
): Promise<Map<string, DailyAttendance>> {
  const result = new Map<string, DailyAttendance>();
  const batchSize = 100;

  for (let i = 0; i < keyNames.length; i += batchSize) {
    const batch = keyNames.slice(i, i + batchSize);
    const values = await Promise.all(batch.map((k) => kv.get(k)));
    for (let j = 0; j < batch.length; j++) {
      const value = values[j];
      if (value) {
        try {
          const date = batch[j].slice('attendance:'.length);
          result.set(date, JSON.parse(value) as DailyAttendance);
        } catch {
          // skip malformed records
        }
      }
    }
  }

  return result;
}

export function calculateEmployeeStats(
  employee: Employee,
  attendanceByDate: Map<string, DailyAttendance>,
  today: string,
): EmployeeStats {
  const thisMonth = today.slice(0, 7);
  const thisYear = today.slice(0, 4);

  let totalDays = 0;
  let daysThisMonth = 0;
  let daysThisYear = 0;

  const arrivalMins: number[] = [];
  const departureMins: number[] = [];
  const hoursPerDay: number[] = [];

  const monthlyMap = new Map<string, { days: number; arrivals: number[]; departures: number[] }>();
  const dailyData: DailyData[] = [];

  const sortedDates = Array.from(attendanceByDate.keys()).sort();

  for (const date of sortedDates) {
    const dayData = attendanceByDate.get(date)!;
    const record = dayData[employee.id];
    if (!record) continue;

    const month = date.slice(0, 7);
    const year = date.slice(0, 4);

    if (record.status === 'absent') {
      dailyData.push({ date, arrival: null, departure: null, status: 'absent', hours: null });
      continue;
    }

    if (!record.arrival && !record.departure) continue;

    totalDays++;
    if (month === thisMonth) daysThisMonth++;
    if (year === thisYear) daysThisYear++;

    const arrMins = record.arrival ? parseTime(record.arrival) : null;
    const depMins = record.departure ? parseTime(record.departure) : null;

    if (arrMins !== null) arrivalMins.push(arrMins);
    if (depMins !== null) departureMins.push(depMins);

    let hours: number | null = null;
    if (arrMins !== null && depMins !== null) {
      hours = (depMins - arrMins) / 60;
      hoursPerDay.push(hours);
    }

    dailyData.push({
      date,
      arrival: record.arrival ?? null,
      departure: record.departure ?? null,
      status: record.status ?? 'present',
      hours,
    });

    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { days: 0, arrivals: [], departures: [] });
    }
    const entry = monthlyMap.get(month)!;
    entry.days++;
    if (arrMins !== null) entry.arrivals.push(arrMins);
    if (depMins !== null) entry.departures.push(depMins);
  }

  const monthlyData: MonthlyData[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      label: getMonthLabel(month),
      daysAttended: data.days,
      avgArrival: data.arrivals.length > 0 ? minutesToTime(Math.round(avg(data.arrivals))) : null,
      avgDeparture:
        data.departures.length > 0 ? minutesToTime(Math.round(avg(data.departures))) : null,
    }));

  const totalOvertime = hoursPerDay.reduce((sum, h) => sum + Math.max(0, h - 8), 0);

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    totalDays,
    daysThisMonth,
    daysThisYear,
    avgArrival: arrivalMins.length > 0 ? minutesToTime(Math.round(avg(arrivalMins))) : null,
    avgDeparture: departureMins.length > 0 ? minutesToTime(Math.round(avg(departureMins))) : null,
    earliestArrival: arrivalMins.length > 0 ? minutesToTime(Math.min(...arrivalMins)) : null,
    latestArrival: arrivalMins.length > 0 ? minutesToTime(Math.max(...arrivalMins)) : null,
    earliestDeparture: departureMins.length > 0 ? minutesToTime(Math.min(...departureMins)) : null,
    latestDeparture: departureMins.length > 0 ? minutesToTime(Math.max(...departureMins)) : null,
    avgHoursPerDay:
      hoursPerDay.length > 0 ? Math.round(avg(hoursPerDay) * 100) / 100 : null,
    totalOvertimeHours: Math.round(totalOvertime * 100) / 100,
    monthlyData,
    dailyData,
  };
}
