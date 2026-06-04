import { useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useEmployees } from '../hooks/useEmployees';
import { useAttendance } from '../hooks/useAttendance';
import { AttendanceTable } from '../components/AttendanceTable';
import { Toast } from '../components/Toast';
import { getTodayString, formatDisplayDate } from '../lib/utils';
import type { AttendanceRecord } from '../types';

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function HistoryPage() {
  const today = getTodayString();
  const yesterday = addDays(today, -1);
  const [date, setDate] = useState(yesterday);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { employees, loading: empLoading } = useEmployees();
  const { attendance, loading: attLoading, saving, dirty, updateRecord, save } =
    useAttendance(date);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  const handleSave = async () => {
    try {
      await save();
      showToast('Attendance saved!');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Save failed', 'error');
    }
  };

  const loading = empLoading || attLoading;

  const filteredEmployees = useMemo(
    () => employees.filter((e) => {
      const r = attendance[e.id];
      return r?.arrival || r?.departure;
    }),
    [employees, attendance],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">History</h1>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">
          Browse and edit historical attendance records
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

      {/* Save bar */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-500">
          {loading ? '' : `${filteredEmployees.length} employee${filteredEmployees.length !== 1 ? 's' : ''} with data`}
        </span>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Save size={16} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <AttendanceTable
          employees={filteredEmployees}
          attendance={attendance}
          onUpdateRecord={(id, field, value) =>
            updateRecord(id, field as keyof AttendanceRecord, value)
          }
          onAddEmployee={async () => {}}
          onEditEmployee={async () => {}}
          onDeleteEmployee={async () => {}}
          readOnly={false}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
