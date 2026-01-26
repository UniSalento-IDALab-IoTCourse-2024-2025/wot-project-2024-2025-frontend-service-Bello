import { useNavigate } from "react-router-dom";

interface HeaderProps {
  isLoggedIn: boolean;
  onLogout: () => void;
}

export default function Header({ isLoggedIn, onLogout }: HeaderProps) {
  const navigate = useNavigate();
  const userType = localStorage.getItem("userType");
  
  const handleLogout = () => {
    onLogout();
    navigate("/");
  };
  
  return (
    <header className="bg-gray-900 border-b border-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-between items-center py-3">
          {/* Logo/Brand */}
          <div className="flex items-center flex-shrink-0 mr-6">
            <a href="/" className="text-xl font-bold text-white hover:text-blue-400 transition-colors duration-200">
              Carrier platform
            </a>
          </div>

          {/* Navigation */}
          <nav className="w-full md:w-auto flex flex-wrap justify-end gap-2 mt-4 md:mt-0">
            {!isLoggedIn ? (
              <>
                {/* Authentication Links */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:items-center gap-2 w-full md:w-auto">
                  <a href="/login-carrier-manager" className="text-center text-sm md:text-base px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-200 shadow-md">
                    Login for Carrier Manager
                  </a>
                  <a href="/send-parcel" className="text-center text-sm md:text-base px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-200 shadow-md">
                    Send a parcel
                  </a>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {userType === "carrierManager" && (
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <a href="/add-vehicle" className="text-center text-sm md:text-base px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors duration-200 shadow-md flex-1 md:flex-none">
                      Add vehicle
                    </a>
                    <a href="/vehicle-list" className="text-center text-sm md:text-base px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors duration-200 shadow-md flex-1 md:flex-none">
                      Vehicle List
                    </a>
                    <a href="/trip-list" className="text-center text-sm md:text-base px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors duration-200 shadow-md flex-1 md:flex-none">
                      Trip List
                    </a>
                    <a href="/dashboard" className="text-center text-sm md:text-base px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors duration-200 shadow-md flex-1 md:flex-none">
                      Dashboard
                    </a>
                  </div>
                )}
                <button onClick={handleLogout} className="text-center text-sm md:text-base px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200 shadow-md ml-auto">
                  Logout
                </button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}