import { NavLink } from 'react-router-dom';
import { CalendarDays, History, BarChart2, Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import type { User } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const links = [
  { to: '/', label: 'Attendance', icon: CalendarDays, end: true },
  { to: '/history', label: 'History', icon: History, end: false },
  { to: '/statistics', label: 'Statistics', icon: BarChart2, end: false },
];

export function Navigation({ user }: { user: User }) {
  const { isDark, toggle } = useTheme();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 fixed left-0 top-0 bottom-0 z-20">
        <div className="px-5 py-5 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🕐</span>
            <span className="font-bold text-lg text-gray-900 dark:text-white">SwissClock</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
          <button
            onClick={toggle}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>

          <div className="flex items-center gap-2 px-3 py-2">
            <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full" />
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{user.name}</span>
            <a href="/api/auth/logout" title="Sign out" className="text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={14} />
            </a>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-500',
              )
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
        <button
          onClick={toggle}
          className="flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium text-gray-500 dark:text-gray-500"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
          {isDark ? 'Light' : 'Dark'}
        </button>
      </nav>
    </>
  );
}
