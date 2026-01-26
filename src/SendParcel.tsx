import { useState } from 'react';

interface TripDTO {
  vehicleName: string;
  arrivalDate: string;
  price: number;
  alreadyScheduled: boolean;
  pathPolyline: string;
  distanceKm: number;
}

const SendParcel: React.FC = () => {
  // Departure fields
  const [depStreet, setDepStreet] = useState('');
  const [depNumber, setDepNumber] = useState('');
  const [depPostalCode, setDepPostalCode] = useState('');
  const [depCity, setDepCity] = useState('');
  const [depProvince, setDepProvince] = useState('');
  const [depCountry, setDepCountry] = useState('');

  // Arrival fields
  const [arrStreet, setArrStreet] = useState('');
  const [arrNumber, setArrNumber] = useState('');
  const [arrPostalCode, setArrPostalCode] = useState('');
  const [arrCity, setArrCity] = useState('');
  const [arrProvince, setArrProvince] = useState('');
  const [arrCountry, setArrCountry] = useState('');

  const [arrivalDate, setArrivalDate] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [length, setLength] = useState('');
  const [weight, setWeight] = useState('');
  const [refrigerated, setRefrigerated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [trips, setTrips] = useState<TripDTO[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<number | null>(null);

  const handleFindResults = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!depStreet.trim() || !depNumber.trim() || !depPostalCode.trim() || 
        !depCity.trim() || !depProvince.trim() || !depCountry.trim() ||
        !arrStreet.trim() || !arrNumber.trim() || !arrPostalCode.trim() || 
        !arrCity.trim() || !arrProvince.trim() || !arrCountry.trim() ||
        !arrivalDate || !width || !height || !length || !weight) {
      alert('All fields are required.');
      return;
    }

    const departureAddress = `${depStreet} ${depNumber}, ${depPostalCode} ${depCity} ${depProvince}, ${depCountry}`;
    const arrivalAddress = `${arrStreet} ${arrNumber}, ${arrPostalCode} ${arrCity} ${arrProvince}, ${arrCountry}`;

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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shipmentData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMsg = responseData.message || 'Server error';
        if (errorMsg.includes('Address not found')) {
          alert('Address not found. Please verify:\n- Street name is correct\n- City and postal code match\n- Try using a nearby landmark or main street');
        } else {
          alert(errorMsg);
        }
        return;
      }
      
      // Extract trips from the new ApiResponseDTO format
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
    
    const selectedTripData = trips[selectedTrip];
    
    // Create the SelectedTripDTO with trip and shipment data
    const selectedTripDTO = {
      trip: {
        vehicleName: selectedTripData.vehicleName,
        arrivalDate: selectedTripData.arrivalDate,
        pathPolyline: selectedTripData.pathPolyline,
        distanceKm: selectedTripData.distanceKm,
        price: selectedTripData.price,
        scheduled: selectedTripData.alreadyScheduled,
        started: false
      },
      shipment: {
        vehicleName: selectedTripData.vehicleName,
        departureAddress: `${depStreet} ${depNumber}, ${depPostalCode} ${depCity} ${depProvince}, ${depCountry}`,
        arrivalAddress: `${arrStreet} ${arrNumber}, ${arrPostalCode} ${arrCity} ${arrProvince}, ${arrCountry}`,
        arrivalDate: arrivalDate,
        weight: parseInt(weight),
        width: parseInt(width),
        height: parseInt(height),
        length: parseInt(length),
        refrigerated: refrigerated
      }
    };

    try {
      setIsLoading(true);
      
      const response = await fetch('http://localhost:8081/api/carrier/selectTrip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      setDepStreet('');
      setDepNumber('');
      setDepPostalCode('');
      setDepCity('');
      setDepProvince('');
      setDepCountry('');
      setArrStreet('');
      setArrNumber('');
      setArrPostalCode('');
      setArrCity('');
      setArrProvince('');
      setArrCountry('');
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

  return (
    <div className="max-w-6xl mx-auto bg-gray-900 text-white p-8 mt-8 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">Send Parcel</h1>
      
      <form onSubmit={handleFindResults} className="space-y-6">
        {/* Departure Address */}
        <div>
          <h2 className="text-xl font-semibold mb-3">Departure Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="depStreet" className="block mb-2 font-medium">
                Street:
              </label>
              <input
                type="text"
                id="depStreet"
                placeholder="Enter street name"
                value={depStreet}
                onChange={(e) => setDepStreet(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="depNumber" className="block mb-2 font-medium">
                Number:
              </label>
              <input
                type="text"
                id="depNumber"
                placeholder="No."
                value={depNumber}
                onChange={(e) => setDepNumber(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label htmlFor="depPostalCode" className="block mb-2 font-medium">
                Postal Code:
              </label>
              <input
                type="text"
                id="depPostalCode"
                placeholder="ZIP/Postal Code"
                value={depPostalCode}
                onChange={(e) => setDepPostalCode(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="depCity" className="block mb-2 font-medium">
                City:
              </label>
              <input
                type="text"
                id="depCity"
                placeholder="City"
                value={depCity}
                onChange={(e) => setDepCity(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="depProvince" className="block mb-2 font-medium">
                Province:
              </label>
              <input
                type="text"
                id="depProvince"
                placeholder="Province/State"
                value={depProvince}
                onChange={(e) => setDepProvince(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="depCountry" className="block mb-2 font-medium">
              Country:
            </label>
            <input
              type="text"
              id="depCountry"
              placeholder="Country"
              value={depCountry}
              onChange={(e) => setDepCountry(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Arrival Address */}
        <div>
          <h2 className="text-xl font-semibold mb-3">Arrival Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="arrStreet" className="block mb-2 font-medium">
                Street:
              </label>
              <input
                type="text"
                id="arrStreet"
                placeholder="Enter street name"
                value={arrStreet}
                onChange={(e) => setArrStreet(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="arrNumber" className="block mb-2 font-medium">
                Number:
              </label>
              <input
                type="text"
                id="arrNumber"
                placeholder="No."
                value={arrNumber}
                onChange={(e) => setArrNumber(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label htmlFor="arrPostalCode" className="block mb-2 font-medium">
                Postal Code:
              </label>
              <input
                type="text"
                id="arrPostalCode"
                placeholder="ZIP/Postal Code"
                value={arrPostalCode}
                onChange={(e) => setArrPostalCode(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="arrCity" className="block mb-2 font-medium">
                City:
              </label>
              <input
                type="text"
                id="arrCity"
                placeholder="City"
                value={arrCity}
                onChange={(e) => setArrCity(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="arrProvince" className="block mb-2 font-medium">
                Province:
              </label>
              <input
                type="text"
                id="arrProvince"
                placeholder="Province/State"
                value={arrProvince}
                onChange={(e) => setArrProvince(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="arrCountry" className="block mb-2 font-medium">
              Country:
            </label>
            <input
              type="text"
              id="arrCountry"
              placeholder="Country"
              value={arrCountry}
              onChange={(e) => setArrCountry(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
            />
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
            disabled={selectedTrip === null}
            className="mt-6 w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default SendParcel;