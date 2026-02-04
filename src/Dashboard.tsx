import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface TelemetryData {
  T_amb: number;
  T_set: number;
  T_cab: number;
  T_evap_sat: number;
  T_cond_sat: number;
  P_suc_bar: number;
  P_dis_bar: number;
  N_comp_Hz: number;
  SH_K: number;
  P_comp_W: number;
  Q_evap_W: number;
  COP: number;
  frost_level: number;
  T_cab_meas: number;
  valve_open: number;
  time_min: number;
  run_id: number;
  fault: string;
  fault_id: number;
  door_open: number;
  defrost_on: number;
  vehicle_name?: string;
  timestamp?: string;
  row_index?: number;
  stream_status?: string; // ✅ NUOVO: "running" | "completed"
  message?: string; // ✅ NUOVO: Messaggio descrittivo opzionale
}

interface ChartDataPoint {
  idx: number;
  time: number;
  value: number | null;
  label: string;
  fault: string;
  fault_id: number;
  rawData?: TelemetryData;
}

// Mapping dei fault con colori
const FAULT_COLORS: { [key: string]: string } = {
  'NORMAL': '#10b981',
  'COND_FOUL_MILD': '#f59e0b',
  'COND_FOUL_SEVERE': '#f97316',
  'EVAP_FAN_DEG': '#eab308',
  'EVAP_FAN_FAIL': '#ef4444',
  'UNDERCHARGE_MILD': '#fb923c',
  'UNDERCHARGE_SEVERE': '#dc2626',
  'OVERCHARGE': '#7c3aed',
  'SENSOR_DRIFT_PLUS': '#06b6d4',
  'SENSOR_DRIFT_MINUS': '#0891b2',
  'COMP_INEFFICIENCY': '#ec4899',
  'NON_CONDENSABLES': '#a855f7',
  'UNDERCHARGE_AND_COND_FOUL': '#d946ef',
};

const FAULT_LABELS: { [key: number]: string } = {
  0: 'NORMAL',
  1: 'COND_FOUL_MILD',
  2: 'COND_FOUL_SEVERE',
  3: 'EVAP_FAN_DEG',
  4: 'EVAP_FAN_FAIL',
  5: 'UNDERCHARGE_MILD',
  6: 'UNDERCHARGE_SEVERE',
  7: 'OVERCHARGE',
  8: 'SENSOR_DRIFT_PLUS',
  9: 'SENSOR_DRIFT_MINUS',
  10: 'COMP_INEFFICIENCY',
  11: 'NON_CONDENSABLES',
  12: 'UNDERCHARGE_AND_COND_FOUL',
};

// Formattazione intelligente basata sul valore
const formatValue = (value: any, unit: string): string => {
  if (value === null || value === undefined) return 'N/A';
  
  if (typeof value === 'boolean') {
    return value ? 'ON' : 'OFF';
  }
  
  if (typeof value === 'number') {
    if (unit === 'bool') {
      return value ? 'ON' : 'OFF';
    }
    
    if (unit === '%') {
      return (value * 100).toFixed(1) + '%';
    }
    
    if (Math.abs(value) < 0.01 && unit !== 'Hz') {
      return value.toFixed(4);
    }
    
    if (unit === 'C') {
      return value.toFixed(2);
    }
    
    if (unit === 'bar') {
      return value.toFixed(3);
    }
    
    if (unit === 'W') {
      return value.toFixed(1);
    }
    
    if (unit === 'Hz') {
      return value.toFixed(2);
    }
    
    return value.toFixed(2);
  }
  
  return String(value);
};

