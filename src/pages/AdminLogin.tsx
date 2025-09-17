import { Component, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { FiShield, FiEye, FiEyeOff } from "solid-icons/fi";
import { authService } from "../services/supabase";
import SEOHead from "../components/seo/SEOHead";
import { createServiceLogger } from "../utils/logger";

const logger = createServiceLogger('AdminLogin');

const AdminLogin: Component = () => {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [showPassword, setShowPassword] = createSignal(false);
  const [attempts, setAttempts] = createSignal(0);

  // Security: Check if user is already authenticated as admin
  onMount(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      if (currentUser && currentUser.role === "admin") {
        navigate("/admin");
      }
    } catch (error) {
      // User not authenticated, stay on login page
    }
  });

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    
    if (!email() || !password()) {
      setError("Please enter both email and password");
      return;
    }

    // Security: Rate limiting
    if (attempts() >= 5) {
      setError("Too many failed attempts. Please try again later.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const user = await authService.signInWithEmail(email(), password());
      
      // Verify admin role
      if (user.role !== "admin") {
        await authService.signOut(); // Immediately sign out non-admin users
        throw new Error("Unauthorized access");
      }

      // Success - redirect to admin panel
      navigate("/admin");
    } catch (error) {
      logger.error("Admin login failed:", error);
      setAttempts(attempts() + 1);
      
      if (attempts() >= 4) {
        setError("Too many failed attempts. Access temporarily blocked.");
      } else {
        setError("Invalid credentials. Please check your email and password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword());
  };

  return (
    <>
      <SEOHead 
        title="ChatWii - Admin Login"
        description="Secure admin login for ChatWii management dashboard."
      />
      
      <div class="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 flex items-center justify-center p-4">
      {/* Security Warning Overlay */}
      <div class="absolute inset-0 bg-red-500/5 dark:bg-red-500/10"></div>
      
      <div class="relative z-10 w-full max-w-md">
        {/* Security Header */}
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4">
            <FiShield class="w-8 h-8 text-white" />
          </div>
          <h1 class="text-2xl font-bold text-red-800 dark:text-red-200">
            System Management
          </h1>
          <p class="text-red-600 dark:text-red-400 text-sm mt-2">
            Authorized Personnel Only
          </p>
        </div>

        {/* Login Form */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 border border-red-200 dark:border-red-700">
          <form onSubmit={handleLogin} class="space-y-6">
            {/* Error Message */}
            {error() && (
              <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
                <p class="text-red-700 dark:text-red-300 text-sm text-center">
                  {error()}
                </p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Administrator Email
              </label>
              <input
                type="email"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                placeholder="Enter your admin email"
                required
                disabled={loading()}
                class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors disabled:opacity-50"
              />
            </div>

            {/* Password Field */}
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div class="relative">
                <input
                  type={showPassword() ? "text" : "password"}
                  value={password()}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loading()}
                  class="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  disabled={loading()}
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                >
                  {showPassword() ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading() || !email() || !password() || attempts() >= 5}
              class="w-full py-3 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading() ? (
                <div class="flex items-center justify-center gap-2">
                  <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                "Access Admin Panel"
              )}
            </button>

            {/* Attempt Counter */}
            {attempts() > 0 && (
              <div class="text-center">
                <p class="text-xs text-red-600 dark:text-red-400">
                  Failed attempts: {attempts()}/5
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Security Footer */}
        <div class="mt-8 text-center">
          <p class="text-xs text-red-600 dark:text-red-400">
            ⚠️ All login attempts are logged and monitored
          </p>
          <p class="text-xs text-red-500 dark:text-red-500 mt-1">
            Unauthorized access is strictly prohibited
          </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default AdminLogin;