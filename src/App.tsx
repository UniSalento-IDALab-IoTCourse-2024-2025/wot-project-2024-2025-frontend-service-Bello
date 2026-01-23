import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./Header";
import AddVehicle from "./AddVehicle";
import CarrierManagerLoginForm from "./CarrierManagerLoginForm";
import HomePage from "./HomePage"; 

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);


  const handleLoginCarrierManager = (token: string) => {
    localStorage.setItem("jwt", token);
    localStorage.setItem("userType", "carrierManager"); 
    setIsLoggedIn(true);
  };


  const handleLogout = () => {
    localStorage.removeItem("jwt");
    localStorage.removeItem("userType");
    localStorage.removeItem("email");
    setIsLoggedIn(false);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-900">
        <Header isLoggedIn={isLoggedIn} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login-carrier-manager" element={<CarrierManagerLoginForm onLogin={handleLoginCarrierManager} />} />
          <Route path="/admin-check-gains" element={<AddVehicle />} />
        </Routes>
      </div>
    </Router>
  );
}

