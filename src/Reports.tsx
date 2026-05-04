import { useState, useRef } from "react";
import OperatingHoursReport, { OperatingHoursReportHandle } from "./OperatingHoursReport";
import CumulativeHoursReport, { CumulativeHoursReportHandle } from "./CumulativeHoursReport";
import AlertReport, { AlertReportHandle } from "./AlertReport";

type ReportType = "operating-hours" | "cumulative-hours" | "alerts";
type AlertGranularity = "year" | "month" | "day";

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>("operating-hours");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [bins, setBins] = useState(5);

  // Alert report filters
  const [alertGranularity, setAlertGranularity] = useState<AlertGranularity>("year");
  const [alertYear, setAlertYear] = useState(new Date().getFullYear());
  const [alertMonth, setAlertMonth] = useState(new Date().getMonth() + 1);
  const [alertDay, setAlertDay] = useState(1);

  // Cumulative hours date range
  const [cumFrom, setCumFrom] = useState(() => {
    const d = new Date();
    d.setDate(1); d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });
  const [cumTo, setCumTo] = useState(() => new Date().toISOString().slice(0, 10));

  const opHoursRef = useRef<OperatingHoursReportHandle>(null);
  const cumHoursRef = useRef<CumulativeHoursReportHandle>(null);
  const alertRef = useRef<AlertReportHandle>(null);

  const handleExport = () => {
    if (reportType === "operating-hours") opHoursRef.current?.exportCsv();
    else if (reportType === "cumulative-hours") cumHoursRef.current?.exportCsv();
    else if (reportType === "alerts") alertRef.current?.exportCsv();
  };


  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const alertDaysInMonth = new Date(alertYear, alertMonth, 0).getDate();
  const alertDays = Array.from({ length: alertDaysInMonth }, (_, i) => i + 1);

  const selectCls = "px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border-2 border-gray-500 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";
  const dateCls = "px-3 py-1.5 text-sm font-mono bg-white dark:bg-gray-800 border-2 border-gray-500 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent [color-scheme:light] dark:[color-scheme:dark]";

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/50 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Fleet operating data and anomaly analytics</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-gray-500 dark:border-gray-600 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)} className={selectCls}>
            <option value="operating-hours">Operating Hours</option>
            <option value="cumulative-hours">Cumulative Hours</option>
            <option value="alerts">Alert Report</option>
          </select>

          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />

          {/* ── Operating Hours filters ── */}
          {reportType === "operating-hours" && (
            <>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectCls}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={selectCls}>
                {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </>
          )}

          {/* ── Cumulative Hours filters ── */}
          {reportType === "cumulative-hours" && (
            <>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">From</span>
              <input type="date" value={cumFrom} onChange={(e) => setCumFrom(e.target.value)} className={dateCls} />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">To</span>
              <input type="date" value={cumTo} onChange={(e) => setCumTo(e.target.value)} className={dateCls} />
              <select value={bins} onChange={(e) => setBins(Number(e.target.value))} className={selectCls}>
                {[3, 5, 8, 10, 15, 20].map((b) => (
                  <option key={b} value={b}>{b} bins</option>
                ))}
              </select>
            </>
          )}

          {/* ── Alert Report filters (progressive granularity) ── */}
          {reportType === "alerts" && (
            <>
              <select value={alertGranularity} onChange={(e) => setAlertGranularity(e.target.value as AlertGranularity)} className={selectCls}>
                <option value="year">By Year</option>
                <option value="month">By Month</option>
                <option value="day">By Day</option>
              </select>

              <select value={alertYear} onChange={(e) => setAlertYear(Number(e.target.value))} className={selectCls}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>

              {(alertGranularity === "month" || alertGranularity === "day") && (
                <select value={alertMonth} onChange={(e) => setAlertMonth(Number(e.target.value))} className={selectCls}>
                  {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              )}

              {alertGranularity === "day" && (
                <select value={alertDay} onChange={(e) => setAlertDay(Number(e.target.value))} className={selectCls}>
                  {alertDays.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
            </>
          )}

          {/* Export CSV */}
          <button
            onClick={handleExport}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-2 border-gray-500 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Report content */}
      {reportType === "operating-hours" && (
        <OperatingHoursReport ref={opHoursRef} year={year} month={month} />
      )}
      {reportType === "cumulative-hours" && (
        <CumulativeHoursReport
          ref={cumHoursRef}
          from={new Date(cumFrom + "T00:00:00").getTime()}
          to={new Date(cumTo + "T23:59:59").getTime()}
          bins={bins}
        />
      )}
      {reportType === "alerts" && (
        <AlertReport
          ref={alertRef}
          year={alertYear}
          month={alertGranularity === "month" || alertGranularity === "day" ? alertMonth : null}
          day={alertGranularity === "day" ? alertDay : null}
        />
      )}
    </div>
  );
}