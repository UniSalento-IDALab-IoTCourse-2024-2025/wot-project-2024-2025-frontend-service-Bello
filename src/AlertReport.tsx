import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

interface Props {
  year: number;
  month: number | null;
  day: number | null;
}

export interface AlertReportHandle {
  exportCsv: () => void;
}

interface AlertEntry { vehicleName: string; count: number; }

const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6"];

const AlertReport = forwardRef<AlertReportHandle, Props>(({ year, month, day }, ref) => {
  const [data, setData] = useState<AlertEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem("jwt");
    const params = new URLSearchParams({ year: String(year) });
    if (month !== null) params.set("month", String(month));
    if (day !== null) params.set("day", String(day));

    fetch(`http://localhost:8081/api/carrier/reports/alerts?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => setData(res.body || []))
      .catch((e) => console.error("Error fetching alert report:", e))
      .finally(() => setLoading(false));
  }, [year, month, day]);

  const total = data.reduce((sum, d) => sum + d.count, 0);

  // Period label
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let periodLabel = String(year);
  if (month !== null) {
    periodLabel = `${MONTH_NAMES[month - 1]} ${year}`;
    if (day !== null) {
      periodLabel = `${day} ${MONTH_NAMES[month - 1]} ${year}`;
    }
  }

  useImperativeHandle(ref, () => ({
    exportCsv: () => {
      if (data.length === 0) return;
      const header = "vehicle,anomalies";
      const rows = data.map((d) => `${d.vehicleName},${d.count}`);
      const suffix = [year, month?.toString().padStart(2, "0"), day?.toString().padStart(2, "0")].filter(Boolean).join("-");
      download(`alert_report_${suffix}.csv`, [header, ...rows].join("\n"));
    },
  }));

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
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Anomaly Alerts — {periodLabel}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {data.length} vehicles · {total} total anomalies · sorted by count
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-gray-400">
          No anomalies recorded for {periodLabel}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(250, data.length * 45)}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="vehicleName"
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--tooltip-bg, #fff)",
                border: "1px solid var(--tooltip-border, #e5e7eb)",
                borderRadius: "8px",
                color: "var(--tooltip-text, #111827)",
                fontSize: "12px",
                padding: "8px 12px",
              }}
              labelStyle={{ color: "var(--tooltip-text, #111827)" }}
              itemStyle={{ color: "var(--tooltip-text, #111827)" }}
              formatter={(v) => [`${v} anomalies`, "Count"]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
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

export default AlertReport;