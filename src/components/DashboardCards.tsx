import type { Employee, DailyAttendance } from '../types';
import { parseTime, minutesToTime } from '../lib/utils';
import { Clock, LogIn, LogOut, Users } from 'lucide-react';

interface Props {
  employees: Employee[];
  attendance: DailyAttendance;
}

export function DashboardCards({ employees, attendance }: Props) {
  let firstArrival: { time: number; name: string } | null = null;
  let lastDeparture: { time: number; name: string } | null = null;
  const arrivalMinutes: number[] = [];
  let presentCount = 0;

  for (const emp of employees) {
    const record = attendance[emp.id];
    if (!record?.arrival || record.status === 'absent') continue;
    presentCount++;
    const arrMins = parseTime(record.arrival);
    arrivalMinutes.push(arrMins);

    if (firstArrival === null || arrMins < firstArrival.time) {
      firstArrival = { time: arrMins, name: emp.name };
    }
    if (record.departure) {
      const depMins = parseTime(record.departure);
      if (lastDeparture === null || depMins > lastDeparture.time) {
        lastDeparture = { time: depMins, name: emp.name };
      }
    }
  }

  const avgArrival =
    arrivalMinutes.length > 0
      ? minutesToTime(Math.round(arrivalMinutes.reduce((a, b) => a + b, 0) / arrivalMinutes.length))
      : null;

  const cards = [
    {
      label: 'First Arrival',
      value: firstArrival ? minutesToTime(firstArrival.time) : '—',
      sub: firstArrival?.name ?? '',
      icon: LogIn,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Last Departure',
      value: lastDeparture ? minutesToTime(lastDeparture.time) : '—',
      sub: lastDeparture?.name ?? '',
      icon: LogOut,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: 'Avg Arrival',
      value: avgArrival ?? '—',
      sub: `${arrivalMinutes.length} recorded`,
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Present Today',
      value: `${presentCount} / ${employees.length}`,
      sub: 'employees',
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide">
              {card.label}
            </p>
            <span className={`p-1.5 rounded-lg ${card.bg}`}>
              <card.icon size={14} className={card.color} />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
          {card.sub && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 truncate">{card.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
