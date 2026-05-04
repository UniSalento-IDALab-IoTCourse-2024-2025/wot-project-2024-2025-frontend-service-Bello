import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast, ToastContainer } from './Toast';


interface TripDTO {
  id: string;
  vehicleName: string;
  pathPolyline: string;
  distanceKm: number;
  started: boolean;
  scheduled: boolean;
  arrivalDate: string;
  price: number;
  departureLatLng: { lat: number; lng: number };
  arrivalLatLng: { lat: number; lng: number };
  departureAddress: string;
  arrivalAddress: string;
  remainingVolume: number;
  remainingWeight: number;
  refrigerated: boolean;
}

const mapOptions = {
  mapTypeId: 'roadmap',
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  zoomControl: true,
  scaleControl: true,
  rotateControl: false,
  panControl: false,
  gestureHandling: 'cooperative',
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateString.split('T')[0];
  }
};

const TripList: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTripForDelete, setSelectedTripForDelete] = useState<TripDTO | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [showMapPopup, setShowMapPopup] = useState(false);
  const [selectedTripForMap, setSelectedTripForMap] = useState<TripDTO | null>(null);
  const tripMapRef = useRef<HTMLDivElement>(null);

  const { toasts, showToast, dismissToast } = useToast();

  useEffect(() => { fetchTrips(); }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMapPopup) { setShowMapPopup(false); setSelectedTripForMap(null); }
        if (showDeleteConfirm) { setShowDeleteConfirm(false); setSelectedTripForDelete(null); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showMapPopup, showDeleteConfirm]);

  const fetchTrips = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('jwt');
      const response = await fetch('http://localhost:8081/api/carrier/trips', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const responseData = await response.json();
      if (!response.ok) { showToast(responseData.message || 'Failed to fetch trips'); return; }
      setTrips(responseData.body || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to communicate with the server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowMap = (trip: TripDTO) => {
    setSelectedTripForMap(trip);
    setShowMapPopup(true);
    setTimeout(() => initializeTripMap(trip), 100);
  };

  const initializeTripMap = (trip: TripDTO) => {
    if (!tripMapRef.current || !window.google) return;
    if (!trip.departureLatLng || !trip.arrivalLatLng) return;
    const map = new google.maps.Map(tripMapRef.current, {
      center: { lat: (trip.departureLatLng.lat + trip.arrivalLatLng.lat) / 2, lng: (trip.departureLatLng.lng + trip.arrivalLatLng.lng) / 2 },
      zoom: 8, ...mapOptions,
    });
    if (trip.pathPolyline) {
      const decoded = google.maps.geometry.encoding.decodePath(trip.pathPolyline);
      new google.maps.Polyline({ path: decoded, geodesic: true, strokeColor: '#4f46e5', strokeOpacity: 0.9, strokeWeight: 4, map });
      const bounds = new google.maps.LatLngBounds();
      decoded.forEach((p: any) => bounds.extend(p));
      map.fitBounds(bounds);
    }
    const markerIcon = (color: string, text: string) => ({
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
      label: { text, color: '#fff', fontSize: '11px', fontWeight: 'bold' },
    });
    new google.maps.Marker({ position: trip.departureLatLng, map, title: 'Departure', ...markerIcon('#22c55e', 'D') });
    new google.maps.Marker({ position: trip.arrivalLatLng, map, title: 'Arrival', ...markerIcon('#ef4444', 'A') });
  };

  const handleViewShipments = (trip: TripDTO) => {
    sessionStorage.setItem(`trip_${trip.id}`, JSON.stringify(trip));
    navigate(`/trip-list/${trip.id}/shipments`);
  };

  const handleDeleteClick = (trip: TripDTO) => { setSelectedTripForDelete(trip); setShowDeleteConfirm(true); };

  const handleDeleteConfirm = async () => {
    if (!selectedTripForDelete) return;
    try {
      setIsLoading(true);
      const token = localStorage.getItem('jwt');
      const response = await fetch('http://localhost:8081/api/carrier/deleteTrip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: selectedTripForDelete.id, vehicleName: selectedTripForDelete.vehicleName, pathPolyline: selectedTripForDelete.pathPolyline, distanceKm: selectedTripForDelete.distanceKm, started: selectedTripForDelete.started, arrivalDate: selectedTripForDelete.arrivalDate }),
      });
      const responseData = await response.json();
      if (!response.ok) { showToast(responseData.message || 'Failed to delete trip'); return; }
      showToast(responseData.message || 'Trip deleted!', 'success');
      setShowDeleteConfirm(false); setSelectedTripForDelete(null); fetchTrips();
    } catch (err) { console.error(err); showToast('Failed to delete trip'); }
    finally { setIsLoading(false); }
  };

  const formatVolume = (cm3: number) => {
    if (cm3 >= 1000000) return `${(cm3 / 1000000).toFixed(2)} m\u00B3`;
    return `${cm3.toLocaleString()} cm\u00B3`;
  };

  const fmtRoute = (addr: string, ll?: { lat: number; lng: number }) => addr || (ll ? `${ll.lat.toFixed(3)}, ${ll.lng.toFixed(3)}` : '\u2014');

  const shortId = (id: string) => id ? `#${id.slice(-6).toUpperCase()}` : '\u2014';

  // -- Column resize --
  const tableRef = useRef<HTMLTableElement>(null);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, _colIndex: number) => {
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
            <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" /></svg>
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Trips</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{trips.length} trip{trips.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={fetchTrips} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border-2 border-gray-500 dark:border-gray-500 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
          Refresh
        </button>
      </div>

      {isLoading && trips.length === 0 ? (
        <div className="text-center py-16">
          <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto mb-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <p className="text-gray-500 dark:text-gray-400">Loading trips...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-500 dark:border-gray-600">
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" /></svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No trips found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Trips will appear here when customers book shipments</p>
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
                    { label: 'Departure', w: 260 },
                    { label: 'Destination', w: 260 },
                    { label: 'Vehicle', w: 120 },
                    { label: 'Arrival Date', w: 120 },
                    { label: 'Distance', w: 90 },
                    { label: 'Capacity Left', w: 120 },
                    { label: 'Features', w: 120 },
                    { label: 'Actions', w: 110 },
                  ].map((col, i, arr) => (
                    <th
                      key={col.label}
                      style={{ minWidth: `${col.w}px`, position: 'relative' }}
                      className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3.5 select-none"
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
                {trips.map((trip) => (
                  <tr key={trip.id} className="group hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                    {/* Ref # */}
                    <td className="px-4 py-4">
                      <span className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400">{shortId(trip.id)}</span>
                    </td>
                    {/* Departure */}
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900 dark:text-white truncate block">{fmtRoute(trip.departureAddress, trip.departureLatLng)}</span>
                    </td>
                    {/* Destination */}
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900 dark:text-white truncate block">{fmtRoute(trip.arrivalAddress, trip.arrivalLatLng)}</span>
                    </td>
                    {/* Vehicle */}
                    <td className="px-4 py-4">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate block">{trip.vehicleName}</span>
                    </td>
                    {/* Arrival Date */}
                    <td className="px-4 py-4 whitespace-nowrap"><span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(trip.arrivalDate)}</span></td>
                    {/* Distance */}
                    <td className="px-4 py-4 whitespace-nowrap"><span className="text-sm text-gray-600 dark:text-gray-400">{trip.distanceKm?.toFixed(1) || '0'} km</span></td>
                    {/* Capacity Left */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-300">{formatVolume(trip.remainingVolume)}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{trip.remainingWeight} kg</div>
                    </td>
                    {/* Features */}
                    <td className="px-4 py-4">
                      {trip.refrigerated ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-lg whitespace-nowrap">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636" /></svg>
                          Refrigerated
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">&mdash;</span>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleViewShipments(trip)} title="View shipments" className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
                        </button>
                        <button onClick={() => handleShowMap(trip)} title="View on map" className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteClick(trip)} title="Delete trip" className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors opacity-40 group-hover:opacity-100">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-gray-300 dark:divide-gray-600/60">
            {trips.map((trip) => (
              <div key={trip.id} className="p-4">
                {/* Departure + Destination */}
                <div className="mb-3 space-y-1.5">
                  <div className="flex items-start gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-1" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{fmtRoute(trip.departureAddress, trip.departureLatLng)}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{fmtRoute(trip.arrivalAddress, trip.arrivalLatLng)}</span>
                  </div>
                </div>
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Vehicle</p>
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-0.5 truncate">{trip.vehicleName}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Arrival Date</p>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-0.5">{formatDate(trip.arrivalDate)}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Distance</p>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-0.5">{trip.distanceKm?.toFixed(1)} km</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Capacity Left</p>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-0.5">{formatVolume(trip.remainingVolume)} &middot; {trip.remainingWeight} kg</p>
                  </div>
                </div>
                {/* Features + Actions */}
                <div className="flex items-center gap-2">
                  {trip.refrigerated && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-[10px] font-medium rounded-lg">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636" /></svg>
                      Refrigerated
                    </span>
                  )}
                  <div className="flex-1" />
                  <button onClick={() => handleViewShipments(trip)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
                    Shipments
                  </button>
                  <button onClick={() => handleShowMap(trip)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                    Map
                  </button>
                  <button onClick={() => handleDeleteClick(trip)} className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Popup */}
      {showMapPopup && selectedTripForMap && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-500 dark:border-gray-600 max-w-4xl w-full overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b-2 border-gray-400 dark:border-gray-600">
              <h3 className="font-display font-bold text-gray-900 dark:text-white">Route &mdash; {selectedTripForMap.vehicleName}</h3>
              <button onClick={() => { setShowMapPopup(false); setSelectedTripForMap(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div><p className="text-xs text-gray-400">Distance</p><p className="font-semibold text-gray-900 dark:text-white">{selectedTripForMap.distanceKm?.toFixed(1)} km</p></div>
              <div><p className="text-xs text-gray-400">Arrival</p><p className="font-semibold text-gray-900 dark:text-white">{formatDate(selectedTripForMap.arrivalDate)}</p></div>
              <div className="flex items-center gap-3 text-xs text-gray-500"><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" />Departure</div><div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" />Arrival</div></div>
            </div>
            <div ref={tripMapRef} className="w-full h-80 sm:h-96" />
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteConfirm && selectedTripForDelete && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-500 dark:border-gray-600 p-6 max-w-md w-full animate-fade-in">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">Delete Trip</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">Delete trip for <strong className="text-gray-900 dark:text-white">{selectedTripForDelete.vehicleName}</strong> and all its shipments? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteConfirm(false); setSelectedTripForDelete(null); }} disabled={isLoading} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={isLoading} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50">{isLoading ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default TripList;