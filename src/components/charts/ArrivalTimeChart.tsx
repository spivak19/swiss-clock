import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DailyData } from '../../types';
import { parseTime, minutesToTime } from '../../lib/utils';

interface Props {
  dailyData: DailyData[];
  maxPoints?: number;
}

interface ChartPoint {
  date: string;
  label: string;
  arrival: number | null;
  departure: number | null;
}

function formatTick(minutes: number): string {
  return minutesToTime(minutes);
}

function formatTooltipDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function ArrivalTimeChart({ dailyData, maxPoints = 60 }: Props) {
  const filtered = dailyData
    .filter((d) => d.arrival !== null)
    .slice(-maxPoints);

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-600 text-sm">
        No data to display
      </div>
    );
  }

  const data: ChartPoint[] = filtered.map((d) => ({
    date: d.date,
    label: d.date.slice(5), // MM-DD
    arrival: d.arrival ? parseTime(d.arrival) : null,
    departure: d.departure ? parseTime(d.departure) : null,
  }));

  const allMinutes = data
    .flatMap((d) => [d.arrival, d.departure])
    .filter((v): v is number => v !== null);
  const minY = Math.max(0, (Math.min(...allMinutes) - 30) - ((Math.min(...allMinutes) - 30) % 30));
  const maxY = Math.min(1440, (Math.max(...allMinutes) + 30) + (30 - (Math.max(...allMinutes) + 30) % 30));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'currentColor' }}
          className="text-gray-500"
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={formatTick}
          domain={[minY, maxY]}
          tick={{ fontSize: 11, fill: 'currentColor' }}
          className="text-gray-500"
          width={45}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            minutesToTime(value),
            name === 'arrival' ? 'Arrival' : 'Departure',
          ]}
          labelFormatter={(_label: unknown, payload) => {
            const p = payload as Array<{ payload?: ChartPoint }> | undefined;
            if (p?.[0]?.payload) return formatTooltipDate(p[0].payload.date);
            return String(_label);
          }}
          contentStyle={{
            fontSize: 12,
            borderRadius: '8px',
          }}
        />
        <Legend
          formatter={(v) => (v === 'arrival' ? 'Arrival' : 'Departure')}
        />
        <Line
          type="monotone"
          dataKey="arrival"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="departure"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
