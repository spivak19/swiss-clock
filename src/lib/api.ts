import type { Employee, DailyAttendance, EmployeeStats } from '../types';

const BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json() as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function getEmployees(): Promise<Employee[]> {
  const res = await fetch(`${BASE}/employees`);
  return handleResponse<Employee[]>(res);
}

export async function createEmployee(name: string): Promise<Employee> {
  const res = await fetch(`${BASE}/employees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse<Employee>(res);
}

export async function updateEmployee(id: string, name: string): Promise<Employee> {
  const res = await fetch(`${BASE}/employees/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse<Employee>(res);
}

export async function deleteEmployee(id: string): Promise<void> {
  const res = await fetch(`${BASE}/employees/${id}`, { method: 'DELETE' });
  if (!res.ok) await handleResponse(res);
}

export async function getAttendance(date: string): Promise<DailyAttendance> {
  const res = await fetch(`${BASE}/attendance/${date}`);
  return handleResponse<DailyAttendance>(res);
}

export async function saveAttendance(
  date: string,
  data: DailyAttendance,
): Promise<void> {
  const res = await fetch(`${BASE}/attendance/${date}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  await handleResponse(res);
}

export interface StatisticsQuery {
  preset?: string;
  from?: string;
  to?: string;
}

export async function getStatistics(
  query?: StatisticsQuery,
): Promise<EmployeeStats[]> {
  const url = new URL(`${BASE}/statistics`, window.location.origin);
  if (query?.preset) url.searchParams.set('preset', query.preset);
  if (query?.from) url.searchParams.set('from', query.from);
  if (query?.to) url.searchParams.set('to', query.to);
  const res = await fetch(url.toString());
  return handleResponse<EmployeeStats[]>(res);
}

export async function getEmployeeStatistics(
  employeeId: string,
  query?: StatisticsQuery,
): Promise<EmployeeStats> {
  const url = new URL(`${BASE}/statistics/${employeeId}`, window.location.origin);
  if (query?.preset) url.searchParams.set('preset', query.preset);
  if (query?.from) url.searchParams.set('from', query.from);
  if (query?.to) url.searchParams.set('to', query.to);
  const res = await fetch(url.toString());
  return handleResponse<EmployeeStats>(res);
}
