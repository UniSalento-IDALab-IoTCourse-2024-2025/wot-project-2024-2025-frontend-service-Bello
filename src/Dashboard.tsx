import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  stream_status?: string;
  message?: string;
  message_type?: string;
}

interface AnomalyData {
  vehicle_name: string;
  timestamp: string;
  row_index: number;
  reconstruction_error: number;
  is_anomaly: number;
  anomaly_counter: number;
  normal_counter: number;
  anomaly_detected: boolean;
  alert_message?: string;
  message_type?: string;
}

interface ChartDataPoint {
  idx: number;
  time: number;
  value: number | null;
  label: string;
  rawData?: TelemetryData;
  isAnomaly?: boolean;
  reconstructionError?: number;
}

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
  const [latestData, setLatestData] = useState<TelemetryData | null>(null);
  const [yAxisDomain, setYAxisDomain] = useState<[number, number]>([0, 100]);
  const [streamCompleted, setStreamCompleted] = useState(false);
  
  const [latestAnomaly, setLatestAnomaly] = useState<AnomalyData | null>(null);
  const [anomalyDetected, setAnomalyDetected] = useState(false);
  const [anomalyHistory, setAnomalyHistory] = useState<AnomalyData[]>([]);

  // === NUOVO: Accumulo completo dei dati + viewport scorrevole ===
  const allDataRef = useRef<ChartDataPoint[]>([]); // Tutti i dati accumulati (ref per performance)
  const [allDataLength, setAllDataLength] = useState(0); // Trigger re-render quando serve
  const [viewEnd, setViewEnd] = useState(0); // Indice dell'ultimo punto visibile (0 = live/fine)
  const [isFollowingLive, setIsFollowingLive] = useState(true); // Auto-scroll ai dati più recenti
  const viewWindow = 60; // Quanti punti mostrare nella finestra
  
  const dataCounterRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartViewEndRef = useRef(0);

  const metrics: Array<{ key: keyof TelemetryData; label: string; unit: string; color: string }> = [
  { key: 'T_cab', label: 'Cabin Temperature', unit: '°C', color: '#00ff00' },
  { key: 'T_cab_meas', label: 'Cabin Temperature (Measured)', unit: '°C', color: '#00cc00' },
  { key: 'T_set', label: 'Setpoint Temperature', unit: '°C', color: '#00ffff' },
  { key: 'T_amb', label: 'Ambient Temperature', unit: '°C', color: '#ffff00' },
  { key: 'T_evap_sat', label: 'Evaporator Saturation Temp', unit: '°C', color: '#ff00ff' },
  { key: 'T_cond_sat', label: 'Condenser Saturation Temp', unit: '°C', color: '#ff6600' },
  { key: 'P_suc_bar', label: 'Suction Pressure', unit: 'bar', color: '#00ffff' },
  { key: 'P_dis_bar', label: 'Discharge Pressure', unit: 'bar', color: '#ff00ff' },
  { key: 'N_comp_Hz', label: 'Compressor Frequency', unit: 'Hz', color: '#00ff00' },
  { key: 'P_comp_W', label: 'Compressor Electrical Power', unit: 'W', color: '#00cccc' },
  { key: 'SH_K', label: 'Evaporator Superheat', unit: 'K', color: '#ff6600' },
  { key: 'Q_evap_W', label: 'Evaporator Cooling Power', unit: 'W', color: '#00ffff' },
  { key: 'COP', label: 'Coefficient of Performance', unit: '-', color: '#00ff00' },
  { key: 'frost_level', label: 'Frost Level', unit: '-', color: '#6699ff' },
  { key: 'valve_open', label: 'Expansion Valve Opening', unit: '-', color: '#ff00ff' },
  { key: 'door_open', label: 'Door Open', unit: 'bool', color: '#ff0000' },
  { key: 'defrost_on', label: 'Defrost Active', unit: 'bool', color: '#00ffff' },
  { key: 'run_id', label: 'Simulation Run ID', unit: '-', color: '#ff00ff' },
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

  // WebSocket connection
  useEffect(() => {
    console.log('🔌 WebSocket connection attempt...');
    const ws = new WebSocket('ws://localhost:8081/ws/telemetry');

    ws.onopen = () => {
      console.log('✅ WebSocket CONNECTED');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.message_type === 'anomaly') {
          handleAnomalyMessage(data as AnomalyData);
        } else {
          handleTelemetryMessage(data as TelemetryData);
        }
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

  const handleAnomalyMessage = (data: AnomalyData) => {
    console.log('🚨 Anomaly data received:', data);
    
    setLatestAnomaly(data);
    setAnomalyHistory(prev => [...prev.slice(-99), data]);
    
    if (data.anomaly_detected && !anomalyDetected) {
      setAnomalyDetected(true);
    }
    
    if (!data.anomaly_detected && anomalyDetected) {
      setAnomalyDetected(false);
    }
    
    // Aggiorna il punto corrispondente in allDataRef
    const allData = allDataRef.current;
    const index = allData.findIndex(p => p.rawData?.row_index === data.row_index);
    if (index !== -1) {
      allData[index] = {
        ...allData[index],
        isAnomaly: data.anomaly_detected,
        reconstructionError: data.reconstruction_error
      };
      setAllDataLength(prev => prev); // force re-render
    }
  };

  const handleTelemetryMessage = (data: TelemetryData) => {
    if (data.stream_status === 'completed') {
      console.log('🏁 STREAM COMPLETATO - Dashboard');
      
      setStreamCompleted(true);
      setIsConnected(false);
      localStorage.removeItem('activeSimulation');

      setTimeout(() => {
        setStreamCompleted(false);
        setActiveVehicle(null);
      }, 10000);

      return;
    }
    
    console.log('📊 Telemetry data received:', data.vehicle_name, '- Time:', data.time_min);

    setLatestData(data);
    setActiveVehicle(data.vehicle_name || 'Unknown');

    // === NUOVO: Accumula TUTTI i dati senza buttare via niente ===
    const newPoint: ChartDataPoint = {
      idx: dataCounterRef.current,
      time: data.time_min || 0,
      value: 0,
      label: `${Math.floor(data.time_min || 0)}m`,
      rawData: data,
      isAnomaly: false,
      reconstructionError: 0,
    };

    dataCounterRef.current += 1;
    allDataRef.current.push(newPoint);
    setAllDataLength(allDataRef.current.length);

    // Se stiamo seguendo il live, aggiorna viewEnd alla fine
    if (isFollowingLive) {
      setViewEnd(allDataRef.current.length);
    }
  };

  // === NUOVO: Calcola la finestra visibile dai dati accumulati ===
  const visibleData = React.useMemo(() => {
    const allData = allDataRef.current;
    const totalLen = allData.length;
    
    if (totalLen === 0) {
      // Dati vuoti: mostra placeholder
      return Array.from({ length: viewWindow }, (_, i) => ({
        idx: i,
        time: 0,
        value: null,
        label: `${i}`,
        rawData: undefined,
        isAnomaly: false,
        reconstructionError: 0,
      }));
    }

    const end = isFollowingLive ? totalLen : Math.min(viewEnd, totalLen);
    const start = Math.max(0, end - viewWindow);
    const slice = allData.slice(start, end);

    // Se la slice è più piccola della finestra, aggiungi placeholder all'inizio
    const padding = viewWindow - slice.length;
    const paddedSlice: ChartDataPoint[] = [];
    
    for (let i = 0; i < padding; i++) {
      paddedSlice.push({
        idx: -padding + i,
        time: 0,
        value: null,
        label: '',
        rawData: undefined,
        isAnomaly: false,
        reconstructionError: 0,
      });
    }
    
    return [...paddedSlice, ...slice];
  }, [allDataLength, viewEnd, isFollowingLive, viewWindow]);

  // Mappa i dati visibili con la metrica selezionata
  const chartData = React.useMemo(() => {
    return visibleData.map(point => {
      if (!point.rawData) {
        return { ...point, value: null };
      }
      
      const metricValue = Number(point.rawData[selectedMetric]) || 0;
      return {
        ...point,
        value: Number(metricValue.toFixed(2)),
      };
    });
  }, [visibleData, selectedMetric]);

  // Y axis domain basato su TUTTI i dati accumulati (scala fissa, non cambia scrollando)
  useEffect(() => {
    const allData = allDataRef.current;
    if (allData.length === 0) return;

    const allValues = allData
      .filter(p => p.rawData)
      .map(p => Number(p.rawData![selectedMetric]) || 0);
    
    if (allValues.length > 0) {
      const min = Math.min(...allValues);
      const max = Math.max(...allValues);
      const padding = (max - min) * 0.1 || 5;
      
      setYAxisDomain([
        Math.floor(min - padding),
        Math.ceil(max + padding)
      ]);
    }
  }, [allDataLength, selectedMetric]);

  // === NUOVO: Handler per drag e scroll sul grafico ===
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const totalLen = allDataRef.current.length;
    if (totalLen <= viewWindow) return;

    const scrollAmount = Math.sign(e.deltaY) * 3; // 3 punti per scroll tick
    
    setIsFollowingLive(false);
    setViewEnd(prev => {
      const currentEnd = isFollowingLive ? totalLen : prev;
      const newEnd = Math.max(viewWindow, Math.min(totalLen, currentEnd + scrollAmount));
      
      // Se arriviamo alla fine, riattiva il follow
      if (newEnd >= totalLen) {
        setIsFollowingLive(true);
        return totalLen;
      }
      return newEnd;
    });
  }, [isFollowingLive, viewWindow]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartViewEndRef.current = isFollowingLive ? allDataRef.current.length : viewEnd;
    
    // Cambia cursore
    if (chartContainerRef.current) {
      chartContainerRef.current.style.cursor = 'grabbing';
    }
  }, [viewEnd, isFollowingLive]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    
    const containerWidth = chartContainerRef.current?.clientWidth || 1;
    const deltaX = e.clientX - dragStartXRef.current;
    
    // Converti pixel in punti dati (rapporto: larghezza container = viewWindow punti)
    const pointsPerPixel = viewWindow / containerWidth;
    const pointsDelta = Math.round(-deltaX * pointsPerPixel); // Negativo: drag a destra = vai indietro
    
    const totalLen = allDataRef.current.length;
    if (totalLen <= viewWindow) return;
    
    const newEnd = Math.max(viewWindow, Math.min(totalLen, dragStartViewEndRef.current + pointsDelta));
    
    setIsFollowingLive(newEnd >= totalLen);
    setViewEnd(newEnd);
  }, [viewWindow]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    if (chartContainerRef.current) {
      chartContainerRef.current.style.cursor = 'grab';
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (chartContainerRef.current) {
        chartContainerRef.current.style.cursor = 'grab';
      }
    }
  }, []);

  // Registra wheel listener (passive: false per preventDefault)
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Vai al live
  const goToLive = useCallback(() => {
    setIsFollowingLive(true);
    setViewEnd(allDataRef.current.length);
  }, []);

  const currentMetric = metrics.find(m => m.key === selectedMetric);
  const currentValue = latestData ? (latestData[selectedMetric] || 0) : 0;
  const totalPoints = allDataRef.current.length;

  const generateGridLines = () => {
    const lines = [];
    const range = yAxisDomain[1] - yAxisDomain[0];
    const step = range / 4;
    
    for (let i = 1; i < 4; i++) {
      lines.push(yAxisDomain[0] + step * i);
    }
    return lines;
  };

  // Calcola il range temporale visibile per il label
  const getVisibleTimeRange = (): string => {
    const validPoints = chartData.filter(p => p.rawData);
    if (validPoints.length === 0) return '—';
    const firstTime = validPoints[0].time;
    const lastTime = validPoints[validPoints.length - 1].time;
    return `${Math.floor(firstTime)}m — ${Math.floor(lastTime)}m`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Real-Time Telemetry Dashboard</h1>
          
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
            {latestAnomaly && (
              <div className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                anomalyDetected ? 'bg-red-600 animate-pulse' : 'bg-green-600'
              }`}>
                <div className="w-2 h-2 rounded-full bg-white"></div>
                Anomaly: <strong>{anomalyDetected ? 'DETECTED' : 'NORMAL'}</strong>
              </div>
            )}
            {/* Indicatore totale punti accumulati */}
            {totalPoints > 0 && (
              <div className="px-4 py-2 bg-gray-700 rounded-lg text-sm">
                📦 Total: <strong>{totalPoints}</strong> data points
              </div>
            )}
          </div>
        </div>

        {latestAnomaly && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Anomaly Detection Status
              </h3>
              <span className={`px-3 py-1 rounded text-sm font-semibold ${
                anomalyDetected ? 'bg-red-600' : 'bg-green-600'
              }`}>
                {anomalyDetected ? 'ANOMALY' : 'NORMAL'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-900 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">Reconstruction Error</div>
                <div className="text-lg font-bold text-yellow-400">
                  {latestAnomaly.reconstruction_error.toFixed(6)}
                </div>
              </div>
              <div className="bg-gray-900 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">Anomaly Counter</div>
                <div className="text-lg font-bold text-red-400">
                  {latestAnomaly.anomaly_counter}
                </div>
              </div>
              <div className="bg-gray-900 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">Normal Counter</div>
                <div className="text-lg font-bold text-green-400">
                  {latestAnomaly.normal_counter}
                </div>
              </div>
              <div className="bg-gray-900 rounded p-3">
                <div className="text-xs text-gray-500 mb-1">Detection Status</div>
                <div className="text-lg font-bold text-blue-400">
                  {latestAnomaly.is_anomaly ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <div className="bg-black rounded-lg p-4 border-2 border-gray-700 relative">
          <div className="flex justify-between items-center mb-2 px-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getMetricColor() }}></div>
              <span className="text-sm font-medium text-gray-300">{currentMetric?.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500">
                {getVisibleTimeRange()}
              </div>
              {/* Indicatore LIVE / STORICO + pulsante Go to Live */}
              {isFollowingLive ? (
                <span className="text-xs px-2 py-1 bg-green-600 rounded text-white font-semibold animate-pulse">
                  ● LIVE
                </span>
              ) : (
                <button
                  onClick={goToLive}
                  className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white font-semibold transition-colors flex items-center gap-1"
                >
                  ▶ Go to Live
                </button>
              )}
            </div>
          </div>

          {/* Area grafico con drag/scroll */}
          <div 
            ref={chartContainerRef}
            className="relative bg-[#0a0a0a] rounded border border-gray-800 select-none"
            style={{ height: '350px', cursor: 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 py-2 z-10">
              <span>{yAxisDomain[1]}</span>
              <span>{Math.round((yAxisDomain[1] + yAxisDomain[0]) / 2)}</span>
              <span>{yAxisDomain[0]}</span>
            </div>

            {/* Hint per drag/scroll quando non live */}
            {!isFollowingLive && totalPoints > viewWindow && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 text-xs text-gray-500 bg-gray-900 bg-opacity-80 px-3 py-1 rounded pointer-events-none">
                ← Drag to scroll • Scroll wheel to navigate →
              </div>
            )}

            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={chartData}
                margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getMetricColor()} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={getMetricColor()} stopOpacity={0.05}/>
                  </linearGradient>
                </defs>

                <CartesianGrid 
                  strokeDasharray="0" 
                  stroke="#1a3a1a" 
                  strokeWidth={1}
                  horizontal={true}
                  vertical={true}
                />

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
                  formatter={(value: any, name: any, props: any) => {
                    if (value === null) return ['No Data', ''];
                    
                    const point = props.payload as ChartDataPoint;
                    const lines = [formatValue(value, getMetricUnit()) + ' ' + getMetricUnit()];
                    
                    if (point.rawData) {
                      lines.push(`Time: ${Math.floor(point.time)}m`);
                    }
                    
                    if (point.isAnomaly) {
                      lines.push(`⚠️ ANOMALY (Error: ${point.reconstructionError?.toFixed(6)})`);
                    }
                    
                    return [lines.join(' | '), currentMetric?.label];
                  }}
                  labelFormatter={() => ''}
                  cursor={{ stroke: getMetricColor(), strokeWidth: 1, strokeDasharray: '3 3' }}
                />

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

          {/* Minimap / barra di navigazione visiva */}
          {totalPoints > viewWindow && (
            <div className="mt-2 px-2">
              <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                {/* Barra che mostra dove sei nel dataset */}
                <div 
                  className="absolute h-full bg-blue-600 rounded-full transition-all duration-150"
                  style={{
                    left: `${Math.max(0, ((isFollowingLive ? totalPoints : viewEnd) - viewWindow) / Math.max(1, totalPoints - viewWindow)) * 100}%`,
                    width: `${Math.max(5, (viewWindow / totalPoints) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>0m</span>
                <span>{Math.floor(allDataRef.current[allDataRef.current.length - 1]?.time || 0)}m</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Dashboard;