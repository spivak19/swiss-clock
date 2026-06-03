import { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, TrendingUp, Clock, Calendar, Award } from 'lucide-react';
import { getStatistics, getEmployeeStatistics } from '../lib/api';
import { useEmployees } from '../hooks/useEmployees';
import { ArrivalTimeChart } from '../components/charts/ArrivalTimeChart';
import { MonthlyAttendanceChart } from '../components/charts/MonthlyAttendanceChart';
import type { EmployeeStats, DatePreset } from '../types';
import { exportToCSV, getTodayString, cn, parseTime } from '../lib/utils';

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'thisYear', label: 'This year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <Icon size={16} className={color} />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export function StatisticsPage() {
  const { employees, loading: empLoading } = useEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [preset, setPreset] = useState<DatePreset>('last90');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState(getTodayString());
  const [stats, setStats] = useState<EmployeeStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query =
        preset === 'custom'
          ? { from: customFrom, to: customTo }
          : { preset };

      if (selectedEmployeeId === 'all') {
        const data = await getStatistics(query);
        setStats(data);
      } else {
        const data = await getEmployeeStatistics(selectedEmployeeId, query);
        setStats([data]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, [selectedEmployeeId, preset, customFrom, customTo]);

  useEffect(() => {
    if (!empLoading) void fetchStats();
  }, [empLoading, fetchStats]);

  const currentStats =
    selectedEmployeeId !== 'all'
      ? stats.find((s) => s.employeeId === selectedEmployeeId) ?? null
      : null;

  const displayStats = currentStats ? [currentStats] : stats;

  const leaderboard = useMemo(() => {
    if (selectedEmployeeId !== 'all' || stats.length < 2) return null;
    const withArrival = stats.filter((s) => s.avgArrival !== null);
    const withDeparture = stats.filter((s) => s.avgDeparture !== null);
    if (withArrival.length === 0) return null;

    const minBy = (arr: typeof stats, key: 'avgArrival' | 'avgDeparture') =>
      arr.reduce((a, b) => (parseTime(a[key]!) < parseTime(b[key]!) ? a : b));
    const maxBy = (arr: typeof stats, key: 'avgArrival' | 'avgDeparture') =>
      arr.reduce((a, b) => (parseTime(a[key]!) > parseTime(b[key]!) ? a : b));

    return {
      earliestArrival: minBy(withArrival, 'avgArrival'),
      latestArrival: maxBy(withArrival, 'avgArrival'),
      earliestDeparture: withDeparture.length > 0 ? minBy(withDeparture, 'avgDeparture') : null,
      latestDeparture: withDeparture.length > 0 ? maxBy(withDeparture, 'avgDeparture') : null,
    };
  }, [selectedEmployeeId, stats]);

  const handleExportCSV = () => {
    const rows = displayStats.flatMap((s) =>
      s.dailyData.map((d) => ({
        Employee: s.employeeName,
        Date: d.date,
        Status: d.status,
        Arrival: d.arrival ?? '',
        Departure: d.departure ?? '',
        Hours: d.hours !== null ? d.hours.toFixed(2) : '',
        Overtime: d.hours !== null ? Math.max(0, d.hours - 8).toFixed(2) : '',
      })),
    );
    exportToCSV(rows, `attendance-${preset}-${getTodayString()}.csv`);
  };

  const handleExportSummaryCSV = () => {
    const rows = displayStats.map((s) => ({
      Employee: s.employeeName,
      'Total Days': s.totalDays,
      'Days This Month': s.daysThisMonth,
      'Days This Year': s.daysThisYear,
      'Avg Arrival': s.avgArrival ?? '',
      'Avg Departure': s.avgDeparture ?? '',
      'Avg Hours/Day': s.avgHoursPerDay ?? '',
      'Total Overtime (h)': s.totalOvertimeHours,
      'Earliest Arrival': s.earliestArrival ?? '',
      'Latest Arrival': s.latestArrival ?? '',
    }));
    exportToCSV(rows, `stats-summary-${getTodayString()}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Statistics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Attendance insights and trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSummaryCSV}
            disabled={displayStats.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <Download size={14} /> Summary CSV
          </button>
          <button
            onClick={handleExportCSV}
            disabled={displayStats.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <Download size={14} /> Detail CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Employee</label>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Period</label>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPreset(p.value)}
                className={cn(
                  'px-3 py-2 text-xs font-medium rounded-lg border transition-colors',
                  preset === p.value
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {preset === 'custom' && (
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={customTo}
                max={getTodayString()}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Loading / error */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && displayStats.length === 0 && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          No attendance data found for the selected period.
        </div>
      )}

      {/* Overall rankings — shown when comparing all employees */}
      {!loading && !error && leaderboard && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">
            Overall Rankings
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Earliest Arrival', emp: leaderboard.earliestArrival, timeKey: 'avgArrival' as const, accent: 'text-green-600 dark:text-green-400' },
              { label: 'Latest Arrival', emp: leaderboard.latestArrival, timeKey: 'avgArrival' as const, accent: 'text-orange-500 dark:text-orange-400' },
              { label: 'Earliest Departure', emp: leaderboard.earliestDeparture, timeKey: 'avgDeparture' as const, accent: 'text-blue-600 dark:text-blue-400' },
              { label: 'Latest Departure', emp: leaderboard.latestDeparture, timeKey: 'avgDeparture' as const, accent: 'text-red-500 dark:text-red-400' },
            ].map(({ label, emp, timeKey, accent }) =>
              emp ? (
                <div key={label} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{label}</p>
                  <p className={`text-2xl font-bold tabular-nums ${accent}`}>{emp[timeKey]}</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1 truncate">{emp.employeeName}</p>
                </div>
              ) : null,
            )}
          </div>

          {/* Average times per employee */}
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Arrival</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Departure</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                {stats
                  .filter((s) => s.avgArrival !== null)
                  .sort((a, b) => parseTime(a.avgArrival!) - parseTime(b.avgArrival!))
                  .map((s) => (
                    <tr key={s.employeeId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{s.employeeName}</td>
                      <td className="px-4 py-2.5 tabular-nums text-green-600 dark:text-green-400 font-medium">{s.avgArrival}</td>
                      <td className="px-4 py-2.5 tabular-nums text-red-500 dark:text-red-400 font-medium">{s.avgDeparture ?? '—'}</td>
                      <td className="px-4 py-2.5 tabular-nums text-gray-500">{s.totalDays}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading &&
        !error &&
        displayStats.map((s) => (
          <div key={s.employeeId} className="space-y-5">
            {selectedEmployeeId === 'all' && (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
                {s.employeeName}
              </h2>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard
                label="Total Days"
                value={String(s.totalDays)}
                sub="in period"
                icon={Calendar}
                color="text-blue-600 dark:text-blue-400"
              />
              <StatCard
                label="This Month"
                value={String(s.daysThisMonth)}
                sub="days"
                icon={Calendar}
                color="text-blue-600 dark:text-blue-400"
              />
              <StatCard
                label="This Year"
                value={String(s.daysThisYear)}
                sub="days"
                icon={TrendingUp}
                color="text-green-600 dark:text-green-400"
              />
              <StatCard
                label="Avg Arrival"
                value={s.avgArrival ?? '—'}
                sub={
                  s.earliestArrival
                    ? `earliest ${s.earliestArrival}`
                    : undefined
                }
                icon={Clock}
                color="text-green-600 dark:text-green-400"
              />
              <StatCard
                label="Avg Departure"
                value={s.avgDeparture ?? '—'}
                sub={
                  s.latestDeparture ? `latest ${s.latestDeparture}` : undefined
                }
                icon={Clock}
                color="text-red-600 dark:text-red-400"
              />
              <StatCard
                label="Avg Hours/Day"
                value={s.avgHoursPerDay !== null ? `${s.avgHoursPerDay}h` : '—'}
                sub={
                  s.totalOvertimeHours > 0
                    ? `+${s.totalOvertimeHours}h overtime`
                    : undefined
                }
                icon={Award}
                color="text-purple-600 dark:text-purple-400"
              />
            </div>

            {/* Extremes row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Earliest Arrival', value: s.earliestArrival ?? '—' },
                { label: 'Latest Arrival', value: s.latestArrival ?? '—' },
                { label: 'Earliest Departure', value: s.earliestDeparture ?? '—' },
                { label: 'Latest Departure', value: s.latestDeparture ?? '—' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4"
                >
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    {item.label}
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Arrival & Departure Times
                </h3>
                <ArrivalTimeChart dailyData={s.dailyData} />
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Monthly Attendance
                </h3>
                <MonthlyAttendanceChart monthlyData={s.monthlyData} />
              </div>
            </div>

            {/* Recent activity table */}
            {s.dailyData.length > 0 && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Recent Days
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        {['Date', 'Status', 'Arrival', 'Departure', 'Hours', 'Overtime'].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {s.dailyData
                        .slice()
                        .reverse()
                        .slice(0, 30)
                        .map((d) => (
                          <tr
                            key={d.date}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                          >
                            <td className="px-4 py-2.5 text-gray-900 dark:text-white font-medium">
                              {d.date}
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className={cn(
                                  'text-xs font-medium px-2 py-0.5 rounded-full',
                                  d.status === 'present' &&
                                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                                  d.status === 'absent' &&
                                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                                  d.status === 'remote' &&
                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                                )}
                              >
                                {d.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 tabular-nums">
                              {d.arrival ?? '—'}
                            </td>
                            <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 tabular-nums">
                              {d.departure ?? '—'}
                            </td>
                            <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 tabular-nums">
                              {d.hours !== null ? `${d.hours.toFixed(1)}h` : '—'}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums">
                              {d.hours !== null && d.hours > 8 ? (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  +{(d.hours - 8).toFixed(1)}h
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
