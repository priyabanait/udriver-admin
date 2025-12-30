"use client";
import { useState } from "react";
import { Eye, EyeOff, Smartphone, User, Lock } from "lucide-react";

const DriverAuth = () => {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
  const [authMode, setAuthMode] = useState("login"); // 'login' or 'signup'
  const [loginType, setLoginType] = useState("password"); // 'password' or 'otp'
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async () => {
    setError("");
    if (!otpSent) {
      if (!mobile) {
        setError("Please enter your mobile number.");
        return;
      }
      setOtpSent(true);
    }
    // No backend call, just reveal OTP field
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let res, data;
      if (loginType === "password") {
        if (authMode === "signup") {
          if (!username || !mobile || !password) {
            setError("Please enter name, mobile number and password.");
            setLoading(false);
            return;
          }
          if (password !== confirmPassword) {
            setError("Passwords do not match.");
            setLoading(false);
            return;
          }
          // Investor Signup
          res = await fetch(`${API_BASE}/api/investors/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ investorName: username, phone: mobile, email: "", password }),
          });
        } else {
          // Investor Login
          if (!mobile || !password) {
            setError("Please enter mobile and password.");
            setLoading(false);
            return;
          }
          res = await fetch(`${API_BASE}/api/investors/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: mobile, password }),
          });
        }
        data = await res.json();
      } else {
        if (authMode === "signup") {
          if (!mobile || !otp) {
            setError("Please enter mobile and OTP.");
            setLoading(false);
            return;
          }
          // Investor Signup with mobile and OTP (password)
          res = await fetch(`${API_BASE}/api/investors/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ investorName: username, phone: mobile, email: "", password: otp }),
          });
        } else {
          // Investor Login with mobile and OTP (password)
          if (!mobile || !otp) {
            setError("Please enter mobile and OTP.");
            setLoading(false);
            return;
          }
          res = await fetch(`${API_BASE}/api/investors/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: mobile, password: otp }),
          });
        }
        data = await res.json();
      }
      if (res.ok) {
        // Store investor details in localStorage
        if (data.investorId) {
          localStorage.setItem('investor_id', data.investorId);
        }
        if (username) {
          localStorage.setItem('investor_name', username);
        }
        if (mobile) {
          localStorage.setItem('investor_phone', mobile);
        }
        
        alert(`${authMode === "login" ? "Login" : "Signup"} successful!`);
        // Redirect to plan selection page
        window.location.href = '/investors/select-plan';
      } else {
        setError(data.error || data.message || "Authentication failed.");
      }
    } catch (err) {
      setError("Network error. Try again.");
    }
    setLoading(false);
  };

  // ...existing code...

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#001730] via-[#002D62] to-[#004AAD] p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md text-white border border-white/20">
        <form onSubmit={handleSubmit}>
          {/* Title */}
          <h2 className="text-2xl font-semibold text-center mb-6">
            {authMode === "login" ? "Investor Login" : "Investor Signup"}
          </h2>

          {/* Login type toggle */}
          <div className="flex justify-center mb-6 bg-white/10 rounded-lg overflow-hidden">
            <button
              type="button"
              className={`w-1/2 py-2 font-semibold transition-all ${
                loginType === "password"
                  ? "bg-[#00C6FF] text-[#001730]"
                  : "text-white hover:bg-white/10"
              }`}
              onClick={() => {
                setLoginType("password");
                setOtpSent(false);
              }}
            >
              Mobile & Password
            </button>
            <button
              type="button"
              className={`w-1/2 py-2 font-semibold transition-all ${
                loginType === "otp"
                  ? "bg-[#00C6FF] text-[#001730]"
                  : "text-white hover:bg-white/10"
              }`}
              onClick={() => {
                setLoginType("otp");
                setOtpSent(false);
              }}
            >
              Mobile OTP
            </button>
          </div>

          {/* Error message display */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Username + Password Login */}
          {loginType === "password" && (
            <>
              {/* Username (Signup only) */}
              {authMode === "signup" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300"
                      size={18}
                    />
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-white/10 border border-gray-300/20 rounded-lg py-2 px-10 focus:outline-none focus:ring-2 focus:ring-[#00C6FF] placeholder-gray-300 text-white"
                    />
                  </div>
                </div>
              )}

              {/* Mobile Number (Required for both login and signup) */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Mobile Number</label>
                <div className="relative">
                  <Smartphone
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300"
                    size={18}
                  />
                  <input
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full bg-white/10 border border-gray-300/20 rounded-lg py-2 px-10 focus:outline-none focus:ring-2 focus:ring-[#00C6FF] placeholder-gray-300 text-white"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Password</label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300"
                    size={18}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/10 border border-gray-300/20 rounded-lg py-2 px-10 focus:outline-none focus:ring-2 focus:ring-[#00C6FF] placeholder-gray-300 text-white"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-300"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (Signup only) */}
              {authMode === "signup" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300"
                      size={18}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white/10 border border-gray-300/20 rounded-lg py-2 px-10 focus:outline-none focus:ring-2 focus:ring-[#00C6FF] placeholder-gray-300 text-white"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Mobile + OTP Login */}
          {loginType === "otp" && (
            <>
              {/* Mobile */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Mobile Number</label>
                <div className="relative">
                  <Smartphone
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300"
                    size={18}
                  />
                  <input
                    type="tel"
                    placeholder="Enter your mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full bg-white/10 border border-gray-300/20 rounded-lg py-2 px-10 focus:outline-none focus:ring-2 focus:ring-[#00C6FF] placeholder-gray-300 text-white"
                  />
                </div>
              </div>

              {/* Send OTP Button */}
              {!otpSent && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="w-full mb-4 bg-white/10 hover:bg-white/20 border border-[#00C6FF] text-white font-semibold py-2 rounded-lg transition-all"
                >
                  Send OTP
                </button>
              )}

              {/* OTP Field */}
              {otpSent && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Enter OTP (Password)</label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300"
                      size={18}
                    />
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter your password as OTP"
                      className="w-full bg-white/10 border border-gray-300/20 rounded-lg py-2 px-10 focus:outline-none focus:ring-2 focus:ring-[#00C6FF] placeholder-gray-300 text-white"
                    />
                  </div>
                  <p className="text-xs text-gray-300 mt-2">
                    Enter your password as the OTP
                  </p>
                </div>
              )}

             
            </>
          )}

          {/* Main Submit Button */}
          <button type="submit" className="w-full bg-[#00C6FF] hover:bg-[#009EE3] text-[#001730] font-semibold py-2 rounded-lg transition-all">
            {authMode === "login" ? "Login" : "Sign Up"}
          </button>

          {/* Switch between Login / Signup */}
          <p className="text-center text-sm text-gray-300 mt-6">
            {authMode === "login" ? "Don’t have an account? " : "Already have an account? "}
            <button
              type="button"
              className="text-[#00C6FF] hover:underline"
              onClick={() => {
                setAuthMode(authMode === "login" ? "signup" : "login");
                setOtpSent(false);
              }}
            >
              {authMode === "login" ? "Sign Up" : "Login"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default DriverAuth;