const Dashboard: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeVehicle, setActiveVehicle] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<keyof TelemetryData>('T_cab');
  const [rawDataHistory, setRawDataHistory] = useState<ChartDataPoint[]>([]);
  const [latestData, setLatestData] = useState<TelemetryData | null>(null);
  const [yAxisDomain, setYAxisDomain] = useState<[number, number]>([0, 100]);
  const [streamCompleted, setStreamCompleted] = useState(false); // ✅ NUOVO
  const maxDataPoints = 60;
  const dataCounterRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Tutte le metriche disponibili
  const metrics: Array<{ key: keyof TelemetryData; label: string; unit: string; color: string }> = [
    // Temperatures
    { key: 'T_cab', label: 'Cabin Temperature', unit: 'C', color: '#00ff00' },
    { key: 'T_cab_meas', label: 'Cabin Temperature (Measured)', unit: 'C', color: '#00ff00' },
    { key: 'T_set', label: 'Set Temperature', unit: 'C', color: '#00ffff' },
    { key: 'T_amb', label: 'Ambient Temperature', unit: 'C', color: '#ffff00' },
    { key: 'T_evap_sat', label: 'Evaporator Saturation Temp', unit: 'C', color: '#ff00ff' },
    { key: 'T_cond_sat', label: 'Condenser Saturation Temp', unit: 'C', color: '#ff6600' },
    
    // Pressures
    { key: 'P_suc_bar', label: 'Suction Pressure', unit: 'bar', color: '#00ffff' },
    { key: 'P_dis_bar', label: 'Discharge Pressure', unit: 'bar', color: '#ff00ff' },
    
    // Compressor
    { key: 'N_comp_Hz', label: 'Compressor Frequency', unit: 'Hz', color: '#00ff00' },
    { key: 'P_comp_W', label: 'Compressor Power', unit: 'W', color: '#00ffff' },
    
    // Thermodynamics
    { key: 'SH_K', label: 'Superheat', unit: 'K', color: '#ff6600' },
    { key: 'Q_evap_W', label: 'Evaporator Power', unit: 'W', color: '#00ffff' },
    { key: 'COP', label: 'Coefficient of Performance', unit: '-', color: '#00ff00' },
    
    // Status
    { key: 'frost_level', label: 'Frost Level', unit: '%', color: '#6699ff' },
    { key: 'valve_open', label: 'Valve Opening', unit: '%', color: '#ff00ff' },
    { key: 'door_open', label: 'Door Open', unit: 'bool', color: '#ff0000' },
    { key: 'defrost_on', label: 'Defrost Active', unit: 'bool', color: '#00ffff' },
    
    // Other
    { key: 'run_id', label: 'Run ID', unit: '-', color: '#ff00ff' },
    { key: 'fault_id', label: 'Fault ID', unit: '-', color: '#ff0000' },
  ];

  const getMetricColor = () => {
    const metric = metrics.find(m => m.key === selectedMetric);
    return metric?.color || '#00ff00';
  };

  const getMetricUnit = () => {
    const metric = metrics.find(m => m.key === selectedMetric);
    return metric?.unit || '';
  };

  const getFaultColor = (fault_id: number): string => {
    const faultName = FAULT_LABELS[fault_id] || 'NORMAL';
    return FAULT_COLORS[faultName] || FAULT_COLORS['NORMAL'];
  };

  // Inizializza con slot vuoti
  useEffect(() => {
    const initialData: ChartDataPoint[] = Array.from({ length: maxDataPoints }, (_, i) => ({
      idx: i,
      time: 0,
      value: null,
      label: `${i}`,
      fault: 'NORMAL',
      fault_id: 0,
      rawData: undefined,
    }));
    setRawDataHistory(initialData);
    dataCounterRef.current = 0;
  }, []);

  // Connessione WebSocket
  useEffect(() => {
    console.log('🔌 WebSocket connection attempt...');
    const ws = new WebSocket('ws://localhost:8081/ws/telemetry');

    ws.onopen = () => {
      console.log('✅ WebSocket CONNECTED');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: TelemetryData = JSON.parse(event.data);
        
        // ✅ NUOVO: Controlla se lo stream è terminato
        if (data.stream_status === 'completed') {
          console.log('🏁 STREAM COMPLETATO - Dashboard');
          console.log(`   Message: ${data.message || 'Dataset esaurito'}`);
          
          // Mostra banner di completamento
          setStreamCompleted(true);
          setIsConnected(false);
          
          // Auto-hide dopo 10 secondi
          setTimeout(() => {
            setStreamCompleted(false);
            setActiveVehicle(null);
          }, 10000);
          
          return;
        }
        
        // Normale processing dei dati
        console.log('📊 Data received:', data.vehicle_name, '- Time:', data.time_min);

        setLatestData(data);
        setActiveVehicle(data.vehicle_name || 'Unknown');

        // Salva i dati RAW completi
        setRawDataHistory((prevData) => {
          const newPoint: ChartDataPoint = {
            idx: dataCounterRef.current,
            time: data.time_min || 0,
            value: 0,
            label: `${Math.floor(data.time_min || 0)}m`,
            fault: data.fault || 'NORMAL',
            fault_id: data.fault_id || 0,
            rawData: data,
          };

          dataCounterRef.current += 1;

          const updated = [...prevData.slice(1), newPoint];
          return updated;
        });
      } catch (e) {
        console.error('❌ Error parsing data:', e);
      }
    };

    ws.onclose = () => {
      console.log('⛔ WebSocket DISCONNECTED');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket ERROR:', error);
    };

    wsRef.current = ws;

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  // Calcola chartData dalla rawDataHistory basandosi sulla metrica selezionata
  const chartData = React.useMemo(() => {
    return rawDataHistory.map(point => {
      if (!point.rawData) {
        return { ...point, value: null };
      }
      
      const metricValue = Number(point.rawData[selectedMetric]) || 0;
      return {
        ...point,
        value: Number(metricValue.toFixed(2)),
      };
    });
  }, [rawDataHistory, selectedMetric]);

  // Calcola Y-axis domain basato sui dati visualizzati
  useEffect(() => {
    const validValues = chartData
      .filter(p => p.value !== null)
      .map(p => p.value as number);
    
    if (validValues.length > 0) {
      const min = Math.min(...validValues);
      const max = Math.max(...validValues);
      const padding = (max - min) * 0.1 || 5;
      
      setYAxisDomain([
        Math.floor(min - padding),
        Math.ceil(max + padding)
      ]);
    }
  }, [chartData]);

  const currentMetric = metrics.find(m => m.key === selectedMetric);
  const currentValue = latestData ? (latestData[selectedMetric] || 0) : 0;
  const currentFault = latestData ? (latestData.fault || 'NORMAL') : 'N/A';
  const currentFaultColor = latestData ? getFaultColor(latestData.fault_id || 0) : '#10b981';

  const filledPoints = chartData.filter(p => p.value !== null).length;

  const validValues = chartData.filter(p => p.value !== null).map(p => p.value as number);
  const minValue = validValues.length > 0 ? Math.min(...validValues) : 0;
  const maxValue = validValues.length > 0 ? Math.max(...validValues) : 0;
  const avgValue = validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : 0;

  const generateGridLines = () => {
    const lines = [];
    const range = yAxisDomain[1] - yAxisDomain[0];
    const step = range / 4;
    
    for (let i = 1; i < 4; i++) {
      lines.push(yAxisDomain[0] + step * i);
    }
    return lines;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* ✅ NUOVO: Banner di completamento stream */}
      {streamCompleted && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-bold">🏁 Stream Completed!</p>
              <p className="text-sm">All telemetry data transmitted successfully</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Real-Time Telemetry Dashboard</h1>
          
          {/* Status */}
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            {activeVehicle && (
              <div className="px-4 py-2 bg-blue-600 rounded-lg text-sm">
                Vehicle: <strong>{activeVehicle}</strong>
              </div>
            )}
            {latestData && (
              <div className="px-4 py-2 rounded-lg text-sm flex items-center gap-2" style={{ backgroundColor: currentFaultColor, color: '#fff' }}>
                <div className="w-2 h-2 rounded-full bg-white"></div>
                Fault: <strong>{currentFault}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Metric Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Metric
              </label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as keyof TelemetryData)}
                className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <optgroup label="Temperatures">
                  {metrics.filter(m => ['T_cab', 'T_cab_meas', 'T_set', 'T_amb', 'T_evap_sat', 'T_cond_sat'].includes(m.key as string)).map((metric) => (
                    <option key={metric.key} value={metric.key}>
                      {metric.label} ({metric.unit})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Pressures">
                  {metrics.filter(m => ['P_suc_bar', 'P_dis_bar'].includes(m.key as string)).map((metric) => (
                    <option key={metric.key} value={metric.key}>
                      {metric.label} ({metric.unit})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Compressor">
                  {metrics.filter(m => ['N_comp_Hz', 'P_comp_W', 'SH_K', 'Q_evap_W', 'COP'].includes(m.key as string)).map((metric) => (
                    <option key={metric.key} value={metric.key}>
                      {metric.label} ({metric.unit})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Status">
                  {metrics.filter(m => ['frost_level', 'valve_open', 'door_open', 'defrost_on'].includes(m.key as string)).map((metric) => (
                    <option key={metric.key} value={metric.key}>
                      {metric.label} ({metric.unit})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Other">
                  {metrics.filter(m => ['run_id', 'fault_id'].includes(m.key as string)).map((metric) => (
                    <option key={metric.key} value={metric.key}>
                      {metric.label} ({metric.unit})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Current Value - Task Manager Style */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Current Value
              </label>
              <div className="px-4 py-3 rounded-lg bg-black border border-gray-600 flex items-center justify-between h-12">
                <span className="text-sm font-semibold truncate text-gray-400">{currentMetric?.label}</span>
                <div className="text-right">
                  <span className="text-3xl font-bold" style={{ color: getMetricColor() }}>
                    {formatValue(currentValue, getMetricUnit())}
                  </span>
                  <span className="text-sm text-gray-400 ml-1">{getMetricUnit()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Task Manager Style Chart */}
        <div className="bg-black rounded-lg p-4 border-2 border-gray-700 relative">
          {/* Chart Title Bar */}
          <div className="flex justify-between items-center mb-2 px-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getMetricColor() }}></div>
              <span className="text-sm font-medium text-gray-300">{currentMetric?.label}</span>
            </div>
            <div className="text-xs text-gray-500">
              60 minutes
            </div>
          </div>

          {/* Main Chart Container */}
          <div className="relative bg-[#0a0a0a] rounded border border-gray-800" style={{ height: '350px' }}>
            {/* Y-Axis Labels on the right side (Task Manager style) */}
            <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 py-2 z-10">
              <span>{yAxisDomain[1]}</span>
              <span>{Math.round((yAxisDomain[1] + yAxisDomain[0]) / 2)}</span>
              <span>{yAxisDomain[0]}</span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={chartData}
                margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
              >
                {/* Gradient Definition */}
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getMetricColor()} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={getMetricColor()} stopOpacity={0.05}/>
                  </linearGradient>
                </defs>

                {/* Grid - Task Manager Style */}
                <CartesianGrid 
                  strokeDasharray="0" 
                  stroke="#1a3a1a" 
                  strokeWidth={1}
                  horizontal={true}
                  vertical={true}
                />

                {/* Reference lines for better grid visibility */}
                {generateGridLines().map((value, index) => (
                  <ReferenceLine
                    key={index}
                    y={value}
                    stroke="#1a3a1a"
                    strokeWidth={1}
                  />
                ))}

                <XAxis 
                  dataKey="idx"
                  stroke="#333"
                  tick={false}
                  axisLine={{ stroke: '#333' }}
                />
                
                <YAxis 
                  domain={yAxisDomain}
                  stroke="#333"
                  tick={false}
                  axisLine={{ stroke: '#333' }}
                  width={10}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => {
                    if (value === null) return ['No Data', ''];
                    return [formatValue(value, getMetricUnit()) + ' ' + getMetricUnit(), currentMetric?.label];
                  }}
                  labelFormatter={() => ''}
                  cursor={{ stroke: getMetricColor(), strokeWidth: 1, strokeDasharray: '3 3' }}
                />

                {/* Area with gradient fill - Task Manager style */}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={getMetricColor()}
                  strokeWidth={1.5}
                  fill="url(#colorValue)"
                  isAnimationActive={false}
                  connectNulls
                  dot={false}
                  activeDot={{
                    r: 4,
                    stroke: getMetricColor(),
                    strokeWidth: 2,
                    fill: '#000'
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Bar - Task Manager Style */}
          <div className="mt-4 grid grid-cols-4 gap-4 text-center">
            <div className="bg-gray-900 rounded p-3 border border-gray-800">
              <div className="text-xs text-gray-500 mb-1">Current</div>
              <div className="text-lg font-bold" style={{ color: getMetricColor() }}>
                {formatValue(currentValue, getMetricUnit())}
              </div>
            </div>
            <div className="bg-gray-900 rounded p-3 border border-gray-800">
              <div className="text-xs text-gray-500 mb-1">Minimum</div>
              <div className="text-lg font-bold text-blue-400">
                {formatValue(minValue, getMetricUnit())}
              </div>
            </div>
            <div className="bg-gray-900 rounded p-3 border border-gray-800">
              <div className="text-xs text-gray-500 mb-1">Maximum</div>
              <div className="text-lg font-bold text-red-400">
                {formatValue(maxValue, getMetricUnit())}
              </div>
            </div>
            <div className="bg-gray-900 rounded p-3 border border-gray-800">
              <div className="text-xs text-gray-500 mb-1">Average</div>
              <div className="text-lg font-bold text-yellow-400">
                {formatValue(avgValue, getMetricUnit())}
              </div>
            </div>
          </div>
        </div>

        {/* Fault Legend - Compact */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
          <p className="text-sm font-semibold text-gray-300 mb-3">Fault Status Legend:</p>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {Object.entries(FAULT_COLORS).map(([faultName, color]) => (
              <div key={faultName} className="flex items-center gap-2 px-2 py-1 rounded bg-gray-900">
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: color }}
                ></div>
                <span className="text-xs text-gray-400 truncate">{faultName.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-4 text-center text-xs text-gray-600">
          <span>Data Points: {filledPoints}/{maxDataPoints}</span>
          <span className="mx-3">|</span>
          <span>Update Interval: ~1 minute</span>
          <span className="mx-3">|</span>
          <span>Time Window: 60 minutes</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
