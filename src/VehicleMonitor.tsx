import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Vehicle {
  id: string;
  name: string;
  licensePlate: string;
  model: string;
}

interface TelemetryPoint {
  id: string;
  vehicleName: string;
  timestamp: string;
  rowIndex: number;
  tAmb: number;
  tSet: number;
  tCabMeas: number;
  tEvapSat: number;
  tCondSat: number;
  pSucBar: number;
  pDisBar: number;
  nCompHz: number;
  shK: number;
  pCompW: number;
  qEvapW: number;
  cop: number;
  doorOpen: boolean;
  defrostOn: boolean;
  valveOpen: boolean;
}

type MetricKey =
  | "tAmb" | "tSet" | "tCabMeas" | "tEvapSat" | "tCondSat"
  | "pSucBar" | "pDisBar" | "nCompHz" | "shK" | "pCompW" | "qEvapW" | "cop";

interface MetricConfig {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
}

const METRICS: MetricConfig[] = [
  { key: "tCabMeas", label: "Cabin Temp",           unit: "°C",  color: "#3b82f6" },
  { key: "tAmb",     label: "Ambient Temp",          unit: "°C",  color: "#f59e0b" },
  { key: "tSet",     label: "Setpoint Temp",         unit: "°C",  color: "#10b981" },
  { key: "tEvapSat", label: "Evaporator Sat. Temp",  unit: "°C",  color: "#8b5cf6" },
  { key: "tCondSat", label: "Condenser Sat. Temp",   unit: "°C",  color: "#ef4444" },
  { key: "pSucBar",  label: "Suction Pressure",      unit: "bar", color: "#06b6d4" },
  { key: "pDisBar",  label: "Discharge Pressure",    unit: "bar", color: "#f97316" },
  { key: "nCompHz",  label: "Compressor Freq.",      unit: "Hz",  color: "#84cc16" },
  { key: "shK",      label: "Superheat",             unit: "K",   color: "#ec4899" },
  { key: "pCompW",   label: "Compressor Power",      unit: "W",   color: "#14b8a6" },
  { key: "qEvapW",   label: "Evaporator Power",      unit: "W",   color: "#a855f7" },
  { key: "cop",      label: "COP",                   unit: "-",   color: "#22c55e" },
];

const TIME_RANGES = [
  { label: "15 min", minutes: 15 },
  { label: "1h",     minutes: 60 },
  { label: "6h",     minutes: 360 },
  { label: "24h",    minutes: 1440 },
  { label: "48h",    minutes: 2880 },
];

// ─── MetricChart ─────────────────────────────────────────────────────────────

interface ChartPoint {
  time: string;
  value: number;
}

interface MetricChartProps {
  data: TelemetryPoint[];
  metricKey: MetricKey;
  timeRange: number;
}

function MetricChart({ data, metricKey, timeRange }: MetricChartProps) {
  const metric = METRICS.find((m) => m.key === metricKey)!;
  const cutoff = Date.now() - timeRange * 60 * 1000;

  const chartData: ChartPoint[] = data
    .filter((p) => new Date(p.timestamp).getTime() >= cutoff)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((p) => ({
      time: new Date(p.timestamp).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      value: p[metricKey],
    }));

  const values = chartData.map((d) => d.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const padding = (max - min) * 0.1 || 1;
  const latest = values.length ? values[values.length - 1] : null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: metric.color }} />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {metric.label}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {latest !== null ? latest.toFixed(2) : "—"}
          </span>
          <span className="text-sm text-gray-400">{metric.unit}</span>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
          No data in this time range
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={metric.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />

            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />

            <YAxis
              domain={[min - padding, max + padding]}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => v.toFixed(1)}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "none",
                borderRadius: "8px",
                color: "#f9fafb",
                fontSize: "12px",
              }}
              formatter={(v: number | undefined): [string, string] => [
                v !== undefined ? `${v.toFixed(3)} ${metric.unit}` : "—",
                metric.label,
              ]}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke={metric.color}
              strokeWidth={2}
              fill={`url(#grad-${metricKey})`}
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: metric.color }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── VehicleMonitor ──────────────────────────────────────────────────────────

