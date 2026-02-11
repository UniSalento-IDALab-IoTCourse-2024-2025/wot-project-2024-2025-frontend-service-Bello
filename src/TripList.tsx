import { useState, useEffect, useRef } from 'react';

// Declare google maps types
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
}

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

// Opzioni mappa semplificata
const mapOptions = {
  mapTypeId: 'roadmap',
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  zoomControl: true,
  scaleControl: true,
  rotateControl: false,
  panControl: false,
  gestureHandling: 'cooperative'
};

// Helper function per formattare la data
const formatDateOnly = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString.split('T')[0];
  }
};

const TripList: React.FC = () => {
  const [trips, setTrips] = useState<TripDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTripForDelete, setSelectedTripForDelete] = useState<TripDTO | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [selectedTripForMap, setSelectedTripForMap] = useState<TripDTO | null>(null);
  const tripMapRef = useRef<HTMLDivElement>(null);
  const [expandedTripIndex, setExpandedTripIndex] = useState<number | null>(null);
  const [shipments, setShipments] = useState<ShipmentDTO[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [showShipmentMapPopup, setShowShipmentMapPopup] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<ShipmentDTO | null>(null);
  const [currentTripPolyline, setCurrentTripPolyline] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);

  // State per simulazione
  const [activeSimulation, setActiveSimulation] = useState<string | null>(() => {
    return localStorage.getItem('activeSimulation');
  });
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [showTelemetryPopup, setShowTelemetryPopup] = useState(false);
  const [isStartingSimulation, setIsStartingSimulation] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetchTrips();

    // Riconnetti il WebSocket se c'è una simulazione attiva
    const savedSimulation = localStorage.getItem('activeSimulation');
    if (savedSimulation) {
      console.log(`🔄 Reconnecting WebSocket for ${savedSimulation}...`);
      connectWebSocket(savedSimulation);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const fetchTrips = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('jwt');
      
      const response = await fetch('http://localhost:8081/api/carrier/trips', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const responseData = await response.json();

      if (!response.ok) {
        alert(responseData.message || 'Failed to fetch trips');
        return;
      }

      console.log('Trips received:', responseData.body);
      setTrips(responseData.body || []);
    } catch (err) {
      console.error(err);
      alert('Failed to communicate with the server');
    } finally {
      setIsLoading(false);
    }
  };

  // WebSocket e Simulazione

  const connectWebSocket = (vehicleName: string) => {
    if (wsRef.current) {
      console.log('Closing previous WebSocket...');
      wsRef.current.close();
    }

    console.log(`Connecting WebSocket for ${vehicleName}...`);
    console.log('URL: ws://localhost:8081/ws/telemetry');
    
    const ws = new WebSocket('ws://localhost:8081/ws/telemetry');

    ws.onopen = () => {
      console.log('WebSocket CONNECTED!');
      console.log('Waiting for telemetry messages...');
    };

    ws.onmessage = (event) => {
      console.log('MESSAGE RECEIVED (raw):', event.data);
      
      try {
        const data: TelemetryData = JSON.parse(event.data);
        
        // Controlla se lo stream e' terminato
        if (data.stream_status === 'completed') {
          console.log('STREAM COMPLETED!');
          console.log(`Vehicle: ${data.vehicle_name || activeSimulation}`);
          console.log(`Message: ${data.message || 'Dataset finished'}`);
          
          alert(`Stream completed for ${data.vehicle_name || activeSimulation}!\n${data.message || 'All data has been transmitted.'}`);
          
          handleStopSimulation();
          return;
        }
        
        console.log('Telemetry parsed:');
        console.log(`  Time: ${data.time_min} min`);
        console.log(`  T_cab: ${data.T_cab?.toFixed(2)}C`);
        console.log(`  T_set: ${data.T_set?.toFixed(2)}C`);
        console.log(`  T_amb: ${data.T_amb?.toFixed(2)}C`);
        console.log(`  Compressor: ${data.N_comp_Hz?.toFixed(1)} Hz`);
        console.log(`  COP: ${data.COP?.toFixed(2)}`);
        console.log(`  Fault: ${data.fault} (ID: ${data.fault_id})`);
        console.log(`  Vehicle: ${data.vehicle_name}`);
        console.log(`  Row: ${data.row_index}`);
        
        setTelemetryData(data);
      } catch (e) {
        console.error('Error parsing telemetry:', e);
        console.error('Raw data:', event.data);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket DISCONNECTED');
      console.log(`Code: ${event.code}`);
      console.log(`Reason: ${event.reason || 'No reason specified'}`);
      console.log(`Clean: ${event.wasClean}`);
    };

    ws.onerror = (error) => {
      console.error('WebSocket ERROR:', error);
    };

    wsRef.current = ws;
  };

  const handleStartSimulation = async (trip: TripDTO) => {
    console.log('========== START SIMULATION ==========');
    console.log(`Vehicle: ${trip.vehicleName}`);
    
    if (activeSimulation) {
      console.log(`Simulation already active for ${activeSimulation}`);
      alert(`There is already an active simulation for ${activeSimulation}. Stop it first.`);
      return;
    }

    try {
      setIsStartingSimulation(true);

      console.log('1. Connecting WebSocket...');
      connectWebSocket(trip.vehicleName);

      console.log('2. Calling API /trip/startSimulation...');
      const token = localStorage.getItem('jwt');
      const response = await fetch('http://localhost:8081/api/carrier/trip/startSimulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vehicleName: trip.vehicleName })
      });

      const responseData = await response.json();
      console.log('Response:', responseData);

      if (!response.ok) {
        console.error('Error start simulation:', responseData.message);
        alert(responseData.message || 'Failed to start simulation');
        if (wsRef.current) {
          wsRef.current.close();
        }
        return;
      }

      setActiveSimulation(trip.vehicleName);
      localStorage.setItem('activeSimulation', trip.vehicleName); 
      setShowTelemetryPopup(true);
      console.log(`Simulation started for ${trip.vehicleName}`);
      console.log('========================================');

    } catch (err) {
      console.error('Exception:', err);
      alert('Failed to start simulation');
      if (wsRef.current) {
        wsRef.current.close();
      }
    } finally {
      setIsStartingSimulation(false);
    }
  };

  const handleStopSimulation = async () => {
    console.log('========== STOP SIMULATION ==========');
    console.log(`Vehicle: ${activeSimulation}`);
    
    try {
      console.log('1. Calling API /trip/stopSimulation...');
      const token = localStorage.getItem('jwt');
      const response = await fetch('http://localhost:8081/api/carrier/trip/stopSimulation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const responseData = await response.json();
      console.log('Response:', responseData);

      if (!response.ok) {
        console.error('Error stop simulation:', responseData.message);
        alert(responseData.message || 'Failed to stop simulation');
        return;
      }

      console.log('2. Closing WebSocket...');
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      console.log(`Simulation stopped for ${activeSimulation}`);
      console.log('========================================');

      setActiveSimulation(null);
      localStorage.removeItem('activeSimulation'); 
      setTelemetryData(null);
      setShowTelemetryPopup(false);

    } catch (err) {
      console.error('Exception:', err);
      alert('Failed to stop simulation');
    }
  };

  // Altre funzioni

  const handleShowMap = (trip: TripDTO) => {
    console.log('Selected trip for map:', trip);
    
    setSelectedTripForMap(trip);
    setShowMapPopup(true);
    
    setTimeout(() => {
      initializeTripMap(trip);
    }, 100);
  };

  const initializeTripMap = (trip: TripDTO) => {
    if (!tripMapRef.current || !window.google) {
      console.error('Map initialization failed - missing ref or Google Maps');
      return;
    }

    if (!trip.departureLatLng || !trip.arrivalLatLng) {
      console.error('Missing coordinates for trip', trip);
      return;
    }

    const centerLat = (trip.departureLatLng.lat + trip.arrivalLatLng.lat) / 2;
    const centerLng = (trip.departureLatLng.lng + trip.arrivalLatLng.lng) / 2;

    const map = new google.maps.Map(tripMapRef.current, {
      center: { lat: centerLat, lng: centerLng },
      zoom: 8,
      ...mapOptions
    });

    if (trip.pathPolyline) {
      const decodedPath = google.maps.geometry.encoding.decodePath(trip.pathPolyline);
      
      new google.maps.Polyline({
        path: decodedPath,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: map
      });

      const bounds = new google.maps.LatLngBounds();
      decodedPath.forEach((point: any) => bounds.extend(point));
      bounds.extend(new google.maps.LatLng(trip.departureLatLng.lat, trip.departureLatLng.lng));
      bounds.extend(new google.maps.LatLng(trip.arrivalLatLng.lat, trip.arrivalLatLng.lng));
      map.fitBounds(bounds);
    }

    new google.maps.Marker({
      position: { lat: trip.departureLatLng.lat, lng: trip.departureLatLng.lng },
      map: map,
      title: 'Departure',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#22c55e',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      },
      label: {
        text: 'D',
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: 'bold'
      }
    });

    new google.maps.Marker({
      position: { lat: trip.arrivalLatLng.lat, lng: trip.arrivalLatLng.lng },
      map: map,
      title: 'Arrival',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      },
      label: {
        text: 'A',
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: 'bold'
      }
    });
  };

  const handleShowShipments = async (trip: TripDTO, index: number) => {
    if (expandedTripIndex === index) {
      setExpandedTripIndex(null);
      setTimeout(() => {
        setShipments([]);
      }, 500);
      return;
    }

    setExpandedTripIndex(index);
    setCurrentTripPolyline(trip.pathPolyline);

    try {
      setLoadingShipments(true);
      
      const token = localStorage.getItem('jwt');
      const tripDTO = {
        id: trip.id,
        vehicleName: trip.vehicleName,
        pathPolyline: trip.pathPolyline,
        distanceKm: trip.distanceKm,
        started: trip.started,
        arrivalDate: trip.arrivalDate
      };

      const response = await fetch('http://localhost:8081/api/carrier/shipmentsByTrip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tripDTO)
      });

      const responseData = await response.json();

      if (!response.ok) {
        alert(responseData.message || 'Failed to fetch shipments');
        setExpandedTripIndex(null);
        return;
      }

      setShipments(responseData.body || []);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch shipments');
      setExpandedTripIndex(null);
    } finally {
      setLoadingShipments(false);
    }
  };

  const handleDeleteShipment = async (shipment: ShipmentDTO) => {
    if (!confirm(`Are you sure you want to delete this shipment?`)) {
      return;
    }

    try {
      setLoadingShipments(true);
      const token = localStorage.getItem('jwt');

      const shipmentDTO = {
        id: shipment.id,
        idTrip: shipment.idTrip,
        vehicleName: shipment.vehicleName,
        departureAddress: shipment.departureAddress,
        arrivalAddress: shipment.arrivalAddress,
        weight: shipment.weight,
        width: shipment.width,
        height: shipment.height,
        length: shipment.length,
        refrigerated: shipment.refrigerated,
        arrivalDate: shipment.arrivalDate
      };

      const response = await fetch('http://localhost:8081/api/carrier/deleteShipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(shipmentDTO)
      });

      const responseData = await response.json();

      if (!response.ok) {
        alert(responseData.message || 'Failed to delete shipment');
        return;
      }

      alert(responseData.message || 'Shipment deleted successfully!');
      
      setShipments(prevShipments => 
        prevShipments.filter(s => s.id !== shipment.id)
      );
    } catch (err) {
      console.error(err);
      alert('Failed to delete shipment');
    } finally {
      setLoadingShipments(false);
    }
  };

  const handleShowShipmentMap = (shipment: ShipmentDTO) => {
    setSelectedShipment(shipment);
    setShowShipmentMapPopup(true);
    
    setTimeout(() => {
      initializeMap(shipment);
    }, 100);
  };

  const initializeMap = (shipment: ShipmentDTO) => {
    if (!mapRef.current || !window.google) return;

    if (!shipment.departureLatLng || !shipment.arrivalLatLng) {
      console.error('Missing coordinates for shipment', shipment);
      return;
    }

    const centerLat = (shipment.departureLatLng.lat + shipment.arrivalLatLng.lat) / 2;
    const centerLng = (shipment.departureLatLng.lng + shipment.arrivalLatLng.lng) / 2;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: centerLat, lng: centerLng },
      zoom: 8,
      ...mapOptions
    });

    googleMapInstance.current = map;

    if (currentTripPolyline) {
      const decodedPath = google.maps.geometry.encoding.decodePath(currentTripPolyline);
      
      new google.maps.Polyline({
        path: decodedPath,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map: map
      });

      const bounds = new google.maps.LatLngBounds();
      decodedPath.forEach((point: any) => bounds.extend(point));
      bounds.extend(new google.maps.LatLng(shipment.departureLatLng.lat, shipment.departureLatLng.lng));
      bounds.extend(new google.maps.LatLng(shipment.arrivalLatLng.lat, shipment.arrivalLatLng.lng));
      map.fitBounds(bounds);
    }

    new google.maps.Marker({
      position: { lat: shipment.departureLatLng.lat, lng: shipment.departureLatLng.lng },
      map: map,
      title: 'Departure',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#22c55e',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      },
      label: {
        text: 'D',
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: 'bold'
      }
    });

    new google.maps.Marker({
      position: { lat: shipment.arrivalLatLng.lat, lng: shipment.arrivalLatLng.lng },
      map: map,
      title: 'Arrival',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      },
      label: {
        text: 'A',
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: 'bold'
      }
    });
  };

  const handleDeleteClick = (trip: TripDTO) => {
    setSelectedTripForDelete(trip);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTripForDelete) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('jwt');

      const tripDTO = {
        id: selectedTripForDelete.id,
        vehicleName: selectedTripForDelete.vehicleName,
        pathPolyline: selectedTripForDelete.pathPolyline,
        distanceKm: selectedTripForDelete.distanceKm,
        started: selectedTripForDelete.started,
        arrivalDate: selectedTripForDelete.arrivalDate
      };

      const response = await fetch('http://localhost:8081/api/carrier/deleteTrip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(tripDTO)
      });

      const responseData = await response.json();

      if (!response.ok) {
        alert(responseData.message || 'Failed to delete trip');
        return;
      }

      alert(responseData.message || 'Trip deleted successfully!');
      setShowDeleteConfirm(false);
      setSelectedTripForDelete(null);
      
      fetchTrips();
    } catch (err) {
      console.error(err);
      alert('Failed to delete trip');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setSelectedTripForDelete(null);
  };

  return (
    <div className="max-w-6xl mx-auto bg-gray-900 text-white p-8 mt-8 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Scheduled Trips</h1>
        <div className="flex gap-4">
          {activeSimulation && (
            <span className="px-4 py-2 bg-green-600 text-white rounded-lg animate-pulse">
              Live: {activeSimulation}
            </span>
          )}
          <button
            onClick={fetchTrips}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {isLoading && trips.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">Loading trips...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No trips found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip, index) => (
            <div key={trip.id || `${trip.vehicleName}-${index}`} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div
                className="p-6 cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => handleShowShipments(trip, index)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">{trip.vehicleName}</h2>
                    <span className={`px-2 py-1 text-white text-xs rounded ${
                      activeSimulation === trip.vehicleName ? 'bg-green-600 animate-pulse' :
                      trip.started ? 'bg-green-600' : 'bg-gray-600'
                    }`}>
                      {activeSimulation === trip.vehicleName ? 'Streaming' :
                       trip.started ? 'Started' : 'Pending'}
                    </span>
                    {trip.refrigerated && (
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                        Refrigerated
                      </span>
                    )}
                  </div>
                  <svg 
                    className={`w-6 h-6 text-gray-400 transition-transform duration-300 ease-in-out ${
                      expandedTripIndex === index ? 'rotate-180' : ''
                    }`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Arrival Date</p>
                    <p className="font-semibold">{formatDateOnly(trip.arrivalDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Distance</p>
                    <p className="font-semibold">{trip.distanceKm?.toFixed(2) || '0.00'} km</p>
                  </div>
                </div>

                {/* Remaining Capacity Section */}
                <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Remaining Capacity
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Weight</p>
                      <p className="font-semibold text-blue-400">{trip.remainingWeight ?? 0} kg</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Width</p>
                      <p className="font-semibold text-green-400">{trip.remainingWidth ?? 0} cm</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Height</p>
                      <p className="font-semibold text-yellow-400">{trip.remainingHeight ?? 0} cm</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Length</p>
                      <p className="font-semibold text-purple-400">{trip.remainingLength ?? 0} cm</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowMap(trip);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                  >
                    View Route
                  </button>
                  
                  {/* Pulsanti Start/Stop per simulazione */}
                  {trip.refrigerated && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartSimulation(trip);
                        }}
                        disabled={activeSimulation !== null || isStartingSimulation}
                        className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors duration-200 ${
                          activeSimulation !== null || isStartingSimulation
                            ? 'bg-blue-600 opacity-50 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {isStartingSimulation ? 'Starting...' : 'Start'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStopSimulation();
                        }}
                        disabled={activeSimulation !== trip.vehicleName}
                        className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors duration-200 ${
                          activeSimulation !== trip.vehicleName
                            ? 'bg-orange-600 opacity-50 cursor-not-allowed'
                            : 'bg-orange-600 hover:bg-orange-700'
                        }`}
                      >
                        Stop
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(trip);
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                  >
                    Delete Trip
                  </button>
                </div>
              </div>

              {/* Expanded Shipments Section with Animation */}
              <div 
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  expandedTripIndex === index 
                    ? 'max-h-[2000px] opacity-100' 
                    : 'max-h-0 opacity-0'
                }`}
              >
                <div className="border-t border-gray-700 p-6 bg-gray-850">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Shipments
                  </h3>
                  
                  {loadingShipments ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                      <p className="text-gray-400">Loading shipments...</p>
                    </div>
                  ) : shipments.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-gray-400">No shipments found for this trip.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {shipments.map((shipment, shipmentIndex) => (
                        <div
                          key={shipment.id}
                          className="bg-gray-700 rounded-lg p-4 border border-gray-600 transform transition-all duration-300 ease-out"
                          style={{
                            animationDelay: `${shipmentIndex * 100}ms`,
                            animation: expandedTripIndex === index ? 'slideDown 0.3s ease-out forwards' : 'none'
                          }}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-gray-400">Departure</p>
                              <p className="font-semibold text-sm">{shipment.departureAddress}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Arrival</p>
                              <p className="font-semibold text-sm">{shipment.arrivalAddress}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-3">
                            <div>
                              <p className="text-sm text-gray-400">Dimensions</p>
                              <p className="font-semibold text-sm">
                                {shipment.width}x{shipment.height}x{shipment.length} cm
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Weight</p>
                              <p className="font-semibold text-sm">{shipment.weight} kg</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Price</p>
                              <p className="font-semibold text-sm text-green-400">€{shipment.price?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Arrival Date</p>
                              <p className="font-semibold text-sm">{formatDateOnly(shipment.arrivalDate)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Refrigeration</p>
                              <span className={`px-2 py-1 text-white text-xs rounded ${
                                shipment.refrigerated ? 'bg-blue-600' : 'bg-gray-600'
                              }`}>
                                {shipment.refrigerated ? 'Yes' : 'No'}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleShowShipmentMap(shipment)}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                            >
                              View on Map
                            </button>
                            <button
                              onClick={() => handleDeleteShipment(shipment)}
                              disabled={loadingShipments}
                              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loadingShipments ? 'Deleting...' : 'Delete Shipment'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Telemetry Popup */}
      {showTelemetryPopup && activeSimulation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="animate-pulse">📡</span> Live Telemetry - {activeSimulation}
              </h3>
              <button
                onClick={() => setShowTelemetryPopup(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {telemetryData ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-700 border-b border-gray-600">
                      <th className="px-4 py-3 text-left font-semibold text-gray-300">Parameter</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-300">Value</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-300">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Time & Fault */}
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">⏱ Time</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.time_min, "min")}</td>
                      <td className="px-4 py-2 text-gray-400">min</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">⚠ Fault</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          telemetryData.fault === 'NORMAL' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {telemetryData.fault || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-400">-</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">🔢 Fault ID</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.fault_id, "-")}</td>
                      <td className="px-4 py-2 text-gray-400">-</td>
                    </tr>

                    {/* Temperatures */}
                    <tr className="bg-gray-750 border-b border-gray-700">
                      <td colSpan={3} className="px-4 py-2 font-bold text-blue-400">🌡 TEMPERATURES</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">T_cab (Control)</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.T_cab, "C")}</td>
                      <td className="px-4 py-2 text-gray-400">°C</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">T_cab_meas (Measured)</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.T_cab_meas, "C")}</td>
                      <td className="px-4 py-2 text-gray-400">°C</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">T_set (Setpoint)</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.T_set, "C")}</td>
                      <td className="px-4 py-2 text-gray-400">°C</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">T_amb (Ambient)</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.T_amb, "C")}</td>
                      <td className="px-4 py-2 text-gray-400">°C</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">T_evap_sat</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.T_evap_sat, "C")}</td>
                      <td className="px-4 py-2 text-gray-400">°C</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">T_cond_sat</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.T_cond_sat, "C")}</td>
                      <td className="px-4 py-2 text-gray-400">°C</td>
                    </tr>

                    {/* Pressures */}
                    <tr className="bg-gray-750 border-b border-gray-700">
                      <td colSpan={3} className="px-4 py-2 font-bold text-green-400">📊 PRESSURES</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">P_suc_bar</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.P_suc_bar, "bar")}</td>
                      <td className="px-4 py-2 text-gray-400">bar</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">P_dis_bar</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.P_dis_bar, "bar")}</td>
                      <td className="px-4 py-2 text-gray-400">bar</td>
                    </tr>

                    {/* Compressor & Performance */}
                    <tr className="bg-gray-750 border-b border-gray-700">
                      <td colSpan={3} className="px-4 py-2 font-bold text-yellow-400">⚙ COMPRESSOR & PERFORMANCE</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">N_comp_Hz</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.N_comp_Hz, "Hz")}</td>
                      <td className="px-4 py-2 text-gray-400">Hz</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">P_comp_W</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.P_comp_W, "W")}</td>
                      <td className="px-4 py-2 text-gray-400">W</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">SH_K (Superheat)</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.SH_K, "K")}</td>
                      <td className="px-4 py-2 text-gray-400">K</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">Q_evap_W</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.Q_evap_W, "W")}</td>
                      <td className="px-4 py-2 text-gray-400">W</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">COP</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.COP, "-")}</td>
                      <td className="px-4 py-2 text-gray-400">-</td>
                    </tr>

                    {/* Status */}
                    <tr className="bg-gray-750 border-b border-gray-700">
                      <td colSpan={3} className="px-4 py-2 font-bold text-purple-400">🔧 STATUS</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">frost_level</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.frost_level, "%")}</td>
                      <td className="px-4 py-2 text-gray-400">%</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">valve_open</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.valve_open, "%")}</td>
                      <td className="px-4 py-2 text-gray-400">%</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">🚪 door_open</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          telemetryData.door_open ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-white'
                        }`}>
                          {telemetryData.door_open ? 'OPEN' : 'CLOSED'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-400">-</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">❄ defrost_on</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          telemetryData.defrost_on ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white'
                        }`}>
                          {telemetryData.defrost_on ? 'ON' : 'OFF'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-400">-</td>
                    </tr>

                    {/* Other */}
                    <tr className="bg-gray-750 border-b border-gray-700">
                      <td colSpan={3} className="px-4 py-2 font-bold text-gray-400">📋 OTHER</td>
                    </tr>
                    <tr className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-2 text-gray-300">run_id</td>
                      <td className="px-4 py-2 text-right font-semibold text-white">{formatValue(telemetryData.run_id, "-")}</td>
                      <td className="px-4 py-2 text-gray-400">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                <p className="text-gray-400">Waiting for telemetry data...</p>
              </div>
            )}

            <button
              onClick={handleStopSimulation}
              className="mt-6 w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
            >
              🛑 Stop Simulation
            </button>
          </div>
        </div>
      )}

      {/* Shipment Map Popup */}
      {showShipmentMapPopup && selectedShipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Shipment Route</h3>
              <button
                onClick={() => {
                  setShowShipmentMapPopup(false);
                  setSelectedShipment(null);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-700 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Departure</p>
                  <p className="font-semibold">{selectedShipment.departureAddress}</p>
                  {selectedShipment.departureLatLng && (
                    <p className="text-xs text-gray-400 mt-1">
                      Lat: {selectedShipment.departureLatLng.lat.toFixed(6)}, 
                      Lng: {selectedShipment.departureLatLng.lng.toFixed(6)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-400">Arrival</p>
                  <p className="font-semibold">{selectedShipment.arrivalAddress}</p>
                  {selectedShipment.arrivalLatLng && (
                    <p className="text-xs text-gray-400 mt-1">
                      Lat: {selectedShipment.arrivalLatLng.lat.toFixed(6)}, 
                      Lng: {selectedShipment.arrivalLatLng.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div 
              ref={mapRef}
              className="w-full h-96 bg-gray-700 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Map Popup */}
      {showMapPopup && selectedTripForMap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Route Map - {selectedTripForMap.vehicleName}</h3>
              <button
                onClick={() => {
                  setShowMapPopup(false);
                  setSelectedTripForMap(null);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-700 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Departure</p>
                  {selectedTripForMap.departureLatLng && (
                    <p className="text-sm text-white">
                      Lat: {selectedTripForMap.departureLatLng.lat.toFixed(6)}, 
                      Lng: {selectedTripForMap.departureLatLng.lng.toFixed(6)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-400">Arrival</p>
                  {selectedTripForMap.arrivalLatLng && (
                    <p className="text-sm text-white">
                      Lat: {selectedTripForMap.arrivalLatLng.lat.toFixed(6)}, 
                      Lng: {selectedTripForMap.arrivalLatLng.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <p className="text-sm text-gray-400">Distance</p>
                  <p className="font-semibold">{selectedTripForMap.distanceKm?.toFixed(2) || '0.00'} km</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Arrival Date</p>
                  <p className="font-semibold">{formatDateOnly(selectedTripForMap.arrivalDate)}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
                <span className="text-sm text-gray-300">Departure</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white"></div>
                <span className="text-sm text-gray-300">Arrival</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-300">Route</span>
              </div>
            </div>

            <div 
              ref={tripMapRef}
              className="w-full h-96 bg-gray-700 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedTripForDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete the trip for vehicle <strong>{selectedTripForDelete.vehicleName}</strong>? This will also delete all related shipments. This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleCancelDelete}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation for slideDown effect */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default TripList;