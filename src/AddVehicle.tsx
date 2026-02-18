import { useState } from 'react';
import { useToast, ToastContainer } from './Toast';

const AddVehicle: React.FC = () => {
  const [vehicleName, setVehicleName] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [hasRefrigeration, setHasRefrigeration] = useState(false);
  const [pricePerKm, setPricePerKm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleName.trim() || !length || !width || !height || !maxWeight || !pricePerKm) {
      showToast('All fields are required.', 'warning');
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
        showToast(responseData.message || 'Server error');
        return;
      }

      setShowSuccess(true);

      setVehicleName('');
      setLength('');
      setWidth('');
      setHeight('');
      setMaxWeight('');
      setHasRefrigeration(false);
      setPricePerKm('');
    } catch (err) {
      console.error(err);
      showToast('Failed to add vehicle');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow";

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-200 dark:border-gray-800 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                Add New Vehicle
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Register a new vehicle in your fleet
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <label htmlFor="vehicleName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Vehicle Name
            </label>
            <input
              type="text"
              id="vehicleName"
              placeholder="e.g. Fiat Ducato L3"
              value={vehicleName}
              onChange={(e) => setVehicleName(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Dimensions Grid */}
          <div className="lg:col-span-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Dimensions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="length" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Length (cm)
                </label>
                <input
                  type="number"
                  id="length"
                  placeholder="0"
                  step="0.01"
                  min="0"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="width" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Width (cm)
                </label>
                <input
                  type="number"
                  id="width"
                  placeholder="0"
                  step="0.01"
                  min="0"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="height" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  id="height"
                  placeholder="0"
                  step="0.01"
                  min="0"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="maxWeight" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Maximum Weight (kg)
            </label>
            <input
              type="number"
              id="maxWeight"
              placeholder="0"
              step="0.01"
              min="0"
              value={maxWeight}
              onChange={(e) => setMaxWeight(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Refrigeration Toggle */}
          <div className="lg:col-span-2 flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <input
              type="checkbox"
              id="hasRefrigeration"
              checked={hasRefrigeration}
              onChange={(e) => setHasRefrigeration(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500 focus:ring-2"
            />
            <label htmlFor="hasRefrigeration" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Refrigeration Unit Available
            </label>
          </div>

          <div>
            <label htmlFor="pricePerKm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Price per Km (€)
            </label>
            <input
              type="number"
              id="pricePerKm"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={pricePerKm}
              onChange={(e) => setPricePerKm(e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="lg:col-span-2 w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Adding Vehicle...
              </span>
            ) : (
              "Add Vehicle"
            )}
          </button>
        </form>
      </div>

      {/* Toast */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-8 max-w-md w-full animate-fade-in text-center">
            <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-2">Vehicle Added!</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Your vehicle has been successfully registered in your fleet.</p>
            <button
              onClick={() => setShowSuccess(false)}
              className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-600/20 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddVehicle;