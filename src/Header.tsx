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
              MusicVirus
            </a>
          </div>

          {/* Navigation */}
          <nav className="w-full md:w-auto flex flex-wrap justify-end gap-2 mt-4 md:mt-0">
            {!isLoggedIn ? (
              <>
                {/* Authentication Links */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:items-center gap-2 w-full md:w-auto">
                  <a href="/register-artist" className="text-center text-sm md:text-base px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200 shadow-md">
                    Registrati come artista
                  </a>
                  <a href="/login-artist" className="text-center text-sm md:text-base px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors duration-200 shadow-md">
                    Login artista
                  </a>
                  <a href="/login-carrier-manager" className="text-center text-sm md:text-base px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-200 shadow-md">
                    Login admin
                  </a>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {userType === "artist" && (
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <a href="/artist-edit-profile" className="text-center text-sm md:text-base px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors duration-200 shadow-md flex-1 md:flex-none">
                      Modifica Profilo
                    </a>
                    <a href="/artist-create-event" className="text-center text-sm md:text-base px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors duration-200 shadow-md flex-1 md:flex-none">
                      Crea campagna
                    </a>
                    <a href="/artist-view-campaigns" className="text-center text-sm md:text-base px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors duration-200 shadow-md flex-1 md:flex-none">
                      Storico campagne
                    </a>
                    <a href="/artist-view-feedbacks" className="text-center text-sm md:text-base px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors duration-200 shadow-md flex-1 md:flex-none">
                      Visualizza feedback
                    </a>
                  </div>
                )}
                
                {userType === "venue" && (
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <a href="/venue-accept-event" className="text-center text-sm md:text-base px-3 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors duration-200 shadow-md flex-1 md:flex-none">
                      Accetta eventi
                    </a>
                    <a href="/venue-write-feedback" className="text-center text-sm md:text-base px-3 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors duration-200 shadow-md flex-1 md:flex-none">
                      Scrivi feedback
                    </a>
                  </div>
                )}
                
                {userType === "admin" && (
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <a href="/admin-check-gains" className="text-center text-sm md:text-base px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-200 shadow-md flex-1 md:flex-none">
                      Controlla guadagni
                    </a>
                    <a href="/admin-modify-gain-percentage" className="text-center text-sm md:text-base px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-200 shadow-md flex-1 md:flex-none">
                      Modifica percentuale
                    </a>
                    <a href="/admin-confirm-artist" className="text-center text-sm md:text-base px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-200 shadow-md flex-1 md:flex-none">
                      Conferma artisti
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