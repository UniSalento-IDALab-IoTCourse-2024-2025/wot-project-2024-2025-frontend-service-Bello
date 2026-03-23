import { useState, useRef, useEffect } from 'react';
import { useToast, ToastContainer } from './Toast';

declare global {
  interface Window {
    google: any;
  }
}

interface LatLng {
  lat: number;
  lng: number;
}

interface TripDTO {
  id?: string;
  vehicleName: string;
  arrivalDate: string;
  price: number;
  scheduled: boolean;
  started: boolean;
  pathPolyline: string;
  distanceKm: number;
  duration: number;
  departureLatLng: LatLng;
  arrivalLatLng: LatLng;
  refrigerated: boolean;
  remainingVolume: number;
  remainingWeight: number;
}

interface ShipmentDTO {
  id?: string;
  vehicleName?: string;
  departureAddress: string;
  arrivalAddress: string;
  distanceKm: number;
  departureLatLng: LatLng;
  arrivalLatLng: LatLng;
  arrivalDate: string;
  width: number;
  height: number;
  length: number;
  weight: number;
  refrigerated: boolean;
  price?: number;
  duration: number;
}

interface RetrievedTripsDTO {
  tripsDTO: TripDTO[];
  shipmentDTO: ShipmentDTO;
}

interface AddressData {
  formatted: string;
  lat: number;
  lng: number;
}

