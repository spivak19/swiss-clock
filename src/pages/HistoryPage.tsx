import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, LogIn, LogOut } from 'lucide-react';
import { useEmployees } from '../hooks/useEmployees';
import { useAttendance } from '../hooks/useAttendance';
import { getTodayString, formatDisplayDate, calculateHours, isValidTime, formatHours } from '../lib/utils';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function HistoryPage() {
  const today = getTodayString();
  const yesterday = addDays(today, -1);
  const [date, setDate] = useState(yesterday);

  const { employees, loading: empLoading } = useEmployees();
  const { attendance, loading: attLoading } = useAttendance(date);

  const loading = empLoading || attLoading;

  const presentEmployees = useMemo(
    () => employees.filter((e) => {
      const r = attendance[e.id];
      return r?.arrival || r?.departure;
    }),
    [employees, attendance],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">History</h1>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">
          Browse historical attendance records
        </p>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <button
          onClick={() => setDate((d) => addDays(d, -1))}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            {formatDisplayDate(date)}
          </span>
        </div>

        <button
          onClick={() => setDate((d) => addDays(d, 1))}
          disabled={date >= today}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : presentEmployees.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          No attendance data for this day.
        </div>
      ) : (
        <div className="space-y-3">
          {presentEmployees.map((emp) => {
            const record = attendance[emp.id];
            const arrival = record?.arrival ?? null;
            const departure = record?.departure ?? null;
            const hours =
              arrival && departure && isValidTime(arrival) && isValidTime(departure)
                ? calculateHours(arrival, departure)
                : null;

            return (
              <div
                key={emp.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                    {emp.name}
                  </span>
                </div>

                {/* Times + hours */}
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <LogIn size={18} className="text-green-500 shrink-0" />
                    <span className="text-2xl font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                      {arrival ?? '—'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <LogOut size={18} className="text-red-400 shrink-0" />
                    <span className="text-2xl font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                      {departure ?? '—'}
                    </span>
                  </div>

                  {hours !== null && hours > 0 && (
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-blue-500 shrink-0" />
                      <span className="text-2xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                        {formatHours(hours)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
