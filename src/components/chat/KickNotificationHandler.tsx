import { Component, createSignal, onMount, onCleanup, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { kickService, type KickNotification } from "../../services/supabase/kickService";
import { authService } from "../../services/supabase";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('KickNotificationHandler');

interface KickNotificationHandlerProps {
  userId?: string;
}

const KickNotificationHandler: Component<KickNotificationHandlerProps> = (props) => {
  const navigate = useNavigate();
  const [showKickWarning, setShowKickWarning] = createSignal(false);
  const [kickReason, setKickReason] = createSignal<string>("");
  const [countdown, setCountdown] = createSignal(5);
  
  let unsubscribeKickNotifications: (() => void) | undefined;
  let countdownInterval: number | undefined;
  let redirectTimeout: number | undefined;

  onMount(async () => {
    const userId = props.userId;
    if (!userId) return;

    // Check if user was kicked while offline
    await checkOfflineKickStatus(userId);

    // Subscribe to real-time kick notifications
    unsubscribeKickNotifications = kickService.subscribeToKickNotifications(
      userId,
      handleKickNotification
    );
  });

  onCleanup(() => {
    if (unsubscribeKickNotifications) {
      unsubscribeKickNotifications();
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    if (redirectTimeout) {
      clearTimeout(redirectTimeout);
    }
  });

  // Check if user was kicked while offline
  const checkOfflineKickStatus = async (userId: string) => {
    try {
      const kickStatus = await kickService.getKickStatus(userId);
      if (kickStatus && kickStatus.isKicked) {
        // User was kicked while offline, show notification
        handleKickNotification({
          userId: kickStatus.userId,
          reason: kickStatus.reason,
          kickedBy: kickStatus.kickedBy || 'Admin',
          kickedAt: kickStatus.kickedAt || new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error("Error checking offline kick status:", error);
    }
  };

  // Handle kick notification
  const handleKickNotification = (notification: KickNotification) => {
    logger.info("User kicked:", notification);
    
    setKickReason(notification.reason || "No reason provided");
    setShowKickWarning(true);
    setCountdown(5);

    // Start countdown
    countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownInterval) {
            clearInterval(countdownInterval);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Redirect after 5 seconds
    redirectTimeout = setTimeout(async () => {
      await handleRedirectToLanding();
    }, 5000);
  };

  // Handle redirect to landing page
  const handleRedirectToLanding = async () => {
    try {
      // Clear kick status
      const userId = props.userId;
      if (userId) {
        await kickService.clearKickStatus(userId);
      }

      // Sign out user
      await authService.signOut();
      
      // Clear local storage
      localStorage.clear();
      
      // Navigate to landing page
      navigate("/");
    } catch (error) {
      logger.error("Error during kick redirect:", error);
      // Force redirect even if cleanup fails
      navigate("/");
    }
  };

  // Handle manual close (if user clicks close before countdown)
  const handleCloseWarning = async () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    if (redirectTimeout) {
      clearTimeout(redirectTimeout);
    }
    
    await handleRedirectToLanding();
  };

  return (
    <Show when={showKickWarning()}>
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <div class="flex items-center mb-4">
            <div class="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mr-4">
              <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                You have been kicked
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                You will be redirected in {countdown()} seconds
              </p>
            </div>
          </div>
          
          <div class="mb-4">
            <p class="text-sm text-gray-700 dark:text-gray-300 mb-2">
              <strong>Reason:</strong>
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-neutral-700 p-3 rounded">
              {kickReason()}
            </p>
          </div>

          <div class="mb-4">
            <div class="w-full bg-gray-200 dark:bg-neutral-600 rounded-full h-2">
              <div 
                class="bg-red-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${((5 - countdown()) / 5) * 100}%` }}
              />
            </div>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              onClick={handleCloseWarning}
              class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              Leave Now
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default KickNotificationHandler;