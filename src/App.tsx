import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./Header";
import AddVehicle from "./AddVehicle";
import VehicleList from "./VehicleList";
import TripList from "./TripList";
import Dashboard from "./Dashboard";
import LoginForm from "./LoginForm";
import SendParcel from "./SendParcel";
import HomePage from "./HomePage";

// Theme context
interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Apply dark class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    const role = localStorage.getItem("role");
    if (token) {
      setIsLoggedIn(true);
      setUserRole(role);
    }
  }, []);

  const handleLogin = (token: string) => {
    localStorage.setItem("jwt", token);
    const role = localStorage.getItem("role");
    setUserRole(role);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    localStorage.removeItem("userType");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    setIsLoggedIn(false);
    setUserRole(null);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
          <Header isLoggedIn={isLoggedIn} onLogout={handleLogout} />
          <main className="pb-12">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/login"
                element={
                  <LoginForm
                    onLogin={handleLogin}
                  />
                }
              />
              {userRole === "TECHNICIAN" ? (
                // TECHNICIAN vede SOLO il Dashboard
                <Route path="/dashboard" element={<Dashboard />} />
              ) : (
                // ADMIN vede tutto il resto
                <>
                  <Route path="/add-vehicle" element={<AddVehicle />} />
                  <Route path="/send-parcel" element={<SendParcel />} />
                  <Route path="/vehicle-list" element={<VehicleList />} />
                  <Route path="/trip-list" element={<TripList />} />
                </>
              )}
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeContext.Provider>
  );
}