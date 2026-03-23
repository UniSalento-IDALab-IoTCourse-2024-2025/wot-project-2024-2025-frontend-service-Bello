import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTheme } from "./App";

interface HeaderProps {
  isLoggedIn: boolean;
  onLogout: () => void;
  unreadNotifications?: number;
}

export default function Header({ isLoggedIn, onLogout, unreadNotifications = 0 }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem("role");
  const userEmail = localStorage.getItem("email");
  const { isDark, toggleTheme } = useTheme();

  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

  const navLinkClass = (path: string) =>
    `px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
      location.pathname === path
        ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/30"
        : "text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 backdrop-blur-lg border-b-2 border-gray-500 dark:border-gray-600">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-between items-center h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-display font-bold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <svg className="w-7 h-7 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
            ChillChain
          </Link>

          {/* Right side: Nav + Theme Toggle */}
          <div className="flex items-center gap-3">
            <nav className="flex flex-wrap items-center gap-2">
              {!isLoggedIn ? (
                <>
                  <Link
                    to="/register"
                    className={navLinkClass("/register")}
                  >
                    Register
                  </Link>
                  <Link
                    to="/login"
                    className={navLinkClass("/login")}
                  >
                    Login
                  </Link>
                </>
              ) : (
                <>
                  {userRole === "TECHNICIAN" ? (
                    <>
                      <Link
                        to="/vehicle-monitor"
                        className={navLinkClass("/vehicle-monitor")}
                      >
                        Monitor
                      </Link>
                      <Link
                        to="/reports"
                        className={navLinkClass("/reports")}
                      >
                        Reports
                      </Link>

                      {/* Notification bell with badge */}
                      <Link
                        to="/notifications"
                        className={`relative ${navLinkClass("/notifications")} flex items-center gap-1.5`}
                      >
                        <div className="relative">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                          </svg>
                          {unreadNotifications > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                              {unreadNotifications > 99 ? "99+" : unreadNotifications}
                            </span>
                          )}
                        </div>
                        Notifications
                      </Link>
                    </>
                  ) : userRole === "CLIENT" ? (
                    <>
                      <Link
                        to="/send-parcel"
                        className={navLinkClass("/send-parcel")}
                      >
                        Send a Parcel
                      </Link>
                      <Link
                        to="/my-shipments"
                        className={navLinkClass("/my-shipments")}
                      >
                        My Shipments
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/add-vehicle"
                        className={navLinkClass("/add-vehicle")}
                      >
                        Add Vehicle
                      </Link>
                      <Link
                        to="/add-technician"
                        className={navLinkClass("/add-technician")}
                      >
                        Add Technician
                      </Link>
                      <Link
                        to="/vehicle-list"
                        className={navLinkClass("/vehicle-list")}
                      >
                        Vehicles
                      </Link>
                      <Link
                        to="/trip-list"
                        className={navLinkClass("/trip-list")}
                      >
                        Trips
                      </Link>
                    </>
                  )}
                  {userEmail && (
                    <span className="hidden sm:block px-2 py-1 text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg truncate max-w-[180px]">
                      {userEmail}
                    </span>
                  )}
                  <span className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                  >
                    Logout
                  </button>
                </>
              )}
            </nav>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}