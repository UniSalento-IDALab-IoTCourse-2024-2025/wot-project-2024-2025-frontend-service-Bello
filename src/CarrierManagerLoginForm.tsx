import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface CarrierManagerLoginFormProps {
  onLogin: (token: string) => void;
}

export default function CarrierManagerLoginForm({ onLogin }: CarrierManagerLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      alert("All fields are required.");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("http://localhost:8081/api/carrier/authenticate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        alert(responseData.message || "Server error");
        return;
      }

      // Extract JWT from the new ApiResponseDTO format
      const jwt = responseData.body?.jwt || responseData.body;
      
      if (!jwt) {
        alert("Authentication failed: No token received");
        return;
      }

      onLogin(jwt);
      localStorage.setItem("email", email);
      navigate("/add-vehicle");

    } catch (err) {
      console.error(err);
      alert("Failed to communicate with the server");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="max-w-md mx-auto bg-gray-900 text-white p-8 mt-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Login Carrier Manager</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-5">
          <label htmlFor="email" className="block mb-2">Email:</label>
          <input
            type="email"
            id="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
          />
        </div>
        <div className="mb-6">
          <label htmlFor="password" className="block mb-2">Password:</label>
          <input
            type="password"
            id="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:border-gray-500 focus:outline-none"
          />
        </div>
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium"
        >
          {isLoading ? "Loading..." : "Log In"}
        </button>
      </form>
    </div>
  );
}