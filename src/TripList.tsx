import { useState, useEffect } from 'react';

interface TripDTO {
  id: string;
  vehicleName: string;
  pathPolyline: string;
  distanceKm: number;
  started: boolean;
  scheduled: boolean;
  arrivalDate: string;
  price: number;
}

interface ShipmentDTO {
  id: string;
  vehicleName: string;
  departureAddress: string;
  arrivalAddress: string;
  weight: number;
  width: number;
  height: number;
  length: number;
  refrigerated: boolean;
  arrivalDate: string;
}

const TripList: React.FC = () => {
  const [trips, setTrips] = useState<TripDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripDTO | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMapPopup, setShowMapPopup] = useState(false);
  const [selectedPolyline, setSelectedPolyline] = useState('');
  const [showShipmentsPopup, setShowShipmentsPopup] = useState(false);
  const [shipments, setShipments] = useState<ShipmentDTO[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(false);

  useEffect(() => {
    fetchTrips();
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

      setTrips(responseData.body || []);
    } catch (err) {
      console.error(err);
      alert('Failed to communicate with the server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowMap = (polyline: string) => {
    setSelectedPolyline(polyline);
    setShowMapPopup(true);
  };

  const handleShowShipments = async (trip: TripDTO) => {
    try {
      setLoadingShipments(true);
      setShowShipmentsPopup(true);
      
      const token = localStorage.getItem('jwt');
      const tripDTO = {
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
        setShowShipmentsPopup(false);
        return;
      }

      setShipments(responseData.body || []);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch shipments');
      setShowShipmentsPopup(false);
    } finally {
      setLoadingShipments(false);
    }
  };

  const handleDeleteClick = (trip: TripDTO) => {
    setSelectedTrip(trip);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTrip) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('jwt');

      const tripDTO = {
        vehicleName: selectedTrip.vehicleName,
        pathPolyline: selectedTrip.pathPolyline,
        distanceKm: selectedTrip.distanceKm,
        started: selectedTrip.started,
        arrivalDate: selectedTrip.arrivalDate
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
      setSelectedTrip(null);
      
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
    setSelectedTrip(null);
  };

  return (
    <div className="max-w-6xl mx-auto bg-gray-900 text-white p-8 mt-8 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Trips</h1>
        <button
          onClick={fetchTrips}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
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
          {trips.map((trip) => (
            <div
              key={trip.vehicleName}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all cursor-pointer"
              onClick={() => handleShowShipments(trip)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">{trip.vehicleName}</h2>
                  <span className={`px-2 py-1 text-white text-xs rounded ${
                    trip.started ? 'bg-green-600' : 'bg-gray-600'
                  }`}>
                    {trip.started ? 'Started' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-400">Arrival Date</p>
                  <p className="font-semibold">{trip.arrivalDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Distance</p>
                  <p className="font-semibold">{trip.distanceKm.toFixed(2)} km</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Price</p>
                  <p className="font-semibold">€{trip.price.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShowMap(trip.pathPolyline);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  View Route
                </button>
                <button
                  disabled
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg opacity-50 cursor-not-allowed"
                >
                  Start
                </button>
                <button
                  disabled
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg opacity-50 cursor-not-allowed"
                >
                  Stop
                </button>
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
          ))}
        </div>
      )}

      {/* Shipments Popup */}
      {showShipmentsPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Shipments for this Trip</h3>
              <button
                onClick={() => {
                  setShowShipmentsPopup(false);
                  setShipments([]);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {loadingShipments ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Loading shipments...</p>
              </div>
            ) : shipments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No shipments found for this trip.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="bg-gray-700 rounded-lg p-4 border border-gray-600"
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

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Dimensions</p>
                        <p className="font-semibold text-sm">
                          {shipment.length}×{shipment.width}×{shipment.height} cm
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Weight</p>
                        <p className="font-semibold text-sm">{shipment.weight} kg</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Arrival Date</p>
                        <p className="font-semibold text-sm">{shipment.arrivalDate}</p>
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
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                setShowShipmentsPopup(false);
                setShipments([]);
              }}
              className="mt-4 w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Map Popup */}
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
                <p className="text-gray-400 mb-2">Polyline data:</p>
                <p className="text-xs text-gray-500 break-all max-w-xl">{selectedPolyline}</p>
                <p className="text-gray-400 mt-4">
                  You can integrate a map library here (e.g., Google Maps, Leaflet)
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedTrip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete the trip for vehicle <strong>{selectedTrip.vehicleName}</strong>? This will also delete all related shipments. This action cannot be undone.
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
    </div>
  );
};

export default TripList;