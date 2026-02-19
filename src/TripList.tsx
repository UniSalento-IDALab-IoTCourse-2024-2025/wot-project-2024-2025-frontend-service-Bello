import React, { useState, useEffect, useRef } from 'react';
import { useToast, ToastContainer } from './Toast';

declare global {
  interface Window {
    google: any;
  }
}

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
  remainingWidth: number;
  remainingHeight: number;
  remainingLength: number;
  remainingWeight: number;
  refrigerated: boolean;
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
  const [trips, setTrips] = useState<TripDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTripForDelete, setSelectedTripForDelete] = useState<TripDTO | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Map popup
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [selectedTripForMap, setSelectedTripForMap] = useState<TripDTO | null>(null);
  const tripMapRef = useRef<HTMLDivElement>(null);

  // Shipments
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [shipments, setShipments] = useState<ShipmentDTO[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(false);

  // Shipment map
  const [showShipmentMapPopup, setShowShipmentMapPopup] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentDTO | null>(null);
  const [currentTripPolyline, setCurrentTripPolyline] = useState('');
  const shipmentMapRef = useRef<HTMLDivElement>(null);

  const { toasts, showToast, dismissToast } = useToast();

  useEffect(() => {
    fetchTrips();
  }, []);

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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Map Ã¢â€â‚¬Ã¢â€â‚¬

  const handleShowMap = (trip: TripDTO) => {
    setSelectedTripForMap(trip);
    setShowMapPopup(true);
    setTimeout(() => initializeTripMap(trip), 100);
  };

  const initializeTripMap = (trip: TripDTO) => {
    if (!tripMapRef.current || !window.google) return;
    if (!trip.departureLatLng || !trip.arrivalLatLng) return;

    const map = new google.maps.Map(tripMapRef.current, {
      center: {
        lat: (trip.departureLatLng.lat + trip.arrivalLatLng.lat) / 2,
        lng: (trip.departureLatLng.lng + trip.arrivalLatLng.lng) / 2,
      },
      zoom: 8,
      ...mapOptions,
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Shipments Ã¢â€â‚¬Ã¢â€â‚¬

  const handleToggleShipments = async (trip: TripDTO) => {
    if (expandedTripId === trip.id) {
      setExpandedTripId(null);
      setShipments([]);
      return;
    }

    setExpandedTripId(trip.id);
    setCurrentTripPolyline(trip.pathPolyline);

    try {
      setLoadingShipments(true);
      const token = localStorage.getItem('jwt');
      const response = await fetch('http://localhost:8081/api/carrier/shipmentsByTrip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: trip.id, vehicleName: trip.vehicleName, pathPolyline: trip.pathPolyline, distanceKm: trip.distanceKm, started: trip.started, arrivalDate: trip.arrivalDate }),
      });
      const responseData = await response.json();
      if (!response.ok) { showToast(responseData.message || 'Failed to fetch shipments'); setExpandedTripId(null); return; }
      setShipments(responseData.body || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch shipments');
      setExpandedTripId(null);
    } finally {
      setLoadingShipments(false);
    }
  };

  const handleShowShipmentMap = (shipment: ShipmentDTO) => {
    setSelectedShipment(shipment);
    setShowShipmentMapPopup(true);
    setTimeout(() => initializeShipmentMap(shipment), 100);
  };

  const initializeShipmentMap = (shipment: ShipmentDTO) => {
    if (!shipmentMapRef.current || !window.google) return;
    if (!shipment.departureLatLng || !shipment.arrivalLatLng) return;

    const map = new google.maps.Map(shipmentMapRef.current, {
      center: {
        lat: (shipment.departureLatLng.lat + shipment.arrivalLatLng.lat) / 2,
        lng: (shipment.departureLatLng.lng + shipment.arrivalLatLng.lng) / 2,
      },
      zoom: 8,
      ...mapOptions,
    });

    if (currentTripPolyline) {
      const decoded = google.maps.geometry.encoding.decodePath(currentTripPolyline);
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Trip delete Ã¢â€â‚¬Ã¢â€â‚¬

  const handleDeleteClick = (trip: TripDTO) => {
    setSelectedTripForDelete(trip);
    setShowDeleteConfirm(true);
  };

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
      setShowDeleteConfirm(false);
      setSelectedTripForDelete(null);
      fetchTrips();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete trip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/50 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Trips</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{trips.length} trip{trips.length !== 1 ? 's' : ''} scheduled</p>
          </div>
        </div>
        <button onClick={fetchTrips} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" /></svg>
          Refresh
        </button>
      </div>

      {/* Content */}
      {isLoading && trips.length === 0 ? (
        <div className="text-center py-16">
          <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto mb-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <p className="text-gray-500 dark:text-gray-400">Loading trips...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" /></svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">No trips found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Trips will appear here when customers book shipments</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-6 py-4">Vehicle</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-6 py-4">Departure</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-6 py-4">Destination</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-6 py-4">Arrival Date</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 px-6 py-4">Distance</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 px-6 py-4">Actions</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {trips.map((trip) => {
                  const isExpanded = expandedTripId === trip.id;
                  
                  return (
                    <React.Fragment key={trip.id}>
                      {/* Main Row */}
                      <tr className="bg-white dark:bg-gray-900 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        {/* Vehicle */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{trip.vehicleName}</p>
                              {trip.refrigerated && (
                                <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 mt-0.5">Refrigerated</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Departure */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{trip.departureLatLng?.lat.toFixed(3)}, {trip.departureLatLng?.lng.toFixed(3)}</span>
                          </div>
                        </td>

                        {/* Destination */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{trip.arrivalLatLng?.lat.toFixed(3)}, {trip.arrivalLatLng?.lng.toFixed(3)}</span>
                          </div>
                        </td>

                        {/* Arrival Date */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{formatDate(trip.arrivalDate)}</span>
                        </td>

                        {/* Distance */}
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{trip.distanceKm?.toFixed(1) || '0'} km</span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleShipments(trip)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                              title="View shipments"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
                            </button>
                            <button
                              onClick={() => handleShowMap(trip)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-lg transition-colors"
                              title="View on map"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(trip)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                              title="Delete trip"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Shipments Expanded Row */}
                      {isExpanded && (
                        <tr className="bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800">
                          <td colSpan={6} className="px-6 py-5">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>
                              Shipments ({loadingShipments ? '...' : shipments.length})
                            </h3>

                            {loadingShipments ? (
                              <div className="text-center py-8">
                                <svg className="animate-spin h-5 w-5 text-primary-600 mx-auto mb-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                <p className="text-sm text-gray-400">Loading...</p>
                              </div>
                            ) : shipments.length === 0 ? (
                              <div className="text-center py-6">
                                <p className="text-sm text-gray-400 dark:text-gray-500">No shipments for this trip yet.</p>
                              </div>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/40">
                                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 px-4 py-2.5">From</th>
                                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 px-4 py-2.5">To</th>
                                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 px-4 py-2.5 hidden sm:table-cell">Dimensions (cm)</th>
                                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 px-4 py-2.5 hidden sm:table-cell">Weight</th>
                                      <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 px-4 py-2.5">Price</th>
                                      <th className="px-4 py-2.5" />
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {shipments.map((shipment) => (
                                      <tr key={shipment.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-4 py-3 max-w-[160px]">
                                          <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                            <span className="text-gray-700 dark:text-gray-300 truncate text-xs">{shipment.departureAddress}</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 max-w-[160px]">
                                          <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                                            <span className="text-gray-700 dark:text-gray-300 truncate text-xs">{shipment.arrivalAddress}</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 hidden sm:table-cell whitespace-nowrap">
                                          {shipment.width}&times;{shipment.height}&times;{shipment.length}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 hidden sm:table-cell whitespace-nowrap">
                                          {shipment.weight} kg
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-primary-600 dark:text-primary-400 whitespace-nowrap text-xs">
                                          &euro;{shipment.price?.toFixed(2) || '0.00'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <button onClick={() => handleShowShipmentMap(shipment)} className="text-xs text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors whitespace-nowrap">
                                            Map &rarr;
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Map Popup (Trip) Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {showMapPopup && selectedTripForMap && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl max-w-4xl w-full overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-display font-bold text-gray-900 dark:text-white">Route Ã¢â‚¬â€ {selectedTripForMap.vehicleName}</h3>
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

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Map Popup (Shipment) Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {showShipmentMapPopup && selectedShipment && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl max-w-4xl w-full overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
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

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ Delete Trip Modal Ã¢â€â‚¬Ã¢â€â‚¬ */}
      {showDeleteConfirm && selectedTripForDelete && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 max-w-md w-full animate-fade-in">
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