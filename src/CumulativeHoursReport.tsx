import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Props {
  from: number;
  to: number;
  bins: number;
}

export interface CumulativeHoursReportHandle {
  exportCsv: () => void;
}

interface RawEntry { vehicleName: string; totalHours: number; }
interface ChartPoint {
  label: string;
  rangeFrom: number;
  rangeTo: number;
  count: number;
  cumulativePercent: number;
}

const CumulativeHoursReport = forwardRef<CumulativeHoursReportHandle, Props>(({ from, to, bins }, ref) => {
  const [rawData, setRawData] = useState<RawEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!from || !to) return;
    setLoading(true);
    const token = localStorage.getItem("jwt");
    fetch(`http://localhost:8081/api/carrier/reports/cumulative-hours?from=${from}&to=${to}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => setRawData(res.body || []))
      .catch((e) => console.error("Error fetching cumulative hours:", e))
      .finally(() => setLoading(false));
  }, [from, to]);

  // Build histogram bins from raw data
  const chartData: ChartPoint[] = (() => {
    if (rawData.length === 0) return [];

    const maxHours = Math.max(...rawData.map((d) => d.totalHours));
    const binWidth = Math.ceil(maxHours / bins) || 1;
    const totalVehicles = rawData.length;

    const buckets: ChartPoint[] = [];
    let cumulative = 0;

    for (let i = 0; i < bins; i++) {
      const rangeFrom = i * binWidth;
      const rangeTo = (i + 1) * binWidth;
      const count = rawData.filter((d) => d.totalHours >= rangeFrom && d.totalHours < rangeTo).length;
      // Last bin includes the upper bound
      const actualCount = i === bins - 1
        ? rawData.filter((d) => d.totalHours >= rangeFrom).length
        : count;

      cumulative += actualCount;
      buckets.push({
        label: `${rangeFrom}–${rangeTo}`,
        rangeFrom,
        rangeTo,
        count: actualCount,
        cumulativePercent: Math.round((cumulative / totalVehicles) * 100),
      });
    }
    return buckets;
  })();

  useImperativeHandle(ref, () => ({
    exportCsv: () => {
      if (chartData.length === 0) return;
      const header = "bin,count,cumulative_percent";
      const rows = chartData.map((d) => `${d.label},${d.count},${d.cumulativePercent}%`);
      download(`cumulative_hours_${formatDateFile(from)}_${formatDateFile(to)}.csv`, [header, ...rows].join("\n"));
    },
  }));

  const pad = (n: number) => String(n).padStart(2, "0");
  const formatDate = (ms: number) => {
    const d = new Date(ms);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };
  const formatDateFile = (ms: number) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="animate-spin h-6 w-6 text-primary-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-500 dark:border-gray-600 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Cumulative Operating Hours</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {formatDate(from)} — {formatDate(to)} · {rawData.length} vehicles · {bins} bins
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            Vehicle count
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1.5 rounded bg-amber-500" />
            Cumulative %
          </div>
        </div>
      </div>

      {rawData.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-gray-400">No data for this period</div>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              label={{ value: "Operating hours", position: "insideBottom", offset: -10, fontSize: 10, fill: "#9ca3af" }}
            />
            {/* Left Y axis: vehicle count */}
            <YAxis
              yAxisId="count"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              label={{ value: "Vehicles", angle: -90, position: "insideLeft", offset: 20, fontSize: 10, fill: "#9ca3af" }}
            />
            {/* Right Y axis: cumulative % */}
            <YAxis
              yAxisId="percent"
              orientation="right"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--tooltip-bg)", border: "1px solid var(--tooltip-border)", borderRadius: "8px", color: "var(--tooltip-text)", fontSize: "12px", padding: "8px 12px" }}
              labelStyle={{ color: "var(--tooltip-text)" }}
              itemStyle={{ color: "var(--tooltip-text)" }}
              formatter={(value, name) => {
                if (name === "count") return [`${value} vehicles`, "Count"];
                if (name === "cumulativePercent") return [`${value}%`, "Cumulative"];
                return [value, name];
              }}
              labelFormatter={(label) => `${label} hours`}
            />
            <Bar
              yAxisId="count"
              dataKey="count"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
            <Line
              yAxisId="percent"
              dataKey="cumulativePercent"
              type="monotone"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default CumulativeHoursReport;