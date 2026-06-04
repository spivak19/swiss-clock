import { useState } from 'react';
import { Pencil, Trash2, Plus, ChevronDown } from 'lucide-react';
import type { Employee, DailyAttendance, AttendanceRecord } from '../types';
import { calculateHours, isValidTime, formatHours, cn } from '../lib/utils';
import { EmployeeModal } from './EmployeeModal';

interface Props {
  employees: Employee[];
  attendance: DailyAttendance;
  onUpdateRecord: (employeeId: string, field: keyof AttendanceRecord, value: string) => void;
  onAddEmployee: (name: string) => Promise<void>;
  onEditEmployee: (id: string, name: string) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
  readOnly?: boolean;
}

export function AttendanceTable({
  employees,
  attendance,
  onUpdateRecord,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  readOnly = false,
}: Props) {
  const [modal, setModal] = useState<
    | { type: 'add' }
    | { type: 'edit'; employee: Employee }
    | { type: 'delete'; employee: Employee }
    | null
  >(null);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [timeErrors, setTimeErrors] = useState<Record<string, string>>({});

  const toggleEmployee = (id: string) =>
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const getNow = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleTimeBlur = (employeeId: string, field: 'arrival' | 'departure', value: string) => {
    if (value && !isValidTime(value)) {
      setTimeErrors((prev) => ({ ...prev, [`${employeeId}-${field}`]: 'Invalid time' }));
      return;
    }
    setTimeErrors((prev) => {
      const next = { ...prev };
      delete next[`${employeeId}-${field}`];
      return next;
    });
  };

  const getHours = (record?: AttendanceRecord) => {
    if (!record?.arrival || !record?.departure) return null;
    if (!isValidTime(record.arrival) || !isValidTime(record.departure)) return null;
    const h = calculateHours(record.arrival, record.departure);
    return h > 0 ? h : null;
  };

  if (employees.length === 0) {
    return (
      <>
        <div className="text-center py-16">
          <p className="text-gray-400 dark:text-gray-600 mb-4">No employees yet.</p>
          {!readOnly && (
            <button
              onClick={() => setModal({ type: 'add' })}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={16} /> Add First Employee
            </button>
          )}
        </div>
        {modal?.type === 'add' && (
          <EmployeeModal mode="add" onSave={onAddEmployee} onClose={() => setModal(null)} />
        )}
      </>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {employees.map((emp) => {
          const record = attendance[emp.id];
          const hours = getHours(record);
          const isExpanded = expandedEmployees.has(emp.id);

          return (
            <div
              key={emp.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden"
            >
              {/* Collapsible header */}
              <button
                onClick={() => toggleEmployee(emp.id)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <span className="font-semibold text-gray-900 dark:text-white min-w-0 shrink-0">
                  {emp.name}
                </span>
                <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
                  <span className={cn('tabular-nums', record?.arrival ? 'text-green-600 dark:text-green-400' : 'text-gray-300 dark:text-gray-700')}>
                    {record?.arrival ?? '—'}
                  </span>
                  <span className="text-gray-300 dark:text-gray-700">→</span>
                  <span className={cn('tabular-nums', record?.departure ? 'text-red-500 dark:text-red-400' : 'text-gray-300 dark:text-gray-700')}>
                    {record?.departure ?? '—'}
                  </span>
                  {hours !== null && (
                    <span className="tabular-nums text-blue-600 dark:text-blue-400 font-medium ml-1">
                      {formatHours(hours)}
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={18}
                  className={cn(
                    'text-gray-400 transition-transform duration-200 shrink-0',
                    isExpanded && 'rotate-180',
                  )}
                />
              </button>

              {/* Expanded body */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-3">
                  {/* Time inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Arrived</label>
                      {readOnly ? (
                        <span className="text-sm text-gray-700 dark:text-gray-300">{record?.arrival || '—'}</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={record?.arrival ?? ''}
                            onChange={(e) => onUpdateRecord(emp.id, 'arrival', e.target.value)}
                            onBlur={(e) => handleTimeBlur(emp.id, 'arrival', e.target.value)}
                            className={cn(
                              'flex-1 rounded-md border text-sm px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500',
                              timeErrors[`${emp.id}-arrival`] ? 'border-red-400' : 'border-gray-200 dark:border-gray-700',
                            )}
                          />
                          <button
                            onClick={() => onUpdateRecord(emp.id, 'arrival', getNow())}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium px-1 py-1 rounded transition-colors"
                          >
                            Now
                          </button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Left</label>
                      {readOnly ? (
                        <span className="text-sm text-gray-700 dark:text-gray-300">{record?.departure || '—'}</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="time"
                            value={record?.departure ?? ''}
                            onChange={(e) => onUpdateRecord(emp.id, 'departure', e.target.value)}
                            onBlur={(e) => handleTimeBlur(emp.id, 'departure', e.target.value)}
                            className={cn(
                              'flex-1 rounded-md border text-sm px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500',
                              timeErrors[`${emp.id}-departure`] ? 'border-red-400' : 'border-gray-200 dark:border-gray-700',
                            )}
                          />
                          <button
                            onClick={() => onUpdateRecord(emp.id, 'departure', getNow())}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium px-1 py-1 rounded transition-colors"
                          >
                            Now
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {!readOnly && (
                    <input
                      type="text"
                      placeholder="Add a note…"
                      value={record?.notes ?? ''}
                      onChange={(e) => onUpdateRecord(emp.id, 'notes', e.target.value)}
                      className="w-full text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  )}

                  {/* Actions */}
                  {!readOnly && (
                    <div className="flex items-center justify-end gap-1 pt-1">
                      <button
                        onClick={() => setModal({ type: 'edit', employee: emp })}
                        title="Edit name"
                        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setModal({ type: 'delete', employee: emp })}
                        title="Delete employee"
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add employee */}
      {!readOnly && (
        <button
          onClick={() => setModal({ type: 'add' })}
          className="flex items-center gap-2 mt-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium transition-colors"
        >
          <Plus size={16} /> Add employee
        </button>
      )}

      {/* Modals */}
      {modal?.type === 'add' && (
        <EmployeeModal mode="add" onSave={onAddEmployee} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <EmployeeModal
          mode="edit"
          initialName={modal.employee.name}
          onSave={(name) => onEditEmployee(modal.employee.id, name)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'delete' && (
        <DeleteConfirmModal
          name={modal.employee.name}
          onConfirm={() => {
            void onDeleteEmployee(modal.employee.id);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

function DeleteConfirmModal({
  name,
  onConfirm,
  onClose,
}: {
  name: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Delete Employee
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
          Remove <strong>{name}</strong> from the employee list? Their historical attendance
          records will remain in the system.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
