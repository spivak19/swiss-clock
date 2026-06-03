import { useState, useCallback, useMemo } from 'react';
import { Plus, Save, RefreshCw, Search } from 'lucide-react';
import { useEmployees } from '../hooks/useEmployees';
import { useAttendance } from '../hooks/useAttendance';
import { AttendanceTable } from '../components/AttendanceTable';
import { DashboardCards } from '../components/DashboardCards';
import { Toast } from '../components/Toast';
import { EmployeeModal } from '../components/EmployeeModal';
import { getTodayString, formatDisplayDate } from '../lib/utils';
import type { AttendanceRecord } from '../types';

export function AttendancePage() {
  const [date, setDate] = useState(getTodayString);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { employees, loading: empLoading, addEmployee, updateEmployee, removeEmployee } =
    useEmployees();

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

  const handleAddEmployee = async (name: string) => {
    await addEmployee(name);
    showToast(`${name} added`);
    setShowAddModal(false);
  };

  const handleEditEmployee = async (id: string, name: string) => {
    await updateEmployee(id, name);
    showToast('Employee updated');
  };

  const handleDeleteEmployee = async (id: string) => {
    const emp = employees.find((e) => e.id === id);
    await removeEmployee(id);
    showToast(`${emp?.name ?? 'Employee'} removed`);
  };

  const loading = empLoading || attLoading;

  const filteredEmployees = useMemo(
    () =>
      search.trim() === ''
        ? employees
        : employees.filter((e) =>
            e.name.toLowerCase().includes(search.toLowerCase()),
          ),
    [employees, search],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-0.5">
            {formatDisplayDate(date)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            max={getTodayString()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setDate(getTodayString())}
            title="Jump to today"
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Dashboard cards */}
      {!loading && <DashboardCards employees={employees} attendance={attendance} />}

      {/* Actions bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search employees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="sm:hidden inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Employee
        </button>
        <div className="ml-auto flex items-center gap-2">
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
          onAddEmployee={handleAddEmployee}
          onEditEmployee={handleEditEmployee}
          onDeleteEmployee={handleDeleteEmployee}
        />
      )}

      {/* Mobile add modal */}
      {showAddModal && (
        <EmployeeModal
          mode="add"
          onSave={handleAddEmployee}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Toast */}
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
