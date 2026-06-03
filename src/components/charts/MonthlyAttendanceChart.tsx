import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { MonthlyData } from '../../types';

interface Props {
  monthlyData: MonthlyData[];
}

export function MonthlyAttendanceChart({ monthlyData }: Props) {
  if (monthlyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-600 text-sm">
        No data to display
      </div>
    );
  }

  const maxDays = Math.max(...monthlyData.map((d) => d.daysAttended), 1);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={monthlyData}
        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'currentColor' }}
          className="text-gray-500"
          interval={0}
          angle={-30}
          textAnchor="end"
          height={45}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'currentColor' }}
          className="text-gray-500"
          allowDecimals={false}
          domain={[0, maxDays + 1]}
          width={30}
        />
        <Tooltip
          formatter={(value: number) => [value, 'Days attended']}
          contentStyle={{ fontSize: 12, borderRadius: '8px' }}
        />
        <Bar dataKey="daysAttended" radius={[4, 4, 0, 0]}>
          {monthlyData.map((_entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={`hsl(${220 + (index * 15) % 60}, 70%, 55%)`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