export default function VehicleMonitor() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<[MetricKey, MetricKey, MetricKey]>([
    "tCabMeas", "pSucBar", "cop",
  ]);
  const [timeRange, setTimeRange] = useState(60);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const res = await fetch("/api/carrier/vehicles", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setVehicles(data.data || []);
      } catch (e) {
        console.error("Error fetching vehicles:", e);
      } finally {
        setLoadingVehicles(false);
      }
    };
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (!selectedVehicle) return;

    const fetchTelemetry = async () => {
      setLoadingTelemetry(true);
      try {
        const token = localStorage.getItem("jwt");
        const res = await fetch(`/api/carrier/telemetry/${selectedVehicle.name}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setTelemetry(data.data || []);
      } catch (e) {
        console.error("Error fetching telemetry:", e);
      } finally {
        setLoadingTelemetry(false);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 10000);
    return () => clearInterval(interval);
  }, [selectedVehicle]);

  const setMetric = (index: 0 | 1 | 2, key: MetricKey) => {
    setSelectedMetrics((prev) => {
      const next = [...prev] as [MetricKey, MetricKey, MetricKey];
      next[index] = key;
      return next;
    });
  };

  const latestPoint = telemetry.length
    ? telemetry.reduce((a, b) =>
        new Date(a.timestamp) > new Date(b.timestamp) ? a : b
      )
    : null;

  // ── Dashboard view ──────────────────────────────────────────────────────────
  if (selectedVehicle) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Top bar */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => { setSelectedVehicle(null); setTelemetry([]); }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>

          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {selectedVehicle.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedVehicle.licensePlate} · {selectedVehicle.model}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {latestPoint && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Last update: {new Date(latestPoint.timestamp).toLocaleTimeString("it-IT")}
              </span>
            )}
            {loadingTelemetry && (
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>

        {/* Status pills */}
        {latestPoint && (
          <div className="flex flex-wrap gap-2 mb-6">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              latestPoint.doorOpen
                ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                : "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
            }`}>
              Door {latestPoint.doorOpen ? "Open" : "Closed"}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              latestPoint.defrostOn
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
            }`}>
              Defrost {latestPoint.defrostOn ? "ON" : "OFF"}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              latestPoint.valveOpen
                ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
            }`}>
              Valve {latestPoint.valveOpen ? "Open" : "Closed"}
            </span>
          </div>
        )}

        {/* Time range selector */}
        <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
          {TIME_RANGES.map((r) => (
            <button
              key={r.minutes}
              onClick={() => setTimeRange(r.minutes)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                timeRange === r.minutes
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* 3 charts */}
        <div className="grid grid-cols-1 gap-4">
          {([0, 1, 2] as const).map((idx) => (
            <div key={idx}>
              <div className="mb-2">
                <select
                  value={selectedMetrics[idx]}
                  onChange={(e) => setMetric(idx, e.target.value as MetricKey)}
                  className="text-xs font-medium px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {METRICS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>
              <MetricChart
                data={telemetry}
                metricKey={selectedMetrics[idx]}
                timeRange={timeRange}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Vehicle list view ───────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vehicle Monitor</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Select a vehicle to view its telemetry dashboard
        </p>
      </div>

      {loadingVehicles ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
          <p className="text-sm">No vehicles found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {vehicles.map((vehicle) => (
            <button
              key={vehicle.id}
              onClick={() => setSelectedVehicle(vehicle)}
              className="text-left p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/40 flex items-center justify-center group-hover:bg-primary-100 dark:group-hover:bg-primary-950/60 transition-colors">
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">{vehicle.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{vehicle.licensePlate}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{vehicle.model}</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}