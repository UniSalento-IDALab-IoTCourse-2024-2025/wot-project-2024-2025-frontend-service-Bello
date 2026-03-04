import { useState, useEffect, useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

interface Vehicle {
  id: string;
  vehicleName: string;
  refrigerated: boolean;
  width: number;
  height: number;
  length: number;
  maxWeight: number;
  pricePerKm: number;
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

type BooleanKey = "doorOpen" | "defrostOn" | "valveOpen";

interface MetricConfig {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  category: "temperature" | "pressure" | "performance";
}

interface BooleanConfig {
  key: BooleanKey;
  label: string;
  onLabel: string;
  offLabel: string;
  color: string;
  category: "states";
}

interface NumericChartPoint { ts: number; value: number | null; }
interface BooleanChartPoint { ts: number; value: number | null; }

/* ═══════════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════════ */

const METRICS: MetricConfig[] = [
  { key: "tCabMeas", label: "Cabin Temp",      unit: "°C",  color: "#3b82f6", category: "temperature" },
  { key: "tAmb",     label: "Ambient Temp",     unit: "°C",  color: "#f59e0b", category: "temperature" },
  { key: "tSet",     label: "Setpoint Temp",    unit: "°C",  color: "#10b981", category: "temperature" },
  { key: "tEvapSat", label: "Evap. Sat. Temp",  unit: "°C",  color: "#8b5cf6", category: "temperature" },
  { key: "tCondSat", label: "Cond. Sat. Temp",  unit: "°C",  color: "#ef4444", category: "temperature" },
  { key: "pSucBar",  label: "Suction Press.",   unit: "bar", color: "#06b6d4", category: "pressure" },
  { key: "pDisBar",  label: "Discharge Press.", unit: "bar", color: "#f97316", category: "pressure" },
  { key: "nCompHz",  label: "Compressor Freq.", unit: "Hz",  color: "#84cc16", category: "performance" },
  { key: "shK",      label: "Superheat",        unit: "K",   color: "#ec4899", category: "performance" },
  { key: "pCompW",   label: "Compressor Power", unit: "W",   color: "#14b8a6", category: "performance" },
  { key: "qEvapW",   label: "Evaporator Power", unit: "W",   color: "#a855f7", category: "performance" },
  { key: "cop",      label: "COP",              unit: "–",   color: "#22c55e", category: "performance" },
];

const BOOLEAN_METRICS: BooleanConfig[] = [
  { key: "doorOpen",  label: "Door",    onLabel: "Open",   offLabel: "Closed", color: "#ef4444", category: "states" },
  { key: "defrostOn", label: "Defrost", onLabel: "ON",     offLabel: "OFF",    color: "#3b82f6", category: "states" },
  { key: "valveOpen", label: "Valve",   onLabel: "Open",   offLabel: "Closed", color: "#8b5cf6", category: "states" },
];

const CATEGORIES = [
  { id: "temperature" as const, label: "Temperatures", icon: "🌡️" },
  { id: "pressure" as const,    label: "Pressures",    icon: "⏲️" },
  { id: "performance" as const, label: "Performance",  icon: "⚡" },
  { id: "states" as const,      label: "States",       icon: "🔘" },
];





/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

function insertGapPoints<T extends { ts: number }>(
  sorted: T[],
  gapThresholdMs: number,
  makeGap: (ts: number) => T
): T[] {
  if (sorted.length < 2) return sorted;
  const result: T[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].ts - sorted[i - 1].ts > gapThresholdMs) {
      result.push(makeGap(sorted[i - 1].ts + 1));
      result.push(makeGap(sorted[i].ts - 1));
    }
    result.push(sorted[i]);
  }
  return result;
}

function formatTimeTick(ts: number, rangeMs: number): string {
  const d = new Date(ts);
  const rangeMinutes = rangeMs / 60000;
  if (rangeMinutes <= 60)
    return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  if (rangeMinutes <= 1440)
    return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return (
    d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
  );
}

function formatTooltipTime(ts: number): string {
  const d = new Date(ts);
  return (
    d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
    " — " +
    d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MetricChart
   ═══════════════════════════════════════════════════════════════════════════ */

function MetricChart({
  data, metricKey, fromMs, toMs,
}: {
  data: TelemetryPoint[];
  metricKey: MetricKey;
  fromMs: number;
  toMs: number;
}) {
  const metric = METRICS.find((m) => m.key === metricKey)!;
  const rangeMs = toMs - fromMs;

  const chartData = useMemo(() => {
    const sorted: NumericChartPoint[] = data
      .map((p) => ({ ts: new Date(p.timestamp).getTime(), value: p[metricKey] as number }))
      .filter((p) => p.ts >= fromMs && p.ts <= toMs)
      .sort((a, b) => a.ts - b.ts);

    // Auto-detect gap: if two points are >3× the median interval apart, break the line
    if (sorted.length < 2) return sorted;
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) intervals.push(sorted[i].ts - sorted[i - 1].ts);
    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    const autoGap = median * 3;

    return insertGapPoints(sorted, autoGap, (ts) => ({ ts, value: null }));
  }, [data, metricKey, fromMs, toMs]);

  const realValues = chartData.map((d) => d.value).filter((v): v is number => v !== null);
  const min = realValues.length ? Math.min(...realValues) : 0;
  const max = realValues.length ? Math.max(...realValues) : 1;
  const padding = (max - min) * 0.15 || 1;
  const latest = realValues.length ? realValues[realValues.length - 1] : null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-500 dark:border-gray-600 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: metric.color }} />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{metric.label}</span>
        <div className="flex items-baseline gap-1 ml-auto">
          <span className="text-lg font-bold text-gray-900 dark:text-white font-mono tabular-nums">
            {latest !== null ? latest.toFixed(2) : "—"}
          </span>
          <span className="text-xs text-gray-400">{metric.unit}</span>
        </div>
      </div>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">No data in this range</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metric.color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} vertical={false} />
            <XAxis dataKey="ts" type="number" scale="time" domain={[fromMs, toMs]}
              tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
              tickFormatter={(v: number) => formatTimeTick(v, rangeMs)} />
            <YAxis domain={[min - padding, max + padding]}
              tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
              tickFormatter={(v: number) => v.toFixed(1)} />
            <Tooltip
              contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f9fafb", fontSize: "12px", padding: "8px 12px" }}
              labelFormatter={(v) => formatTooltipTime(Number(v))}
              formatter={(v) => [v != null ? `${Number(v).toFixed(3)} ${metric.unit}` : "No data", metric.label]} />
            <Area type="monotone" dataKey="value" stroke={metric.color} strokeWidth={2}
              fill={`url(#grad-${metricKey})`} isAnimationActive={false} dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: metric.color }} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BooleanChart
   ═══════════════════════════════════════════════════════════════════════════ */

function BooleanChart({
  data, booleanKey, fromMs, toMs,
}: {
  data: TelemetryPoint[];
  booleanKey: BooleanKey;
  fromMs: number;
  toMs: number;
}) {
  const config = BOOLEAN_METRICS.find((m) => m.key === booleanKey)!;
  const rangeMs = toMs - fromMs;

  const chartData = useMemo(() => {
    const sorted: BooleanChartPoint[] = data
      .map((p) => ({ ts: new Date(p.timestamp).getTime(), value: p[booleanKey] ? 1 : 0 }))
      .filter((p) => p.ts >= fromMs && p.ts <= toMs)
      .sort((a, b) => a.ts - b.ts);

    if (sorted.length < 2) return sorted;
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) intervals.push(sorted[i].ts - sorted[i - 1].ts);
    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    const autoGap = median * 3;

    return insertGapPoints(sorted, autoGap, (ts) => ({ ts, value: null }));
  }, [data, booleanKey, fromMs, toMs]);

  const realValues = chartData.filter((d) => d.value !== null);
  const currentValue = realValues.length > 0 ? realValues[realValues.length - 1].value : null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-500 dark:border-gray-600 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{config.label}</span>
        <span className="ml-auto">
          {currentValue !== null && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              currentValue === 1
                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
            }`}>{currentValue === 1 ? config.onLabel : config.offLabel}</span>
          )}
        </span>
      </div>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center h-[100px] text-sm text-gray-400">No data in this range</div>
      ) : (
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${booleanKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={config.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.3} vertical={false} />
            <XAxis dataKey="ts" type="number" scale="time" domain={[fromMs, toMs]}
              tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
              tickFormatter={(v: number) => formatTimeTick(v, rangeMs)} />
            <YAxis domain={[-0.1, 1.1]} ticks={[0, 1]}
              tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false}
              tickFormatter={(v: number) => (v === 1 ? config.onLabel : v === 0 ? config.offLabel : "")} />
            <Tooltip
              contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", color: "#f9fafb", fontSize: "12px", padding: "8px 12px" }}
              labelFormatter={(v) => formatTooltipTime(Number(v))}
              formatter={(v) => [v != null ? (Number(v) === 1 ? config.onLabel : config.offLabel) : "No data", config.label]} />
            <Area type="stepAfter" dataKey="value" stroke={config.color} strokeWidth={2}
              fill={`url(#grad-${booleanKey})`} isAnimationActive={false} dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: config.color }} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   VehicleMonitor
   ═══════════════════════════════════════════════════════════════════════════ */

export default function VehicleMonitor() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  // Time range as absolute from/to in ms
  const [fromMs, setFromMs] = useState(() => Date.now() - 60 * 60 * 1000);
  const [toMs, setToMs] = useState(() => Date.now());
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(
    new Set(["temperature", "pressure", "performance", "states"])
  );

  // ── Fetch vehicles ──
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const res = await fetch("http://localhost:8081/api/carrier/vehicles", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setVehicles(data.body || []);
      } catch (e) {
        console.error("Error fetching vehicles:", e);
      } finally {
        setLoadingVehicles(false);
      }
    };
    fetchVehicles();
  }, []);

  // ── Fetch telemetry (manual) ──
  const fetchTelemetry = useCallback(async () => {
    if (!selectedVehicle) return;
    setLoadingTelemetry(true);
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(
        `http://localhost:8081/api/carrier/telemetry/${selectedVehicle.vehicleName}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setTelemetry(data.body || []);
    } catch (e) {
      console.error("Error fetching telemetry:", e);
    } finally {
      setLoadingTelemetry(false);
    }
  }, [selectedVehicle]);

  useEffect(() => {
    if (selectedVehicle) fetchTelemetry();
  }, [selectedVehicle, fetchTelemetry]);

  // ── Derived ──
  const toggleCategory = (cat: string) => {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) { if (next.size > 1) next.delete(cat); }
      else next.add(cat);
      return next;
    });
  };

  const visibleNumericMetrics = METRICS.filter((m) => visibleCategories.has(m.category));
  const showBooleans = visibleCategories.has("states");

  // Only show refrigerated vehicles (telemetry is only relevant for refrigerated units)
  const refrigeratedVehicles = vehicles.filter((v) => v.refrigerated);

  /* ═══════════════════════════════════════════════════════════════════════
     Dashboard View
     ═══════════════════════════════════════════════════════════════════════ */
  /* ── Helpers for date/time inputs ── */
  const fromDate = new Date(fromMs);
  const toDate = new Date(toMs);

  const pad = (n: number) => String(n).padStart(2, "0");

  const fromDateStr = `${fromDate.getFullYear()}-${pad(fromDate.getMonth() + 1)}-${pad(fromDate.getDate())}`;
  const fromTimeStr = `${pad(fromDate.getHours())}:${pad(fromDate.getMinutes())}`;
  const toDateStr = `${toDate.getFullYear()}-${pad(toDate.getMonth() + 1)}-${pad(toDate.getDate())}`;
  const toTimeStr = `${pad(toDate.getHours())}:${pad(toDate.getMinutes())}`;

  const updateFrom = (dateStr: string, timeStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [h, min] = timeStr.split(":").map(Number);
    setFromMs(new Date(y, m - 1, d, h, min).getTime());
  };

  const updateTo = (dateStr: string, timeStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [h, min] = timeStr.split(":").map(Number);
    setToMs(new Date(y, m - 1, d, h, min).getTime());
  };

  const handleHourInput = (value: string, currentMin: string, setter: (date: string, time: string) => void, dateStr: string) => {
    const clean = value.replace(/\D/g, "").slice(0, 2);
    if (clean.length === 1 && parseInt(clean) > 2) return "";
    if (clean.length === 2 && parseInt(clean) > 23) return clean[0];
    if (clean.length === 2) {
      setter(dateStr, `${clean}:${currentMin}`);
    }
    return clean;
  };

  const handleMinuteInput = (value: string, currentHour: string, setter: (date: string, time: string) => void, dateStr: string) => {
    const clean = value.replace(/\D/g, "").slice(0, 2);
    if (clean.length === 1 && parseInt(clean) > 5) return "";
    if (clean.length === 2 && parseInt(clean) > 59) return clean[0];
    if (clean.length === 2) {
      setter(dateStr, `${currentHour}:${clean}`);
    }
    return clean;
  };

  const [fromHourInput, setFromHourInput] = useState(pad(fromDate.getHours()));
  const [fromMinInput, setFromMinInput] = useState(pad(fromDate.getMinutes()));
  const [toHourInput, setToHourInput] = useState(pad(toDate.getHours()));
  const [toMinInput, setToMinInput] = useState(pad(toDate.getMinutes()));

  // Keep local inputs in sync
  useEffect(() => { setFromHourInput(pad(new Date(fromMs).getHours())); setFromMinInput(pad(new Date(fromMs).getMinutes())); }, [fromMs]);
  useEffect(() => { setToHourInput(pad(new Date(toMs).getHours())); setToMinInput(pad(new Date(toMs).getMinutes())); }, [toMs]);

  const inputCls = "px-3 py-1.5 text-sm font-mono bg-white dark:bg-gray-900 border-2 border-gray-500 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent [color-scheme:light] dark:[color-scheme:dark]";

  // Don't allow future dates (no sensor data exists)
  const now = new Date();
  const maxDateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  if (selectedVehicle) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-200 dark:bg-gray-950">

        {/* ── Toolbar ────────────────────────────────────────────────── */}
        <div className="sticky top-16 z-10 bg-white dark:bg-gray-900 border-b-2 border-gray-500 dark:border-gray-600 px-4 sm:px-6">
          {/* Row 1: Navigation + Vehicle + Refresh */}
          <div className="flex items-center gap-3 py-3 border-b border-gray-200 dark:border-gray-700/50">
            <button
              onClick={() => { setSelectedVehicle(null); setTelemetry([]); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Vehicles
            </button>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
            <h1 className="text-sm font-bold text-gray-900 dark:text-white">{selectedVehicle.vehicleName}</h1>
            <div className="flex-1" />
            <button
              onClick={fetchTelemetry}
              disabled={loadingTelemetry}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-2 border-gray-500 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${loadingTelemetry ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Row 2: Time range + Category filters */}
          <div className="flex flex-wrap items-center gap-3 py-3">
            {/* Date/time range */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">From</span>
              <input
                type="date"
                value={fromDateStr}
                max={maxDateStr}
                onChange={(e) => updateFrom(e.target.value, fromTimeStr)}
                className={inputCls + " w-[150px]"}
              />
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="HH"
                  maxLength={2}
                  value={fromHourInput}
                  onChange={(e) => {
                    const v = handleHourInput(e.target.value, fromMinInput, updateFrom, fromDateStr);
                    if (v !== undefined) setFromHourInput(v);
                  }}
                  onBlur={() => setFromHourInput(pad(new Date(fromMs).getHours()))}
                  className={inputCls + " w-[52px] text-center"}
                />
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM"
                  maxLength={2}
                  value={fromMinInput}
                  onChange={(e) => {
                    const v = handleMinuteInput(e.target.value, fromHourInput, updateFrom, fromDateStr);
                    if (v !== undefined) setFromMinInput(v);
                  }}
                  onBlur={() => setFromMinInput(pad(new Date(fromMs).getMinutes()))}
                  className={inputCls + " w-[52px] text-center"}
                />
              </div>

              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-2">To</span>
              <input
                type="date"
                value={toDateStr}
                max={maxDateStr}
                onChange={(e) => updateTo(e.target.value, toTimeStr)}
                className={inputCls + " w-[150px]"}
              />
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="HH"
                  maxLength={2}
                  value={toHourInput}
                  onChange={(e) => {
                    const v = handleHourInput(e.target.value, toMinInput, updateTo, toDateStr);
                    if (v !== undefined) setToHourInput(v);
                  }}
                  onBlur={() => setToHourInput(pad(new Date(toMs).getHours()))}
                  className={inputCls + " w-[52px] text-center"}
                />
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM"
                  maxLength={2}
                  value={toMinInput}
                  onChange={(e) => {
                    const v = handleMinuteInput(e.target.value, toHourInput, updateTo, toDateStr);
                    if (v !== undefined) setToMinInput(v);
                  }}
                  onBlur={() => setToMinInput(pad(new Date(toMs).getMinutes()))}
                  className={inputCls + " w-[52px] text-center"}
                />
              </div>
            </div>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

            {/* Category filter */}
            <div className="flex gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors ${
                    visibleCategories.has(cat.id)
                      ? "bg-white dark:bg-gray-800 border-gray-500 dark:border-gray-600 text-gray-900 dark:text-white"
                      : "bg-transparent border-gray-400 dark:border-gray-600 text-gray-400 dark:text-gray-500"
                  }`}
                >{cat.icon} {cat.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Charts (full width) ────────────────────────────────────── */}
        <div className="p-4 sm:p-6">
          {telemetry.length === 0 && !loadingTelemetry ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
              <p className="text-sm font-medium">No telemetry data available</p>
              <p className="text-xs mt-1">Press Refresh to load data</p>
            </div>
          ) : (
            <>
              {visibleNumericMetrics.length > 0 && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
                  {visibleNumericMetrics.map((metric) => (
                    <MetricChart key={metric.key} data={telemetry} metricKey={metric.key} fromMs={fromMs} toMs={toMs} />
                  ))}
                </div>
              )}
              {showBooleans && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {BOOLEAN_METRICS.map((bm) => (
                    <BooleanChart key={bm.key} data={telemetry} booleanKey={bm.key} fromMs={fromMs} toMs={toMs} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Vehicle List View
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/50 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Vehicle Monitor</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Select a refrigerated vehicle to view its telemetry dashboard</p>
        </div>
      </div>

      {loadingVehicles ? (
        <div className="text-center py-16">
          <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">Loading vehicles...</p>
        </div>
      ) : refrigeratedVehicles.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-500 dark:border-gray-600">
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No vehicles found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-500 dark:border-gray-600 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-400 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/30">
                  <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3.5">Vehicle</th>
                  <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3.5">Dimensions</th>
                  <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3.5 whitespace-nowrap">Max Capacity</th>
                  <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3.5">Price/km</th>
                  <th className="px-4 py-3.5"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 dark:divide-gray-600/60">
                {refrigeratedVehicles.map((vehicle) => (
                  <tr key={vehicle.id} onClick={() => setSelectedVehicle(vehicle)} className="group hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4.5 h-4.5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                          </svg>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{vehicle.vehicleName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">{(vehicle.length / 100).toFixed(2)} &times; {(vehicle.width / 100).toFixed(2)} &times; {(vehicle.height / 100).toFixed(2)}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">m</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{vehicle.maxWeight}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">kg</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">&euro;{vehicle.pricePerKm.toFixed(2)}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-0.5">/km</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <svg className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors inline-block" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-300 dark:divide-gray-600/60">
            {refrigeratedVehicles.map((vehicle) => (
              <div key={vehicle.id} onClick={() => setSelectedVehicle(vehicle)} className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                      </svg>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{vehicle.vehicleName}</span>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Size</p>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-0.5">{(vehicle.length / 100).toFixed(2)}&times;{(vehicle.width / 100).toFixed(2)}&times;{(vehicle.height / 100).toFixed(2)} <span className="text-[10px] text-gray-400">m</span></p>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Max Capacity</p>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-0.5">{vehicle.maxWeight} kg</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">€/km</p>
                    <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mt-0.5">€{vehicle.pricePerKm.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}