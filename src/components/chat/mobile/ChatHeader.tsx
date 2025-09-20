import { Component, createSignal, createEffect, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { FiInbox, FiSettings, FiLogOut, FiClock, FiShield, FiUsers } from "solid-icons/fi";
import Logo from "../../shared/Logo";
import ThemeToggle from "../../shared/ThemeToggle";
import LogoutConfirmModal from "../../shared/LogoutConfirmModal";
import { authService, messageService } from "../../../services/supabase";
import { tabNotification } from "../../../utils/tabNotification";
import type { User } from "../../../types/user.types";

interface ChatHeaderProps {
  user: User | null;
  onToggleInbox: () => void;
  onToggleHistory: () => void;
  onToggleUserList?: () => void; // Mobile user list toggle
  onlineCount: number;
  selectedUser?: User | null; // To show/hide user list button
}

const ChatHeader: Component<ChatHeaderProps> = (props) => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = createSignal(0);
  const [showLogoutModal, setShowLogoutModal] = createSignal(false);
  
  let unreadUnsubscribe: (() => void) | null = null;
  
  // Initialize tab notification
  tabNotification.init();

  // Listen to unread message count
  createEffect(() => {
    if (!props.user) return;

    // Clean up previous listener
    if (unreadUnsubscribe) {
      unreadUnsubscribe();
    }

    // Set up new listener
    unreadUnsubscribe = messageService.listenToUnreadCount(
      props.user.id,
      (count) => {
        setUnreadCount(count);
        // Also update the browser tab title
        tabNotification.updateTitle(count);
      }
    );

    return () => {
      if (unreadUnsubscribe) {
        unreadUnsubscribe();
      }
    };
  });

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);
    // Reset tab notification on logout
    tabNotification.resetTitle();

    try {
      // Stop background listeners first to prevent 403 errors
      if (unreadUnsubscribe) {
        unreadUnsubscribe();
        unreadUnsubscribe = null;
      }

      // Sign out with proper error handling
      await authService.signOut();
    } catch (error) {
      console.warn("Logout error (expected during session expiry):", error);
      // Continue to feedback even if logout has errors
    }

    // Always navigate to feedback regardless of logout errors
    navigate("/feedback");
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const handleAdminPanel = () => {
    navigate("/admin");
  };

  const isAdmin = () => props.user?.role === "admin";

  return (
    <header class="h-16 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-3 flex items-center justify-between">
      <div class="flex items-center gap-2 sm:gap-4">
        {/* Mobile User List Button - always show on mobile */}
        <Show when={props.onToggleUserList}>
          <button
            onClick={props.onToggleUserList}
            class="relative z-50 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors md:hidden flex items-center justify-center shadow-lg"
            aria-label="Open User List"
            title="View Users"
          >
            <FiUsers class="w-5 h-5 text-white" />
          </button>
        </Show>
        
        <Logo />
        
        {/* Online count - hide on very small screens */}
        <div class="hidden xs:flex items-center gap-2 text-sm">
          <span class="text-text-600 dark:text-text-400">Online:</span>
          <span class="font-medium text-secondary-500">{props.onlineCount}</span>
        </div>
      </div>

      <div class="flex items-center gap-1 sm:gap-2">
        <button
          onClick={props.onToggleInbox}
          class="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors relative"
          aria-label="Inbox"
        >
          <FiInbox class="w-4 h-4 sm:w-5 sm:h-5 text-text-600 dark:text-text-400" />
          <Show when={unreadCount() > 0}>
            <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] flex items-center justify-center px-1 text-[10px] sm:text-xs">
              {unreadCount() > 99 ? '99+' : unreadCount()}
            </span>
          </Show>
        </button>

        {/* History button - hide on very small screens */}
        <button
          onClick={props.onToggleHistory}
          class="hidden sm:flex p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          aria-label="History"
        >
          <FiClock class="w-5 h-5 text-text-600 dark:text-text-400" />
        </button>

        <Show when={isAdmin()}>
          <button
            onClick={handleAdminPanel}
            class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors relative"
            aria-label="Admin Panel"
            title="Admin Panel"
          >
            <FiShield class="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
            <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-1.5 h-1.5 sm:w-2 sm:h-2"></span>
          </button>
        </Show>

        <ThemeToggle />

        <button
          onClick={handleLogoutClick}
          class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          aria-label="Logout"
        >
          <FiLogOut class="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
        </button>
      </div>
      
      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal()}
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </header>
  );
};

export default ChatHeader;