const SendParcel: React.FC = () => {
  // Step management: 1 = form, 2 = results
  const [step, setStep] = useState<1 | 2>(1);

  const [departureAddress, setDepartureAddress] = useState<AddressData | null>(null);
  const [arrivalAddress, setArrivalAddress] = useState<AddressData | null>(null);
  const [departureInputValue, setDepartureInputValue] = useState('');
  const [arrivalInputValue, setArrivalInputValue] = useState('');
  const departureInputRef = useRef<HTMLInputElement>(null);
  const arrivalInputRef = useRef<HTMLInputElement>(null);
  const departureAutocompleteRef = useRef<any>(null);
  const arrivalAutocompleteRef = useRef<any>(null);
  const sessionTokenRef = useRef<any>(null);

  // Counter to trigger autocomplete re-initialization after reset
  const [autocompleteInitCount, setAutocompleteInitCount] = useState(0);

  const [arrivalDate, setArrivalDate] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [length, setLength] = useState('');
  const [weight, setWeight] = useState('');
  const [refrigerated, setRefrigerated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [trips, setTrips] = useState<TripDTO[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<number | null>(null);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const [serverShipmentDTO, setServerShipmentDTO] = useState<ShipmentDTO | null>(null);

  // Toast notification system
  const { toasts, showToast, dismissToast } = useToast();

  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Session token helpers
  const getSessionToken = () => {
    if (!sessionTokenRef.current && window.google?.maps?.places) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
    return sessionTokenRef.current;
  };

  const resetSessionToken = () => {
    sessionTokenRef.current = null;
  };

  // Check if Google Maps is loaded
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        setGoogleLoaded(true);
        return true;
      }
      return false;
    };
    if (checkGoogleMaps()) return;
    const interval = setInterval(() => {
      if (checkGoogleMaps()) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!googleLoaded) return;

    if (departureInputRef.current && !departureAutocompleteRef.current) {
      departureAutocompleteRef.current = new window.google.maps.places.Autocomplete(
        departureInputRef.current,
        {
          componentRestrictions: { country: ['it', 'de', 'fr', 'es', 'at', 'ch'] },
          types: ['address'],
          fields: ['formatted_address', 'geometry', 'name'],
          sessionToken: getSessionToken()
        }
      );
      departureAutocompleteRef.current.addListener('place_changed', () => {
        const place = departureAutocompleteRef.current?.getPlace();
        if (place && place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const formatted = place.formatted_address || place.name || '';
          setDepartureAddress({ formatted, lat, lng });
          setDepartureInputValue(formatted);
          resetSessionToken();
        }
      });
    }

    if (arrivalInputRef.current && !arrivalAutocompleteRef.current) {
      arrivalAutocompleteRef.current = new window.google.maps.places.Autocomplete(
        arrivalInputRef.current,
        {
          componentRestrictions: { country: ['it', 'de', 'fr', 'es', 'at', 'ch'] },
          types: ['address'],
          fields: ['formatted_address', 'geometry', 'name'],
          sessionToken: getSessionToken()
        }
      );
      arrivalAutocompleteRef.current.addListener('place_changed', () => {
        const place = arrivalAutocompleteRef.current?.getPlace();
        if (place && place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const formatted = place.formatted_address || place.name || '';
          setArrivalAddress({ formatted, lat, lng });
          setArrivalInputValue(formatted);
          resetSessionToken();
        }
      });
    }
  }, [googleLoaded, autocompleteInitCount]);

  const handleDepartureInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDepartureInputValue(e.target.value);
    if (departureAddress && e.target.value !== departureAddress.formatted) {
      setDepartureAddress(null);
    }
  };

  const handleArrivalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setArrivalInputValue(e.target.value);
    if (arrivalAddress && e.target.value !== arrivalAddress.formatted) {
      setArrivalAddress(null);
    }
  };

  const handleFindResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departureAddress) { showToast('Please select a departure address from the suggestions.', 'warning'); return; }
    if (!arrivalAddress) { showToast('Please select an arrival address from the suggestions.', 'warning'); return; }
    if (!arrivalDate || !width || !height || !length || !weight) { showToast('All fields are required.', 'warning'); return; }
    if ([width, height, length, weight].some(v => parseFloat(v) <= 0)) { showToast('Dimensions and weight must be greater than zero.', 'warning'); return; }

    const shipmentData: Partial<ShipmentDTO> = {
      departureAddress: departureAddress.formatted,
      arrivalAddress: arrivalAddress.formatted,
      departureLatLng: { lat: departureAddress.lat, lng: departureAddress.lng },
      arrivalLatLng: { lat: arrivalAddress.lat, lng: arrivalAddress.lng },
      arrivalDate,
      width: parseInt(width),
      height: parseInt(height),
      length: parseInt(length),
      weight: parseInt(weight),
      refrigerated
    };

    try {
      setIsLoading(true);
      const token = localStorage.getItem('jwt');
      const response = await fetch('http://localhost:8081/api/carrier/retrieveTrips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(shipmentData)
      });
      const responseData = await response.json();
      if (!response.ok) { showToast(responseData.message || 'Server error'); return; }
      const retrievedTrips: RetrievedTripsDTO = responseData.body;
      setTrips(retrievedTrips.tripsDTO || []);
      setServerShipmentDTO(retrievedTrips.shipmentDTO);
      setSelectedTrip(null);
      setStep(2);
    } catch (err) {
      console.error(err);
      showToast('Failed to retrieve trips');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (selectedTrip === null) { showToast('Please select a trip first.', 'warning'); return; }
    if (!serverShipmentDTO) { showToast('Shipment data is missing. Please search again.'); return; }

    const selectedTripData = trips[selectedTrip];
    const selectedTripDTO = {
      trip: {
        id: selectedTripData.id,
        vehicleName: selectedTripData.vehicleName,
        arrivalDate: selectedTripData.arrivalDate,
        pathPolyline: selectedTripData.pathPolyline,
        distanceKm: selectedTripData.distanceKm,
        duration: selectedTripData.duration,
        price: selectedTripData.price,
        scheduled: selectedTripData.scheduled,
        started: selectedTripData.started,
        departureLatLng: selectedTripData.departureLatLng,
        arrivalLatLng: selectedTripData.arrivalLatLng,
        refrigerated: selectedTripData.refrigerated,
        remainingVolume: selectedTripData.remainingVolume,
        remainingWeight: selectedTripData.remainingWeight
      },
      shipment: {
        ...serverShipmentDTO,
        vehicleName: selectedTripData.vehicleName,
        price: selectedTripData.price,
        idClient: localStorage.getItem("userId")
      }
    };

    try {
      setIsLoading(true);
      const token = localStorage.getItem('jwt');
      const response = await fetch('http://localhost:8081/api/carrier/selectTrip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(selectedTripDTO)
      });
      const responseData = await response.json();
      if (!response.ok) { showToast(responseData.message || 'Failed to confirm trip selection'); return; }
      
      // Show success modal instead of alert
      setSuccessMessage(responseData.message || 'Trip confirmed successfully!');
      setShowSuccessModal(true);

      // Don't reset yet — wait for user to dismiss the modal
    } catch (err) {
      console.error(err);
      showToast('Failed to confirm trip selection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSearch = () => {
    departureAutocompleteRef.current = null;
    arrivalAutocompleteRef.current = null;
    resetSessionToken();
    setStep(1);
    setTrips([]);
    setSelectedTrip(null);
    setServerShipmentDTO(null);
    // Trigger re-initialization of autocomplete on the new DOM elements
    setAutocompleteInitCount(c => c + 1);
  };

  const handleSuccessDismiss = () => {
    setShowSuccessModal(false);
    setSuccessMessage('');
    setDepartureAddress(null);
    setArrivalAddress(null);
    setDepartureInputValue('');
    setArrivalInputValue('');
    setArrivalDate('');
    setWidth('');
    setHeight('');
    setLength('');
    setWeight('');
    setRefrigerated(false);
    setTrips([]);
    setSelectedTrip(null);
    setServerShipmentDTO(null);
    // Reset autocomplete refs so they get re-initialized
    departureAutocompleteRef.current = null;
    arrivalAutocompleteRef.current = null;
    resetSessionToken();
    setStep(1);
    setAutocompleteInitCount(c => c + 1);
  };

  const clearDepartureAddress = () => {
    setDepartureAddress(null);
    setDepartureInputValue('');
    if (departureInputRef.current) departureInputRef.current.focus();
  };

  const clearArrivalAddress = () => {
    setArrivalAddress(null);
    setArrivalInputValue('');
    if (arrivalInputRef.current) arrivalInputRef.current.focus();
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl border-2 border-gray-500 dark:border-gray-500 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow disabled:opacity-50";

  // Split trips into dedicated and scheduled
  const dedicatedTrips = trips.filter((t) => !t.scheduled);
  const scheduledTrips = trips.filter((t) => t.scheduled);

  // Render a single trip row
  const renderTripRow = (trip: TripDTO, globalIndex: number) => {
    const isSelected = selectedTrip === globalIndex;

    return (
      <div
        key={trip.id || globalIndex}
        onClick={() => setSelectedTrip(globalIndex)}
        className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 p-4 cursor-pointer transition-all border-b-2 last:border-b-0 ${
          isSelected
            ? 'bg-primary-50 dark:bg-primary-950/20 border-primary-200 dark:border-primary-800'
            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
      >
        {/* Radio indicator */}
        <div className="flex items-center gap-3 sm:w-[40px] flex-shrink-0">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'border-primary-500 bg-primary-500'
              : 'border-gray-400 dark:border-gray-500'
          }`}>
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
          </div>
        </div>

        {/* Price — most important */}
        <div className="sm:w-[120px] flex-shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">Price</p>
          <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
            €{trip.price.toFixed(2)}
          </p>
        </div>

        {/* Arrival date */}
        <div className="sm:w-[140px] flex-shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">Arrival</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {new Date(trip.arrivalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        {/* Vehicle + tags */}
        <div className="flex items-center gap-2 sm:flex-1 min-w-0">
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{trip.vehicleName}</p>
          {trip.refrigerated && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-md flex-shrink-0">
              Refrigerated
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
      {/* Stepper */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center gap-3">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step >= 1
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {step > 1 ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : '1'}
            </div>
            <span className={`text-sm font-medium ${step >= 1 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
              Shipment details
            </span>
          </div>

          {/* Connector */}
          <div className={`flex-1 h-0.5 rounded ${step >= 2 ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`} />

          {/* Step 2 */}
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step >= 2
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              2
            </div>
            <span className={`text-sm font-medium ${step >= 2 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
              Choose a trip
            </span>
          </div>
        </div>
      </div>

      {/* ─── STEP 1: Search Form ─── */}
      {step === 1 && (
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border-2 border-gray-500 dark:border-gray-600 p-8 animate-fade-in">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              Where are you shipping?
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter your addresses and parcel details to find available carriers
            </p>
          </div>

          {!googleLoaded && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-400 dark:border-amber-800 rounded-xl text-center text-sm text-amber-700 dark:text-amber-300">
              Loading Google Maps...
            </div>
          )}

          <form onSubmit={handleFindResults} className="space-y-6">
            {/* Addresses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Departure */}
              <div>
                <label htmlFor="departureAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  From
                </label>
                <input
                  ref={departureInputRef}
                  type="text"
                  id="departureAddress"
                  placeholder="Departure address..."
                  value={departureInputValue}
                  onChange={handleDepartureInputChange}
                  disabled={!googleLoaded}
                  className={inputClass}
                />
                {departureAddress && (
                  <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/20 border-2 border-green-400 dark:border-green-800 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-medium text-green-700 dark:text-green-300">&#10003; Confirmed</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{departureAddress.formatted}</p>
                      </div>
                      <button type="button" onClick={clearDepartureAddress} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Arrival */}
              <div>
                <label htmlFor="arrivalAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  To
                </label>
                <input
                  ref={arrivalInputRef}
                  type="text"
                  id="arrivalAddress"
                  placeholder="Destination address..."
                  value={arrivalInputValue}
                  onChange={handleArrivalInputChange}
                  disabled={!googleLoaded}
                  className={inputClass}
                />
                {arrivalAddress && (
                  <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/20 border-2 border-green-400 dark:border-green-800 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-medium text-green-700 dark:text-green-300">&#10003; Confirmed</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{arrivalAddress.formatted}</p>
                      </div>
                      <button type="button" onClick={clearArrivalAddress} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Date */}
            <div>
              <label htmlFor="arrivalDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Arrival by
              </label>
              <input type="date" id="arrivalDate" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className={inputClass} />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">The latest date by which the parcel should arrive</p>
            </div>

            {/* Parcel Details */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Parcel dimensions</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="width" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Width</label>
                  <div className="relative">
                    <input type="number" id="width" placeholder="0" min="1" value={width} onChange={(e) => setWidth(e.target.value)} className={inputClass + " pr-10"} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500 pointer-events-none">cm</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="height" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Height</label>
                  <div className="relative">
                    <input type="number" id="height" placeholder="0" min="1" value={height} onChange={(e) => setHeight(e.target.value)} className={inputClass + " pr-10"} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500 pointer-events-none">cm</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="length" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Length</label>
                  <div className="relative">
                    <input type="number" id="length" placeholder="0" min="1" value={length} onChange={(e) => setLength(e.target.value)} className={inputClass + " pr-10"} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500 pointer-events-none">cm</span>
                  </div>
                </div>
                <div>
                  <label htmlFor="weight" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Weight</label>
                  <div className="relative">
                    <input type="number" id="weight" placeholder="0" min="1" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputClass + " pr-10"} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 dark:text-gray-500 pointer-events-none">kg</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4 p-4 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-500">
                <input
                  type="checkbox"
                  id="refrigerated"
                  checked={refrigerated}
                  onChange={(e) => setRefrigerated(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 focus:ring-2"
                />
                <label htmlFor="refrigerated" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Refrigeration required
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !departureAddress || !arrivalAddress || !googleLoaded}
              className="w-full px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl  transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none text-base"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Searching carriers...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Find Available Trips
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ─── STEP 2: Results ─── */}
      {step === 2 && (
        <div className="animate-fade-in">
          {/* Summary bar */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-500 dark:border-gray-600 p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={handleBackToSearch}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-600 dark:text-gray-400"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                Edit
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">From</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{departureAddress?.formatted}</p>
                </div>
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400">To</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{arrivalAddress?.formatted}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
              <span>By {new Date(arrivalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              {trips.length > 0 && (
                <>
                  <span className="hidden sm:block w-px h-4 bg-gray-300 dark:bg-gray-600" />
                  <span>~{(trips[0].scheduled && serverShipmentDTO ? serverShipmentDTO.distanceKm : trips[0].distanceKm).toFixed(0)} km</span>
                  <span className="hidden sm:block w-px h-4 bg-gray-300 dark:bg-gray-600" />
                  <span>~{formatDuration(trips[0].scheduled && serverShipmentDTO ? serverShipmentDTO.duration : trips[0].duration)}</span>
                </>
              )}
              <span className="hidden sm:block w-px h-4 bg-gray-300 dark:bg-gray-600" />
              <span className="font-medium text-gray-900 dark:text-white">{trips.length} result{trips.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {trips.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-500 dark:border-gray-600 p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No trips found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Try adjusting your dates or parcel dimensions</p>
              <button
                onClick={handleBackToSearch}
                className="px-6 py-2.5 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/20 hover:bg-primary-100 dark:hover:bg-primary-950/40 rounded-xl transition-colors"
              >
                Modify search
              </button>
            </div>
          ) : (
            <>
              {/* ── New trips ── */}
              {dedicatedTrips.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-start gap-3 mb-4 p-4 bg-primary-50 dark:bg-primary-950/20 border-2 border-primary-400 dark:border-primary-800 rounded-2xl">
                    <svg className="w-6 h-6 text-primary-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <div>
                      <h2 className="font-display text-lg font-bold text-primary-900 dark:text-primary-200">
                        New trips
                      </h2>
                      <p className="text-sm text-primary-700 dark:text-primary-300 mt-0.5">
                        These trips will be created exclusively for your shipment. A carrier will pick up and deliver your parcel on a direct route.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-500 dark:border-gray-600 overflow-hidden">
                    {/* Column headers (desktop) */}
                    <div className="hidden sm:flex items-center gap-0 px-4 py-3 bg-gray-100 dark:bg-gray-800/50 border-b-2 border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <div className="w-[40px]"></div>
                      <div className="w-[120px]">Price</div>
                      <div className="w-[140px]">Arrival</div>
                      <div className="flex-1">Vehicle</div>
                    </div>
                    {dedicatedTrips.map((trip) => {
                      const globalIndex = trips.indexOf(trip);
                      return renderTripRow(trip, globalIndex);
                    })}
                  </div>
                </div>
              )}

              {/* ── Scheduled (shared) trips ── */}
              {scheduledTrips.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-start gap-3 mb-4 p-4 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-400 dark:border-amber-800 rounded-2xl">
                    <svg className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <div>
                      <h2 className="font-display text-lg font-bold text-amber-900 dark:text-amber-200">
                        Want to save? Join an existing trip
                      </h2>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                        These carriers already have a scheduled trip on a similar route. Share the ride and pay less!
                      </p>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-500 dark:border-gray-600 overflow-hidden">
                    {/* Column headers (desktop) */}
                    <div className="hidden sm:flex items-center gap-0 px-4 py-3 bg-gray-100 dark:bg-gray-800/50 border-b-2 border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <div className="w-[40px]"></div>
                      <div className="w-[120px]">Price</div>
                      <div className="w-[140px]">Arrival</div>
                      <div className="flex-1">Vehicle</div>
                    </div>
                    {scheduledTrips.map((trip) => {
                      const globalIndex = trips.indexOf(trip);
                      return renderTripRow(trip, globalIndex);
                    })}
                  </div>
                </div>
              )}

              {/* Confirm button */}
              <div className="sticky bottom-4 z-10 mt-6">
                <div className="bg-white dark:bg-gray-900 backdrop-blur-lg rounded-2xl border-2 border-gray-500 dark:border-gray-600 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedTrip !== null ? (
                      <span>
                        Selected: <strong className="text-gray-900 dark:text-white">{trips[selectedTrip].vehicleName}</strong>
                        {' — '}
                        <strong className="text-primary-600 dark:text-primary-400">€{trips[selectedTrip].price.toFixed(2)}</strong>
                      </span>
                    ) : (
                      <span>Select a trip to continue</span>
                    )}
                  </div>
                  <button
                    onClick={handleConfirm}
                    disabled={selectedTrip === null || isLoading}
                    className="w-full sm:w-auto px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl  transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Confirming...
                      </span>
                    ) : (
                      "Confirm & Book"
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Toast Notifications ─── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ─── Success Modal ─── */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border-2 border-gray-500 dark:border-gray-600 p-8 max-w-md w-full animate-fade-in text-center">
            {/* Success animation */}
            <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>

            <h3 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Booking Confirmed!
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              {successMessage}
            </p>

            <button
              onClick={handleSuccessDismiss}
              className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl  transition-all"
            >
              Send Another Parcel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendParcel;