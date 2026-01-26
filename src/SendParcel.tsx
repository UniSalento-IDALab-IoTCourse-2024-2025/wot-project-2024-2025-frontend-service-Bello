import { useState } from 'react';

interface TripDTO {
  vehicleName: string;
  arrivalDate: string;
  price: number;
  scheduled: boolean;
  pathPolyline: string;
}

const SendParcel: React.FC = () => {
  const [departureAddress, setDepartureAddress] = useState('');
  const [arrivalAddress, setArrivalAddress] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [length, setLength] = useState('');
  const [weight, setWeight] = useState('');
  const [refrigerated, setRefrigerated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [trips, setTrips] = useState<TripDTO[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<number | null>(null);
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [selectedPolyline, setSelectedPolyline] = useState('');

  const handleFindResults = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!departureAddress.trim() || !arrivalAddress.trim() || !arrivalDate || 
        !width || !height || !length || !weight) {
      alert('All fields are required.');
      return;
    }

    const shipmentData = {
      departureAddress,
      arrivalAddress,
      arrivalDate,
      width: parseInt(width),
      height: parseInt(height),
      length: parseInt(length),
      weight: parseInt(weight),
      refrigerated
    };

    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:8081/api/carrier/retrieveTrips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shipmentData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        alert(responseData.message || 'Server error');
        return;
      }
      
      setTrips(responseData);
    } catch (err) {
      console.error(err);
      alert('Failed to retrieve trips');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowMap = (polyline: string) => {
    setSelectedPolyline(polyline);
    setShowMapPopup(true);
  };

  const handleConfirm = () => {
    if (selectedTrip === null) {
      alert('Please select a trip first.');
      return;
    }
    
    // TODO: Implement confirmation logic
    console.log('Selected trip:', trips[selectedTrip]);
    alert('Confirmation logic to be implemented');
  };

  return (
    <div className="max-w-6xl mx-auto bg-gray-900 text-white p-8 mt-8 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">Send Parcel</h1>
      
      <form onSubmit={handleFindResults} className="space-y-5 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="departureAddress" className="block mb-2 font-medium">
              Departure Address:
            </label>
            <input
              type="text"
              id="departureAddress"
              placeholder="Enter departure address"
              value={departureAddress}
              onChange={(e) => setDepartureAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="arrivalAddress" className="block mb-2 font-medium">
              Arrival Address:
            </label>
            <input
              type="text"
              id="arrivalAddress"
              placeholder="Enter arrival address"
              value={arrivalAddress}
              onChange={(e) => setArrivalAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
            />
          </div>
        </div>

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

        <div className="flex items-center">
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

        <button
          type="submit"
          disabled={isLoading}
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
                    <p className="text-sm text-gray-400">Price</p>
                    <p className="font-semibold">€{trip.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {trip.scheduled && (
                      <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">
                        Already Scheduled
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowMap(trip.pathPolyline);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-200"
                    >
                      View Route
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirm}
            disabled={selectedTrip === null}
            className="mt-6 w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Selection
          </button>
        </div>
      )}

      {showMapPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Route Map</h3>
              <button
                onClick={() => setShowMapPopup(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 h-96 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400 mb-2">Map rendering with polyline:</p>
                <p className="text-xs text-gray-500 break-all">{selectedPolyline}</p>
                <p className="text-gray-400 mt-4">
                  TODO: Integrate map library (e.g., Leaflet, Google Maps)
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowMapPopup(false)}
              className="mt-4 w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendParcel;