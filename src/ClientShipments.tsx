import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useToast, ToastContainer } from './Toast';

interface ShipmentDTO {
  id: string;
  idTrip: string;
  vehicleName: string;
  departureAddress: string;
  arrivalAddress: string;
  arrivalDate: string;
  distanceKm: number;
  duration: number;
  price: number;
  weight: number;
  width: number;
  height: number;
  length: number;
  refrigerated: boolean;
}

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateString.split('T')[0];
  }
};

const formatDuration = (seconds: number): string => {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
};

const shortId = (id: string) => id ? `#${id.slice(-6).toUpperCase()}` : '\u2014';

export default function ClientShipments() {
  const [shipments, setShipments] = useState<ShipmentDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toasts, showToast, dismissToast } = useToast();

  useEffect(() => { fetchShipments(); }, []);

  const fetchShipments = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('jwt');
      const response = await fetch('http://localhost:8081/api/carrier/myShipments', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const responseData = await response.json();
      if (!response.ok) { showToast(responseData.message || 'Failed to fetch shipments'); return; }
      setShipments(responseData.body || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to communicate with the server');
    } finally {
      setIsLoading(false);
    }
  };

  // -- Column resize --
  const tableRef = useRef<HTMLTableElement>(null);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, colIndex: number) => {
    e.preventDefault();
    const th = (e.target as HTMLElement).parentElement as HTMLTableCellElement;
    const startX = e.clientX;
    const startW = th.offsetWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvt: MouseEvent) => {
      const diff = moveEvt.clientX - startX;
      const newWidth = Math.max(60, startW + diff);
      th.style.width = `${newWidth}px`;
      th.style.minWidth = `${newWidth}px`;
    };

    const handleMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/50 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">My Shipments</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{shipments.length} shipment{shipments.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={fetchShipments} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border-2 border-gray-500 dark:border-gray-500 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
          Refresh
        </button>
      </div>

      {/* Loading */}
      {isLoading && shipments.length === 0 ? (
        <div className="text-center py-16">
          <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto mb-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <p className="text-gray-500 dark:text-gray-400">Loading shipments...</p>
        </div>
      ) : shipments.length === 0 ? (
        /* Empty state */
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-500 dark:border-gray-600">
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No shipments yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-5">You haven't sent any parcels yet. Start by sending your first one!</p>
          <Link
            to="/send-parcel"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors"
          >
            Send a Parcel
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-500 dark:border-gray-600 overflow-hidden">

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table ref={tableRef} className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-400 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/30">
                  {[
                    { label: 'Ref #', w: 90 },
                    { label: 'Departure', w: 220 },
                    { label: 'Destination', w: 220 },
                    { label: 'Vehicle', w: 120 },
                    { label: 'Arrival', w: 110 },
                    { label: 'Distance', w: 90 },
                    { label: 'Duration', w: 90 },
                    { label: 'Parcel', w: 140 },
                    { label: 'Price', w: 80 },
                  ].map((col, i, arr) => (
                    <th
                      key={col.label}
                      style={{ minWidth: `${col.w}px`, position: 'relative' }}
                      className={`text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3.5 select-none ${col.label === 'Price' ? 'text-right' : 'text-left'}`}
                    >
                      {col.label}
                      {i < arr.length - 1 && (
                        <div
                          onMouseDown={(e) => handleResizeMouseDown(e, i)}
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary-400/40 transition-colors"
                          style={{ zIndex: 1 }}
                        />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 dark:divide-gray-600/60">
                {shipments.map((s) => (
                  <tr key={s.id} className="group hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                    {/* Ref # */}
                    <td className="px-4 py-4">
                      <span className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400">{shortId(s.id)}</span>
                    </td>
                    {/* Departure */}
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900 dark:text-white truncate block">{s.departureAddress}</span>
                    </td>
                    {/* Destination */}
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900 dark:text-white truncate block">{s.arrivalAddress}</span>
                    </td>
                    {/* Vehicle */}
                    <td className="px-4 py-4">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate block">{s.vehicleName}</span>
                    </td>
                    {/* Arrival */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(s.arrivalDate)}</span>
                    </td>
                    {/* Distance */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{s.distanceKm?.toFixed(1)} km</span>
                    </td>
                    {/* Duration */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{formatDuration(s.duration)}</span>
                    </td>
                    {/* Parcel */}
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300">{s.weight} kg &middot; {s.width}&times;{s.height}&times;{s.length} cm</div>
                      {s.refrigerated && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-[10px] font-medium rounded-lg">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636" /></svg>
                          Refrigerated
                        </span>
                      )}
                    </td>
                    {/* Price */}
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">&euro;{s.price?.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-gray-300 dark:divide-gray-600/60">
            {shipments.map((s) => (
              <div key={s.id} className="p-4">
                {/* Ref + Price top row */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400">{shortId(s.id)}</span>
                  <span className="text-base font-bold text-gray-900 dark:text-white">&euro;{s.price?.toFixed(2)}</span>
                </div>
                {/* Route */}
                <div className="mb-3 space-y-1.5">
                  <div className="flex items-start gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-1" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{s.departureAddress}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{s.arrivalAddress}</span>
                  </div>
                </div>
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Vehicle</p>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 truncate">{s.vehicleName}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Arrival</p>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-0.5">{formatDate(s.arrivalDate)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Distance</p>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-0.5">{s.distanceKm?.toFixed(1)} km</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Weight</p>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-0.5">{s.weight} kg</p>
                  </div>
                </div>
                {/* Footer badges */}
                <div className="flex items-center gap-2">
                  {s.refrigerated && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-[10px] font-medium rounded-lg">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636" /></svg>
                      Refrigerated
                    </span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">{s.width}&times;{s.height}&times;{s.length} cm</span>
                  <span className="text-xs text-gray-400 dark:text-gray-600">&middot;</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatDuration(s.duration)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}