import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useToast, ToastContainer } from './Toast';

declare global {
  interface Window {
    google: any;
  }
}

interface ShipmentDTO {
  id: string;
  idTrip: string;
  vehicleName: string;
  departureAddress: string;
  arrivalAddress: string;
  weight: number;
  width: number;
  height: number;
  length: number;
  refrigerated: boolean;
  arrivalDate: string;
  departureLatLng: { lat: number; lng: number };
  arrivalLatLng: { lat: number; lng: number };
  price: number;
}

interface TripInfo {
  id: string;
  vehicleName: string;
  departureAddress: string;
  arrivalAddress: string;
  arrivalDate: string;
  distanceKm: number;
  price: number;
  remainingVolume: number;
  remainingWeight: number;
  refrigerated: boolean;
  started: boolean;
  scheduled: boolean;
  pathPolyline: string;
  departureLatLng: { lat: number; lng: number };
  arrivalLatLng: { lat: number; lng: number };
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

const TripShipments: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const [tripInfo, setTripInfo] = useState<TripInfo | null>(null);
  const [shipments, setShipments] = useState<ShipmentDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showShipmentMapPopup, setShowShipmentMapPopup] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentDTO | null>(null);
  const shipmentMapRef = useRef<HTMLDivElement>(null);

  const { toasts, showToast, dismissToast } = useToast();

  useEffect(() => {
    const stored = sessionStorage.getItem(`trip_${tripId}`);
    if (stored) setTripInfo(JSON.parse(stored));
  }, [tripId]);

  useEffect(() => {
    if (!tripInfo) return;
    const fetchShipments = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('jwt');
        const response = await fetch('http://localhost:8081/api/carrier/shipmentsByTrip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: tripInfo.id, vehicleName: tripInfo.vehicleName, pathPolyline: tripInfo.pathPolyline, distanceKm: tripInfo.distanceKm, started: tripInfo.started, arrivalDate: tripInfo.arrivalDate }),
        });
        const responseData = await response.json();
        if (!response.ok) { showToast(responseData.message || 'Failed to fetch shipments'); return; }
        setShipments(responseData.body || []);
      } catch (err) { console.error(err); showToast('Failed to fetch shipments'); }
      finally { setIsLoading(false); }
    };
    fetchShipments();
  }, [tripInfo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showShipmentMapPopup) { setShowShipmentMapPopup(false); setSelectedShipment(null); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showShipmentMapPopup]);

  const handleShowShipmentMap = (shipment: ShipmentDTO) => {
    setSelectedShipment(shipment);
    setShowShipmentMapPopup(true);
    setTimeout(() => initializeShipmentMap(shipment), 100);
  };

  const initializeShipmentMap = (shipment: ShipmentDTO) => {
    if (!shipmentMapRef.current || !window.google) return;
    if (!shipment.departureLatLng || !shipment.arrivalLatLng) return;
    const map = new google.maps.Map(shipmentMapRef.current, {
      center: { lat: (shipment.departureLatLng.lat + shipment.arrivalLatLng.lat) / 2, lng: (shipment.departureLatLng.lng + shipment.arrivalLatLng.lng) / 2 },
      zoom: 8, ...mapOptions,
    });
    if (tripInfo?.pathPolyline) {
      const decoded = google.maps.geometry.encoding.decodePath(tripInfo.pathPolyline);
      new google.maps.Polyline({ path: decoded, geodesic: true, strokeColor: '#4f46e5', strokeOpacity: 0.8, strokeWeight: 4, map });
      const bounds = new google.maps.LatLngBounds();
      decoded.forEach((p: any) => bounds.extend(p));
      bounds.extend(shipment.departureLatLng);
      bounds.extend(shipment.arrivalLatLng);
      map.fitBounds(bounds);
    }
    const markerIcon = (color: string, text: string) => ({
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
      label: { text, color: '#fff', fontSize: '11px', fontWeight: 'bold' },
    });
    new google.maps.Marker({ position: shipment.departureLatLng, map, title: 'Departure', ...markerIcon('#22c55e', 'D') });
    new google.maps.Marker({ position: shipment.arrivalLatLng, map, title: 'Arrival', ...markerIcon('#ef4444', 'A') });
  };

  const formatVolume = (cm3: number) => {
    if (cm3 >= 1000000) return `${(cm3 / 1000000).toFixed(2)} m\u00B3`;
    return `${cm3.toLocaleString()} cm\u00B3`;
  };

  const shortId = (id: string) => id ? `#${id.slice(-6).toUpperCase()}` : '\u2014';

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

  if (!tripInfo) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-500 dark:border-gray-600">
          <p className="text-gray-500 dark:text-gray-400 font-medium">Trip not found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">The trip data may have expired</p>
          <Link to="/trip-list" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors">Back to Trips</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
      {/* Back + Title */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/trip-list" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
          Trips
        </Link>
        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
        <h1 className="font-display text-xl font-bold text-gray-900 dark:text-white">Shipments</h1>
      </div>

      {/* Trip Summary */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-500 dark:border-gray-600 p-5 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">{tripInfo.departureAddress || `${tripInfo.departureLatLng?.lat.toFixed(3)}, ${tripInfo.departureLatLng?.lng.toFixed(3)}`}</p>
          </div>
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">{tripInfo.arrivalAddress || `${tripInfo.arrivalLatLng?.lat.toFixed(3)}, ${tripInfo.arrivalLatLng?.lng.toFixed(3)}`}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Vehicle</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{tripInfo.vehicleName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Arrival Date</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">{formatDate(tripInfo.arrivalDate)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Distance</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">{tripInfo.distanceKm?.toFixed(1)} km</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Capacity Left</p>
            <p className="font-medium text-gray-800 dark:text-gray-200">{formatVolume(tripInfo.remainingVolume)} &middot; {tripInfo.remainingWeight} kg</p>
          </div>
        </div>
      </div>

      {/* Shipments */}
      {isLoading ? (
        <div className="text-center py-16">
          <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto mb-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <p className="text-gray-500 dark:text-gray-400">Loading shipments...</p>
        </div>
      ) : shipments.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-500 dark:border-gray-600">
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No shipments yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Shipments will appear here when customers book this trip</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-500 dark:border-gray-600 overflow-hidden">
          <div className="px-5 py-3 border-b-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/20">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{shipments.length} shipment{shipments.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table ref={tableRef} className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-400 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/30">
                  {[
                    { label: 'Ref #', w: 90 },
                    { label: 'Departure', w: 260 },
                    { label: 'Destination', w: 260 },
                    { label: 'Dimensions', w: 140 },
                    { label: 'Weight', w: 90 },
                    { label: 'Price', w: 100 },
                    { label: 'Actions', w: 80 },
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
                    {/* Dimensions */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-mono">{s.length} &times; {s.width} &times; {s.height}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">cm</span>
                    </td>
                    {/* Weight */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{s.weight}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">kg</span>
                    </td>
                    {/* Price */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">&euro;{s.price?.toFixed(2) || '0.00'}</span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-4 text-right">
                      <button onClick={() => handleShowShipmentMap(s)} title="View on map" className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-300 dark:divide-gray-600/60">
            {shipments.map((s) => (
              <div key={s.id} className="p-4">
                {/* Addresses */}
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
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Dimensions</p>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-0.5">{s.length}&times;{s.width}&times;{s.height} <span className="text-[10px] text-gray-400">cm</span></p>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Weight</p>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-0.5">{s.weight} kg</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Price</p>
                    <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mt-0.5">&euro;{s.price?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{shortId(s.id)}</span>
                  <button onClick={() => handleShowShipmentMap(s)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                    View on map
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shipment Map Popup */}
      {showShipmentMapPopup && selectedShipment && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-500 dark:border-gray-600 max-w-4xl w-full overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b-2 border-gray-400 dark:border-gray-600">
              <h3 className="font-display font-bold text-gray-900 dark:text-white">Shipment Route</h3>
              <button onClick={() => { setShowShipmentMapPopup(false); setSelectedShipment(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-gray-400">From</p><p className="font-medium text-gray-900 dark:text-white">{selectedShipment.departureAddress}</p></div>
              <div><p className="text-xs text-gray-400">To</p><p className="font-medium text-gray-900 dark:text-white">{selectedShipment.arrivalAddress}</p></div>
            </div>
            <div ref={shipmentMapRef} className="w-full h-80 sm:h-96" />
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default TripShipments;