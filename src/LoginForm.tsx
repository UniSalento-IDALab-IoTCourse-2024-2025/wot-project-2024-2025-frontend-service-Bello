import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast, ToastContainer } from './Toast';

interface CarrierManagerLoginFormProps {
  onLogin: (token: string) => void;
}

export default function CarrierManagerLoginForm({ onLogin }: CarrierManagerLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toasts, showToast, dismissToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      showToast("All fields are required.", "warning");
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
        showToast(responseData.message || "Server error");
        return;
      }

      // DEBUG: stampa la risposta completa
      console.log("Response data:", responseData);

      // Estrai JWT e ruolo dalla risposta
      const authResponse = responseData.body;
      const jwt = authResponse?.jwt;
      const role = authResponse?.role;

      console.log("Auth response:", authResponse);
      console.log("JWT:", jwt);
      console.log("Role:", role);

      if (!jwt) {
        showToast("Authentication failed: No token received");
        return;
      }

      localStorage.setItem("email", email);
      localStorage.setItem("role", role || "CLIENT");
      onLogin(jwt);
      
      // Naviga al percorso giusto in base al ruolo
      if (role === "TECHNICIAN") {
        navigate("/vehicle-monitor");
      } else {
        navigate("/trip-list");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to communicate with the server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 w-full">
      <div className="w-full max-w-lg">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-500 dark:border-gray-600 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-950/50 border-2 border-primary-300 dark:border-transparent flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              Carrier Manager Login
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Sign in to manage your fleet
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-500 dark:border-gray-500 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-500 dark:border-gray-500 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}