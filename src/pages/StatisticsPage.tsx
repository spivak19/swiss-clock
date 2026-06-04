import { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, Clock, Calendar, Award, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getStatistics, getEmployeeStatistics } from '../lib/api';
import { useEmployees } from '../hooks/useEmployees';
import type { EmployeeStats, DatePreset } from '../types';
import { exportToCSV, getTodayString, cn, formatHours, parseTime } from '../lib/utils';

const WORK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'] as const;

function getWorkWeekDates(todayStr: string, offsetWeeks = 0): string[] {
  const today = new Date(todayStr + 'T00:00:00');
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + offsetWeeks * 7);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
}

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
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [weekOffset, setWeekOffset] = useState(0);

  const toggleEmployee = (id: string) =>
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

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
    const withHours = stats.filter((s) => s.avgHoursPerDay !== null);
    if (withHours.length === 0) return null;

    return {
      longestDay: withHours.reduce((a, b) => (a.avgHoursPerDay! > b.avgHoursPerDay! ? a : b)),
      shortestDay: withHours.reduce((a, b) => (a.avgHoursPerDay! < b.avgHoursPerDay! ? a : b)),
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
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Longest Avg Day', emp: leaderboard.longestDay, value: leaderboard.longestDay?.avgHoursPerDay != null ? formatHours(leaderboard.longestDay.avgHoursPerDay) : undefined, accent: 'text-purple-600 dark:text-purple-400' },
              { label: 'Shortest Avg Day', emp: leaderboard.shortestDay, value: leaderboard.shortestDay?.avgHoursPerDay != null ? formatHours(leaderboard.shortestDay.avgHoursPerDay) : undefined, accent: 'text-gray-600 dark:text-gray-400' },
            ].map(({ label, emp, value, accent }) =>
              emp && value ? (
                <div key={label} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{label}</p>
                  <p className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1 truncate">{emp.employeeName}</p>
                </div>
              ) : null,
            )}
          </div>

          {/* Average times per employee */}
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Avg Arrival</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Avg Departure</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Avg Day</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Days</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">This Week</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                {(() => {
                  const weekDates = new Set(getWorkWeekDates(getTodayString(), weekOffset));
                  return stats
                    .filter((s) => s.avgArrival !== null)
                    .sort((a, b) => parseTime(a.avgArrival!) - parseTime(b.avgArrival!))
                    .map((s) => {
                      const weekHours = s.dailyData
                        .filter((d) => weekDates.has(d.date))
                        .reduce((sum, d) => sum + (d.hours ?? 0), 0);
                      return (
                        <tr key={s.employeeId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{s.employeeName}</td>
                          <td className="px-4 py-2.5 tabular-nums text-green-600 dark:text-green-400 font-medium">{s.avgArrival}</td>
                          <td className="px-4 py-2.5 tabular-nums text-red-500 dark:text-red-400 font-medium">{s.avgDeparture ?? '—'}</td>
                          <td className="px-4 py-2.5 tabular-nums text-purple-600 dark:text-purple-400 font-medium">{s.avgHoursPerDay != null ? formatHours(s.avgHoursPerDay) : '—'}</td>
                          <td className="px-4 py-2.5 tabular-nums text-gray-500">{s.totalDays}</td>
                          <td className="px-4 py-2.5 tabular-nums text-blue-600 dark:text-blue-400 font-medium">{weekHours > 0 ? formatHours(weekHours) : '—'}</td>
                        </tr>
                      );
                    });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-employee collapsible cards */}
      {!loading && !error && displayStats.length > 0 && (() => {
        const weekDates = getWorkWeekDates(getTodayString(), weekOffset);
        const weekLabel = `${weekDates[0].slice(5).replace('-', '/')} – ${weekDates[4].slice(5).replace('-', '/')}`;
        const weekTitle = weekOffset === 0 ? 'Current Week' : weekOffset === -1 ? 'Last Week' : weekOffset < 0 ? `${Math.abs(weekOffset)} Weeks Ago` : `Week +${weekOffset}`;
        return (
          <div className="space-y-2">
            {displayStats.map((s) => {
              const isExpanded = expandedEmployees.has(s.employeeId);
              const byDate = new Map(s.dailyData.map((d) => [d.date, d]));
              const weekData = weekDates.map((date) => ({ date, record: byDate.get(date) ?? null }));
              const weekTotal = weekData.reduce((sum, { record }) => sum + (record?.hours ?? 0), 0);

              return (
                <div
                  key={s.employeeId}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden"
                >
                  {/* Toggle header */}
                  <button
                    onClick={() => toggleEmployee(s.employeeId)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {s.employeeName}
                    </span>
                    <ChevronDown
                      size={20}
                      className={cn(
                        'text-gray-400 transition-transform duration-200',
                        isExpanded && 'rotate-180',
                      )}
                    />
                  </button>

                  {/* Collapsible body */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-800 p-5 space-y-5">

                      {/* Current week table */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setWeekOffset((o) => o - 1)}
                              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              <ChevronLeft size={14} />
                            </button>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                              {weekTitle}
                            </h3>
                            <button
                              onClick={() => setWeekOffset((o) => o + 1)}
                              disabled={weekOffset >= 0}
                              className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                          <span className="text-xs text-gray-400">{weekLabel}</span>
                        </div>
                        <div className="grid grid-cols-5 divide-x divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                          {weekData.map(({ date, record }, i) => (
                            <div key={date} className="p-3 text-center bg-gray-50/50 dark:bg-gray-800/20">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                {WORK_DAYS[i]}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-600 mb-2">
                                {date.slice(5).replace('-', '/')}
                              </p>
                              {record ? (
                                <>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                                    {record.arrival ?? '—'}
                                  </p>
                                  <p className="text-xs text-gray-400 my-0.5">↓</p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                                    {record.departure ?? '—'}
                                  </p>
                                  {record.hours != null && (
                                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-2">
                                      {formatHours(record.hours)}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-sm text-gray-300 dark:text-gray-700">—</p>
                              )}
                            </div>
                          ))}
                        </div>
                        {weekTotal > 0 && (
                          <p className="text-right text-sm font-semibold text-blue-600 dark:text-blue-400 mt-2">
                            Week total: {formatHours(weekTotal)}
                          </p>
                        )}
                      </div>

                      {/* Stat cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatCard
                          label="This Month"
                          value={String(s.daysThisMonth)}
                          sub="days"
                          icon={Calendar}
                          color="text-blue-600 dark:text-blue-400"
                        />
                        <StatCard
                          label="Avg Arrival"
                          value={s.avgArrival ?? '—'}
                          sub={s.earliestArrival ? `earliest ${s.earliestArrival}` : undefined}
                          icon={Clock}
                          color="text-green-600 dark:text-green-400"
                        />
                        <StatCard
                          label="Avg Departure"
                          value={s.avgDeparture ?? '—'}
                          sub={s.latestDeparture ? `latest ${s.latestDeparture}` : undefined}
                          icon={Clock}
                          color="text-red-600 dark:text-red-400"
                        />
                        <StatCard
                          label="Avg Hours/Day"
                          value={s.avgHoursPerDay !== null ? `${s.avgHoursPerDay}h` : '—'}
                          sub={s.totalOvertimeHours > 0 ? `+${s.totalOvertimeHours}h overtime` : undefined}
                          icon={Award}
                          color="text-purple-600 dark:text-purple-400"
                        />
                      </div>

                      {/* Extremes */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: 'Earliest Arrival', value: s.earliestArrival ?? '—' },
                          { label: 'Latest Arrival', value: s.latestArrival ?? '—' },
                          { label: 'Earliest Departure', value: s.earliestDeparture ?? '—' },
                          { label: 'Latest Departure', value: s.latestDeparture ?? '—' },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4"
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

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
