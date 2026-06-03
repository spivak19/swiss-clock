export interface Employee {
  id: string;
  name: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'remote';

export interface AttendanceRecord {
  arrival?: string;     // "HH:mm"
  departure?: string;   // "HH:mm"
  status?: AttendanceStatus;
  notes?: string;
}

export interface DailyAttendance {
  [employeeId: string]: AttendanceRecord;
}

export interface MonthlyData {
  month: string;        // "YYYY-MM"
  label: string;        // "Jan 2024"
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

export interface DashboardStats {
  firstArrival: { time: string; employeeName: string } | null;
  lastDeparture: { time: string; employeeName: string } | null;
  avgArrival: string | null;
  presentCount: number;
  absentCount: number;
  remoteCount: number;
  totalEmployees: number;
}

export type DatePreset = 'last30' | 'last90' | 'thisYear' | 'all' | 'custom';
