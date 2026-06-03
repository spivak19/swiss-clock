import { useState, useEffect, useCallback } from 'react';
import * as api from '../lib/api';
import type { Employee } from '../types';

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getEmployees();
      setEmployees(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addEmployee = useCallback(async (name: string): Promise<Employee> => {
    const emp = await api.createEmployee(name);
    setEmployees((prev) => [...prev, emp]);
    return emp;
  }, []);

  const updateEmployee = useCallback(
    async (id: string, name: string): Promise<Employee> => {
      const emp = await api.updateEmployee(id, name);
      setEmployees((prev) => prev.map((e) => (e.id === id ? emp : e)));
      return emp;
    },
    [],
  );

  const removeEmployee = useCallback(async (id: string): Promise<void> => {
    await api.deleteEmployee(id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { employees, loading, error, refresh: load, addEmployee, updateEmployee, removeEmployee };
}
