import { useState, useRef, useEffect } from 'react';

// Declare google maps types
declare global {
  interface Window {
    google: any;
  }
}

interface TripDTO {
  vehicleName: string;
  arrivalDate: string;
  price: number;
  alreadyScheduled: boolean;
  pathPolyline: string;
  distanceKm: number;
  departureLatLng: { lat: number; lng: number };
  arrivalLatLng: { lat: number; lng: number };
}

interface AddressData {
  formatted: string;
  lat: number;
  lng: number;
}

const SendParcel: React.FC = () => {
  // Address data with coordinates
  const [departureAddress, setDepartureAddress] = useState<AddressData | null>(null);
  const [arrivalAddress, setArrivalAddress] = useState<AddressData | null>(null);

  // Input values for display
  const [departureInputValue, setDepartureInputValue] = useState('');
  const [arrivalInputValue, setArrivalInputValue] = useState('');

  // Refs for input elements
  const departureInputRef = useRef<HTMLInputElement>(null);
  const arrivalInputRef = useRef<HTMLInputElement>(null);

  // Refs to store autocomplete instances
  const departureAutocompleteRef = useRef<any>(null);
  const arrivalAutocompleteRef = useRef<any>(null);

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

    // Poll for Google Maps to load
    const interval = setInterval(() => {
      if (checkGoogleMaps()) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!googleLoaded) return;

    // Initialize departure autocomplete
    if (departureInputRef.current && !departureAutocompleteRef.current) {
      departureAutocompleteRef.current = new window.google.maps.places.Autocomplete(
        departureInputRef.current,
        {
          componentRestrictions: { country: ['it', 'de', 'fr', 'es', 'at', 'ch'] },
          types: ['address'],
          fields: ['formatted_address', 'geometry', 'name']
        }
      );

      departureAutocompleteRef.current.addListener('place_changed', () => {
        const place = departureAutocompleteRef.current?.getPlace();
        
        if (place && place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const formatted = place.formatted_address || place.name || '';

          console.log('Departure place selected:', { formatted, lat, lng });

          setDepartureAddress({ formatted, lat, lng });
          setDepartureInputValue(formatted);
        }
      });
    }

    // Initialize arrival autocomplete
    if (arrivalInputRef.current && !arrivalAutocompleteRef.current) {
      arrivalAutocompleteRef.current = new window.google.maps.places.Autocomplete(
        arrivalInputRef.current,
        {
          componentRestrictions: { country: ['it', 'de', 'fr', 'es', 'at', 'ch'] },
          types: ['address'],
          fields: ['formatted_address', 'geometry', 'name']
        }
      );

      arrivalAutocompleteRef.current.addListener('place_changed', () => {
        const place = arrivalAutocompleteRef.current?.getPlace();
        
        if (place && place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const formatted = place.formatted_address || place.name || '';

          console.log('Arrival place selected:', { formatted, lat, lng });

          setArrivalAddress({ formatted, lat, lng });
          setArrivalInputValue(formatted);
        }
      });
    }
  }, [googleLoaded]);

  // Clear address when input is manually changed
  const handleDepartureInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDepartureInputValue(e.target.value);
    // Clear the confirmed address if user edits manually
    if (departureAddress && e.target.value !== departureAddress.formatted) {
      setDepartureAddress(null);
    }
  };

  const handleArrivalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setArrivalInputValue(e.target.value);
    // Clear the confirmed address if user edits manually
    if (arrivalAddress && e.target.value !== arrivalAddress.formatted) {
      setArrivalAddress(null);
    }
  };

  const handleFindResults = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that addresses were selected from autocomplete
    if (!departureAddress) {
      alert('Please select a departure address from the suggestions.');
      return;
    }
    if (!arrivalAddress) {
      alert('Please select an arrival address from the suggestions.');
      return;
    }
    if (!arrivalDate || !width || !height || !length || !weight) {
      alert('All fields are required.');
      return;
    }

    const shipmentData = {
      departureAddress: departureAddress.formatted,
      arrivalAddress: arrivalAddress.formatted,
      departureLatLng: {
        lat: departureAddress.lat,
        lng: departureAddress.lng
      },
      arrivalLatLng: {
        lat: arrivalAddress.lat,
        lng: arrivalAddress.lng
      },
      arrivalDate,
      width: parseInt(width),
      height: parseInt(height),
      length: parseInt(length),
      weight: parseInt(weight),
      refrigerated
    };

    console.log('Sending shipment data:', shipmentData);

    try {
      setIsLoading(true);
      
      const response = await fetch('http://localhost:8081/api/carrier/retrieveTrips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shipmentData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMsg = responseData.message || 'Server error';
        alert(errorMsg);
        return;
      }
      
      setTrips(responseData.body || []);
    } catch (err) {
      console.error(err);
      alert('Failed to retrieve trips');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (selectedTrip === null) {
      alert('Please select a trip first.');
      return;
    }
    
    if (!departureAddress || !arrivalAddress) {
      alert('Address data is missing. Please search again.');
      return;
    }

    const selectedTripData = trips[selectedTrip];
    
    const selectedTripDTO = {
      trip: {
        vehicleName: selectedTripData.vehicleName,
        arrivalDate: selectedTripData.arrivalDate,
        pathPolyline: selectedTripData.pathPolyline,
        distanceKm: selectedTripData.distanceKm,
        price: selectedTripData.price,
        scheduled: selectedTripData.alreadyScheduled,
        started: false,
        departureLatLng: selectedTripData.departureLatLng,
        arrivalLatLng: selectedTripData.arrivalLatLng
      },
      shipment: {
        vehicleName: selectedTripData.vehicleName,
        departureAddress: departureAddress.formatted,
        arrivalAddress: arrivalAddress.formatted,
        arrivalDate: arrivalDate,
        weight: parseInt(weight),
        width: parseInt(width),
        height: parseInt(height),
        length: parseInt(length),
        refrigerated: refrigerated,
        departureLatLng: {
          lat: departureAddress.lat,
          lng: departureAddress.lng
        },
        arrivalLatLng: {
          lat: arrivalAddress.lat,
          lng: arrivalAddress.lng
        }
      }
    };

    try {
      setIsLoading(true);
      
      const response = await fetch('http://localhost:8081/api/carrier/selectTrip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selectedTripDTO)
      });

      const responseData = await response.json();

      if (!response.ok) {
        alert(responseData.message || 'Failed to confirm trip selection');
        return;
      }

      alert(responseData.message || 'Trip confirmed successfully!');
      
      // Reset the form and results
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
      
    } catch (err) {
      console.error(err);
      alert('Failed to confirm trip selection');
    } finally {
      setIsLoading(false);
    }
  };

  const clearDepartureAddress = () => {
    setDepartureAddress(null);
    setDepartureInputValue('');
    if (departureInputRef.current) {
      departureInputRef.current.focus();
    }
  };

  const clearArrivalAddress = () => {
    setArrivalAddress(null);
    setArrivalInputValue('');
    if (arrivalInputRef.current) {
      arrivalInputRef.current.focus();
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-gray-900 text-white p-8 mt-8 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">Send Parcel</h1>
      
      {!googleLoaded && (
        <div className="mb-4 p-4 bg-yellow-600 rounded-lg text-center">
          Loading Google Maps...
        </div>
      )}

      <form onSubmit={handleFindResults} className="space-y-6">
        {/* Departure Address */}
        <div>
          <h2 className="text-xl font-semibold mb-3">Departure Address</h2>
          <div>
            <label htmlFor="departureAddress" className="block mb-2 font-medium">
              Search Address:
            </label>
            <input
              ref={departureInputRef}
              type="text"
              id="departureAddress"
              placeholder="Start typing an address..."
              value={departureInputValue}
              onChange={handleDepartureInputChange}
              disabled={!googleLoaded}
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            {departureAddress && (
              <div className="mt-2 p-3 bg-gray-800 border border-green-600 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-green-400 font-medium">✓ Address confirmed</p>
                    <p className="text-sm text-gray-300 mt-1">{departureAddress.formatted}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Coordinates: {departureAddress.lat.toFixed(6)}, {departureAddress.lng.toFixed(6)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearDepartureAddress}
                    className="text-gray-400 hover:text-white text-xl ml-2"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Arrival Address */}
        <div>
          <h2 className="text-xl font-semibold mb-3">Arrival Address</h2>
          <div>
            <label htmlFor="arrivalAddress" className="block mb-2 font-medium">
              Search Address:
            </label>
            <input
              ref={arrivalInputRef}
              type="text"
              id="arrivalAddress"
              placeholder="Start typing an address..."
              value={arrivalInputValue}
              onChange={handleArrivalInputChange}
              disabled={!googleLoaded}
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            {arrivalAddress && (
              <div className="mt-2 p-3 bg-gray-800 border border-green-600 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-green-400 font-medium">✓ Address confirmed</p>
                    <p className="text-sm text-gray-300 mt-1">{arrivalAddress.formatted}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Coordinates: {arrivalAddress.lat.toFixed(6)}, {arrivalAddress.lng.toFixed(6)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearArrivalAddress}
                    className="text-gray-400 hover:text-white text-xl ml-2"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Arrival Date */}
        <div>
          <label htmlFor="arrivalDate" className="block mb-2 font-medium">
            Arrival Date:
          </label>
          <input
            type="date"
            id="arrivalDate"
            value={arrivalDate}
            onChange={(e) => setArrivalDate(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
          />
        </div>

        {/* Parcel Dimensions */}
        <div>
          <h2 className="text-xl font-semibold mb-3">Parcel Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="width" className="block mb-2 font-medium">
                Width (cm):
              </label>
              <input
                type="number"
                id="width"
                placeholder="0"
                min="0"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="height" className="block mb-2 font-medium">
                Height (cm):
              </label>
              <input
                type="number"
                id="height"
                placeholder="0"
                min="0"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="length" className="block mb-2 font-medium">
                Length (cm):
              </label>
              <input
                type="number"
                id="length"
                placeholder="0"
                min="0"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="weight" className="block mb-2 font-medium">
                Weight (kg):
              </label>
              <input
                type="number"
                id="weight"
                placeholder="0"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center mt-4">
            <input
              type="checkbox"
              id="refrigerated"
              checked={refrigerated}
              onChange={(e) => setRefrigerated(e.target.checked)}
              className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <label htmlFor="refrigerated" className="ml-3 font-medium">
              Refrigeration Required
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !departureAddress || !arrivalAddress || !googleLoaded}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Searching...' : 'Find Results'}
        </button>
      </form>

      {trips.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Available Trips</h2>
          <div className="space-y-4">
            {trips.map((trip, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedTrip === index
                    ? 'border-blue-500 bg-gray-800'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
                onClick={() => setSelectedTrip(index)}
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div>
                    <p className="text-sm text-gray-400">Vehicle</p>
                    <p className="font-semibold">{trip.vehicleName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Arrival Date</p>
                    <p className="font-semibold">{trip.arrivalDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Distance</p>
                    <p className="font-semibold">{trip.distanceKm.toFixed(2)} km</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400">Price</p>
                      <p className="font-semibold">€{trip.price.toFixed(2)}</p>
                    </div>
                    {trip.alreadyScheduled && (
                      <span className="px-3 py-1 bg-yellow-600 text-white text-xs rounded">
                        Already Scheduled
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirm}
            disabled={selectedTrip === null || isLoading}
            className="mt-6 w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Confirming...' : 'Confirm Selection'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SendParcel;