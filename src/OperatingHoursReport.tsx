import { useState, useEffect, useImperativeHandle, forwardRef } from "react";

interface Props {
  year: number;
  month: number;
}

export interface OperatingHoursReportHandle {
  exportCsv: () => void;
}

interface VehicleDays { vehicleName: string; activeDays: number[]; }
interface VehicleHours { vehicleName: string; activeHours: number[]; }

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const OperatingHoursReport = forwardRef<OperatingHoursReportHandle, Props>(({ year, month }, ref) => {
  const [monthlyData, setMonthlyData] = useState<VehicleDays[]>([]);
  const [dailyData, setDailyData] = useState<VehicleHours[] | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const isDailyView = selectedDay !== null && dailyData !== null;

  useEffect(() => {
    setLoading(true);
    setDailyData(null);
    setSelectedDay(null);
    const token = localStorage.getItem("jwt");
    fetch(`http://localhost:8081/api/carrier/reports/operating-hours/monthly?year=${year}&month=${month}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => setMonthlyData(res.body || []))
      .catch((e) => console.error("Error fetching operating hours:", e))
      .finally(() => setLoading(false));
  }, [year, month]);

  const handleDayClick = (day: number) => {
    if (selectedDay === day) {
      setSelectedDay(null);
      setDailyData(null);
      return;
    }
    setSelectedDay(day);
    const token = localStorage.getItem("jwt");
    fetch(`http://localhost:8081/api/carrier/reports/operating-hours/daily?year=${year}&month=${month}&day=${day}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => setDailyData(res.body || []))
      .catch((e) => console.error("Error fetching daily drill-down:", e));
  };

  // CSV export
  useImperativeHandle(ref, () => ({
    exportCsv: () => {
      if (isDailyView && dailyData) {
        const header = ["vehicle", ...hours.map((h) => String(h).padStart(2, "0"))].join(",");
        const rows = dailyData.map((v) => {
          const activeSet = new Set(v.activeHours);
          return [v.vehicleName, ...hours.map((h) => activeSet.has(h) ? "1" : "0")].join(",");
        });
        download(`operating_hours_${year}-${String(month).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}.csv`, [header, ...rows].join("\n"));
      } else {
        const header = ["vehicle", ...days.map((d) => String(d))].join(",");
        const rows = monthlyData.map((v) => {
          const activeSet = new Set(v.activeDays);
          return [v.vehicleName, ...days.map((d) => activeSet.has(d) ? "1" : "0")].join(",");
        });
        download(`operating_hours_${year}-${String(month).padStart(2, "0")}.csv`, [header, ...rows].join("\n"));
      }
    },
  }));

  const vehicles = monthlyData.map((v) => v.vehicleName);
  const dailyMap = new Map<string, Set<number>>();
  if (dailyData) {
    dailyData.forEach((v) => dailyMap.set(v.vehicleName, new Set(v.activeHours)));
  }

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

  if (monthlyData.length === 0) {
    return <div className="text-center py-12 text-sm text-gray-400">No operating data for {MONTH_NAMES[month - 1]} {year}</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-500 dark:border-gray-600 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {MONTH_NAMES[month - 1]} {year}
          {isDailyView && (
            <span className="text-gray-400 dark:text-gray-500 font-normal ml-2">
              — Day {selectedDay} hourly detail
            </span>
          )}
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-emerald-500 border border-emerald-600" />
            Active
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-700 border border-gray-400 dark:border-gray-500" />
            Inactive
          </div>
        </div>
      </div>

      {/* Day pills (always visible) */}
      <div className="flex items-center gap-0.5 mb-1 overflow-x-auto">
        <div className="min-w-[100px] flex-shrink-0" />
        {days.map((d) => (
          <button
            key={d}
            onClick={() => handleDayClick(d)}
            className={`w-7 h-7 rounded-full text-[10px] font-medium transition-colors flex-shrink-0 border ${
              d === selectedDay
                ? "bg-primary-600 text-white border-primary-700"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-400 dark:border-gray-500 hover:bg-primary-100 dark:hover:bg-primary-900/30"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Hour labels row (only in daily view) */}
      {isDailyView && (
        <div className="flex items-center gap-0.5 mb-1 overflow-x-auto">
          <div className="min-w-[100px] flex-shrink-0" />
          {hours.map((h) => (
            <div key={h} className="w-7 flex-shrink-0 text-center">
              <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400">
                {String(h).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="overflow-x-auto">
        {vehicles.map((vehicleName) => {
          const monthlyEntry = monthlyData.find((v) => v.vehicleName === vehicleName);
          const activeDaysSet = new Set(monthlyEntry?.activeDays || []);
          const activeHoursSet = dailyMap.get(vehicleName) || new Set();
          const columns = isDailyView ? hours : days;

          return (
            <div key={vehicleName} className="flex items-center gap-0.5 py-0.5">
              <div className="min-w-[100px] flex-shrink-0 pr-3">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate block">
                  {vehicleName}
                </span>
              </div>
              {columns.map((col) => {
                const isActive = isDailyView
                  ? activeHoursSet.has(col)
                  : activeDaysSet.has(col);

                return (
                  <div
                    key={col}
                    className={`w-7 h-5 rounded-sm flex-shrink-0 transition-colors border ${
                      isActive
                        ? "bg-emerald-500 border-emerald-600 hover:bg-emerald-600"
                        : "bg-gray-100 dark:bg-gray-700 border-gray-400 dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                    } ${!isDailyView ? "cursor-pointer" : ""}`}
                    onClick={!isDailyView ? () => handleDayClick(col) : undefined}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
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

export default OperatingHoursReport;