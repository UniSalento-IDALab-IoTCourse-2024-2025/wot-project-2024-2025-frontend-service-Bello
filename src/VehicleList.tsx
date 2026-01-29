import { useState, useEffect } from 'react';

interface Vehicle {
  id: string;
  vehicleName: string;
  refrigerated: boolean;
  width: number;
  height: number;
  length: number;
  maxWeight: number;
  pricePerKm: number;
}

const VehicleList: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('jwt');
      
      const response = await fetch('http://localhost:8081/api/carrier/vehicles', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const responseData = await response.json();

      if (!response.ok) {
        alert(responseData.message || 'Failed to fetch vehicles');
        return;
      }

      setVehicles(responseData.body || []);
    } catch (err) {
      console.error(err);
      alert('Failed to communicate with the server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedVehicle) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('jwt');

      const vehicleDTO = {
        vehicleName: selectedVehicle.vehicleName,
        isRefrigerated: selectedVehicle.refrigerated,
        width: selectedVehicle.width,
        height: selectedVehicle.height,
        length: selectedVehicle.length,
        maxWeight: selectedVehicle.maxWeight,
        pricePerKm: selectedVehicle.pricePerKm
      };

      const response = await fetch('http://localhost:8081/api/carrier/deleteVehicle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(vehicleDTO)
      });

      const responseData = await response.json();

      if (!response.ok) {
        alert(responseData.message || 'Failed to delete vehicle');
        return;
      }

      alert(responseData.message || 'Vehicle deleted successfully!');
      setShowDeleteConfirm(false);
      setSelectedVehicle(null);
      
      // Refresh the vehicle list
      fetchVehicles();
    } catch (err) {
      console.error(err);
      alert('Failed to delete vehicle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setSelectedVehicle(null);
  };

  return (
    <div className="max-w-6xl mx-auto bg-gray-900 text-white p-8 mt-8 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Vehicles</h1>
        <button
          onClick={fetchVehicles}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {isLoading && vehicles.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">Loading vehicles...</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No vehicles found. Add your first vehicle!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.vehicleName}
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-white">{vehicle.vehicleName}</h2>
                {vehicle.refrigerated && (
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                    Refrigerated
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Dimensions:</span>
                  <span className="text-white font-medium">
                    {vehicle.width}cm × {vehicle.height}cm × {vehicle.length}cm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Weight:</span>
                  <span className="text-white font-medium">{vehicle.maxWeight} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Price per Km:</span>
                  <span className="text-white font-medium">€{vehicle.pricePerKm.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => handleDeleteClick(vehicle)}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                Delete Vehicle
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete the vehicle <strong>{selectedVehicle.vehicleName}</strong>? This action cannot be undone.
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

export default VehicleList;