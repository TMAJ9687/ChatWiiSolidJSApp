import { Component, createSignal, onMount, onCleanup } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { authService, presenceService } from "../services/supabase";
import SEOHead from "../components/seo/SEOHead";

const Idle: Component = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [cooldownTime, setCooldownTime] = createSignal(30 * 60); // 30 minutes in seconds

  let interval: NodeJS.Timeout;

  onMount(() => {
    // Start cooldown timer
    interval = setInterval(() => {
      setCooldownTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleNewSession(); // Auto new session after cooldown
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  });

  onCleanup(() => {
    if (interval) clearInterval(interval);
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleReconnect = async () => {
    // User wants to continue with same session
    const userId = location.state?.userId;
    if (userId) {
      // Re-establish presence
      const user = await authService.getCurrentUser();
      if (user) {
        await presenceService.setUserOnline(user);
        navigate("/chat");
      }
    }
  };

  const handleNewSession = async () => {
    // Clean up current session and start fresh
    await authService.signOut();
    navigate("/feedback");
  };

  return (
    <>
      <SEOHead 
        title="ChatWii - Session Paused"
        description="Session paused due to inactivity."
      />
      
      <div class="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 flex items-center justify-center">
      <div class="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div class="text-center">
          <div class="mb-6">
            <div class="w-20 h-20 bg-warning-100 dark:bg-warning-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-4xl">⏰</span>
            </div>
            <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-2">
              You've been idle
            </h2>
            <p class="text-text-600 dark:text-text-400">
              You were inactive for 30 minutes
            </p>
          </div>

          <div class="mb-8">
            <div class="text-4xl font-mono font-bold text-secondary-500 mb-2">
              {formatTime(cooldownTime())}
            </div>
            <p class="text-sm text-text-400 dark:text-text-600">
              Session expires in
            </p>
          </div>

          <div class="space-y-3">
            <button
              onClick={handleReconnect}
              class="w-full py-3 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg font-medium transition-colors"
            >
              Reconnect to Chat
            </button>

            <button
              onClick={handleNewSession}
              class="w-full py-3 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-text-800 dark:text-text-200 rounded-lg font-medium transition-colors"
            >
              Start New Session
            </button>
          </div>

          <p class="mt-6 text-xs text-text-400 dark:text-text-600">
            Choosing "New Session" will free your nickname and start fresh.
            Choosing "Reconnect" will keep your current session.
          </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default Idle;
