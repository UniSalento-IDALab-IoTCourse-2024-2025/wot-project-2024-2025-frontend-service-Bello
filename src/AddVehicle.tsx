import { useState } from 'react';

const AddVehicle: React.FC = () => {
  const [vehicleName, setVehicleName] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [hasRefrigeration, setHasRefrigeration] = useState(false);
  const [pricePerKm, setPricePerKm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleName.trim() || !length || !width || !height || !maxWeight || !pricePerKm) {
      alert('All fields are required.');
      return;
    }

    const vehicleData = {
      vehicleName: vehicleName,
      refrigerated: hasRefrigeration,
      width: parseInt(width),
      height: parseInt(height),
      length: parseInt(length),
      maxWeight: parseInt(maxWeight),
      pricePerKm: parseFloat(pricePerKm)
    };
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('jwt');
      const response = await fetch('http://localhost:8081/api/carrier/addVehicle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(vehicleData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        alert(responseData.message || 'Server error');
        return;
      }
      
      alert('Vehicle added successfully!');
      // Reset form
      setVehicleName('');
      setLength('');
      setWidth('');
      setHeight('');
      setMaxWeight('');
      setHasRefrigeration(false);
      setPricePerKm('');
    } catch (err) {
      console.error(err);
      alert('Failed to add vehicle');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-gray-900 text-white p-8 mt-8 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">Add New Vehicle</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="vehicleName" className="block mb-2 font-medium">
            Vehicle Name:
          </label>
          <input
            type="text"
            id="vehicleName"
            placeholder="Enter vehicle name"
            value={vehicleName}
            onChange={(e) => setVehicleName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="length" className="block mb-2 font-medium">
              Length (m):
            </label>
            <input
              type="number"
              id="length"
              placeholder="0"
              step="1"
              min="0"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="width" className="block mb-2 font-medium">
              Width (m):
            </label>
            <input
              type="number"
              id="width"
              placeholder="0"
              step="1"
              min="0"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="height" className="block mb-2 font-medium">
              Height (m):
            </label>
            <input
              type="number"
              id="height"
              placeholder="0"
              step="1"
              min="0"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="maxWeight" className="block mb-2 font-medium">
            Maximum Weight (kg):
          </label>
          <input
            type="number"
            id="maxWeight"
            placeholder="0"
            step="1"
            min="0"
            value={maxWeight}
            onChange={(e) => setMaxWeight(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="hasRefrigeration"
            checked={hasRefrigeration}
            onChange={(e) => setHasRefrigeration(e.target.checked)}
            className="w-5 h-5 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="hasRefrigeration" className="ml-3 font-medium">
            Refrigeration Unit Available
          </label>
        </div>

        <div>
          <label htmlFor="pricePerKm" className="block mb-2 font-medium">
            Price per Km (€):
          </label>
          <input
            type="number"
            id="pricePerKm"
            placeholder="0.00"
            step="0.01"
            min="0"
            value={pricePerKm}
            onChange={(e) => setPricePerKm(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Adding Vehicle...' : 'Add Vehicle'}
        </button>
      </form>
    </div>
  );
};

export default AddVehicle;