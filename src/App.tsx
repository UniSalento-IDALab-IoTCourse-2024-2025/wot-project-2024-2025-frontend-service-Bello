import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./Header";
import AddVehicle from "./AddVehicle";
import AddTechnician from "./AddTechnician";
import VehicleList from "./VehicleList";
import TripList from "./TripList";
import TripShipments from "./TripShipments";
import LoginForm from "./LoginForm";
import Register from "./Register";
import SendParcel from "./SendParcel";
import ClientShipments from "./ClientShipments";
import HomePage from "./HomePage";
import VehicleMonitor from "./VehicleMonitor";
import Notifications from "./Notifications";

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
  const [userRole, setUserRole] = useState<string | null>(
    () => localStorage.getItem("role")  
  );
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
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
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  
  // Poll unread notifications count for Technician
  useEffect(() => {
    if (!isLoggedIn || userRole !== "TECHNICIAN") return;

    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const res = await fetch("http://localhost:8081/api/carrier/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const unread = (data.body || []).filter((n: { read: boolean }) => !n.read).length;
        setUnreadNotifications(unread);
      } catch (e) {
        console.error("Error fetching unread count:", e);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // ogni 30 secondi
    return () => clearInterval(interval);
  }, [isLoggedIn, userRole]);

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
    localStorage.removeItem("userId");
    setIsLoggedIn(false);
    setUserRole(null);
    setUnreadNotifications(0);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <Router>
        <div className="min-h-screen bg-gray-300 dark:bg-gray-950 transition-colors">
          <Header
            isLoggedIn={isLoggedIn}
            onLogout={handleLogout}
            unreadNotifications={unreadNotifications}
          />
          <main className="pb-12">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginForm onLogin={handleLogin} />} />
              <Route path="/register" element={<Register />} />
              <Route path="/vehicle-monitor" element={<VehicleMonitor />} />
              <Route path="/notifications" element={<Notifications onUnreadCountChange={setUnreadNotifications} />} />
              <Route path="/add-vehicle" element={<AddVehicle />} />
              <Route path="/add-technician" element={<AddTechnician />} />
              <Route path="/send-parcel" element={<SendParcel />} />
              <Route path="/my-shipments" element={<ClientShipments />} />
              <Route path="/vehicle-list" element={<VehicleList />} />
              <Route path="/trip-list" element={<TripList />} />
              <Route path="/trip-list/:tripId/shipments" element={<TripShipments />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeContext.Provider>
  );
}