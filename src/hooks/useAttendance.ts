import { useState, useEffect, useCallback } from 'react';
import * as api from '../lib/api';
import type { DailyAttendance, AttendanceRecord } from '../types';

export function useAttendance(date: string) {
  const [attendance, setAttendance] = useState<DailyAttendance>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDirty(false);

    api
      .getAttendance(date)
      .then((data) => {
        if (!cancelled) setAttendance(data);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load attendance');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date]);

  const updateRecord = useCallback(
    (employeeId: string, field: keyof AttendanceRecord, value: string) => {
      setAttendance((prev) => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [field]: value,
        },
      }));
      setDirty(true);
    },
    [],
  );

  const setRecord = useCallback(
    (employeeId: string, record: AttendanceRecord) => {
      setAttendance((prev) => ({ ...prev, [employeeId]: record }));
      setDirty(true);
    },
    [],
  );

  const save = useCallback(async (): Promise<void> => {
    setSaving(true);
    try {
      await api.saveAttendance(date, attendance);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [date, attendance]);

  return {
    attendance,
    loading,
    saving,
    error,
    dirty,
    updateRecord,
    setRecord,
    save,
  };
}
