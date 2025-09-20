import {
  Component,
  createSignal,
  onMount,
  onCleanup,
  For,
  Show,
} from "solid-js";
import { FiUsers } from "solid-icons/fi";
import { useNavigate } from "@solidjs/router";
// Desktop components
import DesktopChatHeader from "../components/chat/desktop/ChatHeader";
import DesktopUserListSidebar from "../components/chat/desktop/UserListSidebar";
import DesktopChatArea from "../components/chat/desktop/ChatArea";
import DesktopInboxSidebar from "../components/chat/desktop/InboxSidebar";
import DesktopHistorySidebar from "../components/chat/desktop/HistorySidebar";
import DesktopSiteRulesModal from "../components/chat/desktop/SiteRulesModal";
// Mobile components
import MobileChatHeader from "../components/chat/mobile/ChatHeader";
import MobileUserListSidebar from "../components/chat/mobile/UserListSidebar";
import MobileChatArea from "../components/chat/mobile/ChatArea";
import MobileInboxSidebar from "../components/chat/mobile/InboxSidebar";
import MobileHistorySidebar from "../components/chat/mobile/HistorySidebar";
import MobileSiteRulesModal from "../components/chat/mobile/SiteRulesModal";
import ConnectionStatus from "../components/shared/ConnectionStatus";
import KickNotificationHandler from "../components/chat/KickNotificationHandler";
import { authService, presenceService } from "../services/supabase";
import { idleService } from "../services/idleService";
import { sessionManager } from "../services/sessionManager";
import { useAnalytics } from "../hooks/useAnalytics";
import SEOHead from "../components/seo/SEOHead";
import type { User } from "../types/user.types";

const Chat: Component = () => {
  const navigate = useNavigate();
  const analytics = useAnalytics();
  const [currentUser, setCurrentUser] = createSignal<User | null>(null);
  const [selectedUser, setSelectedUser] = createSignal<User | null>(null);
  const [onlineUsers, setOnlineUsers] = createSignal<User[]>([]);
  const [isInboxOpen, setIsInboxOpen] = createSignal(false);
  const [isHistoryOpen, setIsHistoryOpen] = createSignal(false);
  const [showSiteRules, setShowSiteRules] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [showFilterPopup, setShowFilterPopup] = createSignal(false);
  const [hasActiveFilters, setHasActiveFilters] = createSignal(false);
  const [isUserListOpen, setIsUserListOpen] = createSignal(false);
  const [isMobile, setIsMobile] = createSignal(false);

  let unsubscribePresence: (() => void) | undefined;

  // Mobile detection
  const checkMobile = () => {
    const isMobileDevice = window.innerWidth < 768; // md breakpoint
    setIsMobile(isMobileDevice);
  };

  onMount(async () => {
    // Initialize mobile detection
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Dynamic height adjustment for mobile browsers
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH();
    
    // Listen for resize events
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    
    // Use visualViewport API if available
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setVH);
    }

    // Add browser back button warning
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave the chat? You will lose your current conversation.';
      return 'Are you sure you want to leave the chat? You will lose your current conversation.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    const user = await authService.getCurrentUser();
    if (!user) {
      // If user is not authenticated, redirect to landing page
      navigate("/");
      return;
    }
    setCurrentUser(user);

    // Track user entering chat and identify them for analytics
    analytics.trackPageView('chat');
    analytics.identifyUser(user.id, user.nickname);
    analytics.setUserProperty('user_role', user.role);
    analytics.setUserProperty('user_gender', user.gender);
    analytics.setUserProperty('user_country', user.country);
    analytics.setUserProperty('page_type', 'chat');

    // Check if user has accepted site rules
    const hasAcceptedRules = localStorage.getItem(`site-rules-accepted-${user.id}`);
    
    if (!hasAcceptedRules) {
      // Show site rules modal after 5 seconds
      setTimeout(() => {
        setShowSiteRules(true);
      }, 5000);
    }

    // Initialize session manager for persistent auth
    await sessionManager.initialize(user, navigate);

    // Set user as online first
    await presenceService.setUserOnline(user);

    // Initialize idle detection
    idleService.initialize(user.id, navigate);

    // Listen to online users
    unsubscribePresence = presenceService.listenToOnlineUsers((users) => {
      // Filter out current user from the list
      const filteredUsers = users.filter((u) => u.id !== user.id);
      setOnlineUsers(filteredUsers);
    });
  });

  onCleanup(() => {
    // Cleanup session manager
    sessionManager.cleanup();

    if (unsubscribePresence) {
      unsubscribePresence();
    }
    
    // Clean up resize listener
    window.removeEventListener('resize', checkMobile);
    
    // Clean up viewport height listeners
    window.removeEventListener('resize', () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    });
    window.removeEventListener('orientationchange', () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    });
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      });
    }
    
    // Clean up beforeunload listener
    window.removeEventListener('beforeunload', (e) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave the chat? You will lose your current conversation.';
      return 'Are you sure you want to leave the chat? You will lose your current conversation.';
    });
    
    // Set user offline when component unmounts
    const user = currentUser();
    if (user) {
      // Use enhanced cleanup for proper user handling
      import('../services/supabase/enhancedCleanupService').then(({ enhancedCleanupService }) => {
        enhancedCleanupService.handleLogout(user);
      });
    }
    
    // Clean up presence service
    presenceService.cleanup();
    idleService.cleanup();
  });

  // Handler for selecting a user
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    // Always close mobile user list when user is selected
    setIsUserListOpen(false);
  };

  // Handler for closing chat
  const handleCloseChat = () => {
    setSelectedUser(null);
  };

  // Mobile user list toggle
  const handleToggleUserList = () => {
    setIsUserListOpen(!isUserListOpen());
  };

  // Sidebar toggle handlers
  const handleToggleInbox = () => {
    setIsInboxOpen(!isInboxOpen());
    if (isHistoryOpen()) setIsHistoryOpen(false);
  };

  const handleToggleHistory = () => {
    setIsHistoryOpen(!isHistoryOpen());
    if (isInboxOpen()) setIsInboxOpen(false);
  };

  // Handle user selection from sidebars
  const handleUserSelectionFromSidebar = (user: User) => {
    setSelectedUser(user);
    // Close any open sidebars
    setIsInboxOpen(false);
    setIsHistoryOpen(false);
  };

  // Site rules handlers
  const handleAcceptRules = () => {
    const user = currentUser();
    if (user) {
      localStorage.setItem(`site-rules-accepted-${user.id}`, 'true');
      setShowSiteRules(false);
    }
  };

  const handleDeclineRules = () => {
    // Kick user out - clear session and redirect
    localStorage.clear();
    authService.signOut();
    navigate("/");
  };

  // Search and filter handlers
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleToggleFilter = () => {
    setShowFilterPopup(!showFilterPopup());
  };

  const onlineCount = () => onlineUsers().filter((u) => u.online).length;



  // Dynamically choose components based on device type
  const ChatHeader = isMobile() ? MobileChatHeader : DesktopChatHeader;
  const UserListSidebar = isMobile() ? MobileUserListSidebar : DesktopUserListSidebar;
  const ChatArea = isMobile() ? MobileChatArea : DesktopChatArea;
  const InboxSidebar = isMobile() ? MobileInboxSidebar : DesktopInboxSidebar;
  const HistorySidebar = isMobile() ? MobileHistorySidebar : DesktopHistorySidebar;
  const SiteRulesModal = isMobile() ? MobileSiteRulesModal : DesktopSiteRulesModal;

  return (
    <>
      <SEOHead 
        title="ChatWii - Chat"
        description="Anonymous chat with people worldwide. Safe, private conversations."
      />
      
      <div class="mobile-viewport flex flex-col bg-neutral-50 dark:bg-neutral-900 relative">
        <Show when={isMobile()}>
          <ChatHeader 
            user={currentUser()} 
            onToggleInbox={handleToggleInbox}
            onToggleHistory={handleToggleHistory}
            onToggleUserList={handleToggleUserList}
            onlineCount={onlineCount()}
            selectedUser={selectedUser()}
          />
        </Show>
        
        <Show when={!isMobile()}>
          <ChatHeader 
            user={currentUser()} 
            onToggleInbox={handleToggleInbox}
            onToggleHistory={handleToggleHistory}
            onlineCount={onlineCount()}
          />
        </Show>

        <div class="flex-1 flex overflow-hidden relative w-full max-w-full min-w-0">
          <Show when={isMobile()}>
            {/* Mobile Layout - Show either user list OR chat, never both */}
            <Show when={isUserListOpen()}>
              {/* User List Overlay - Full screen on mobile */}
              <UserListSidebar
                users={onlineUsers()}
                selectedUser={selectedUser()}
                onSelectUser={handleSelectUser}
                currentUser={currentUser()}
                isOpen={true}
                onClose={() => setIsUserListOpen(false)}
              />
            </Show>

            <Show when={!isUserListOpen()}>
              {/* Chat Area - Show when user is selected and user list is closed */}
              <Show when={selectedUser()}>
                <ChatArea
                  currentUser={currentUser()}
                  selectedUser={selectedUser()}
                  onCloseChat={handleCloseChat}
                />
              </Show>

              {/* Welcome Screen - Show when no user selected and user list is closed */}
              <Show when={!selectedUser()}>
                <div class="flex-1 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
                  <div class="text-center text-text-500 dark:text-text-400">
                    <FiUsers class="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p class="text-lg font-medium mb-2">Welcome to ChatWii</p>
                    <p class="text-sm">Tap the users icon in the header to find someone to chat with</p>
                  </div>
                </div>
              </Show>
            </Show>
          </Show>

          <Show when={!isMobile()}>
            {/* Desktop Layout */}
            <UserListSidebar
              users={onlineUsers()}
              selectedUser={selectedUser()}
              onSelectUser={handleSelectUser}
              currentUser={currentUser()}
            />

            <ChatArea
              currentUser={currentUser()}
              selectedUser={selectedUser()}
              onCloseChat={handleCloseChat}
            />
          </Show>
        </div>

        {/* Inbox Sidebar */}
        <InboxSidebar
          isOpen={isInboxOpen()}
          onClose={() => setIsInboxOpen(false)}
          currentUser={currentUser()}
          onlineUsers={onlineUsers()}
          onSelectUser={handleUserSelectionFromSidebar}
        />

        {/* History Sidebar */}
        <HistorySidebar
          isOpen={isHistoryOpen()}
          onClose={() => setIsHistoryOpen(false)}
          currentUser={currentUser()}
          onlineUsers={onlineUsers()}
          onSelectUser={handleUserSelectionFromSidebar}
        />

        {/* Site Rules Modal */}
        <SiteRulesModal
          isOpen={showSiteRules()}
          onAccept={handleAcceptRules}
          onDecline={handleDeclineRules}
        />

        {/* Connection Status Indicator */}
        <ConnectionStatus />

        {/* Kick Notification Handler */}
        <KickNotificationHandler userId={currentUser()?.id} />

        {/* Floating Mobile User List Button - Context aware */}
        <Show when={isMobile() && !isUserListOpen()}>
          <Show 
            when={!selectedUser()} 
            fallback={
              <button
                onClick={handleToggleUserList}
                class="fixed top-16 left-1/2 transform -translate-x-1/2 z-[9999] w-10 h-10 bg-teal-500 hover:bg-teal-600 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 md:hidden opacity-80 hover:opacity-100"
                aria-label="Switch User"
                title="Select Different User"
              >
                <FiUsers class="w-4 h-4" />
              </button>
            }
          >
            <button
              onClick={handleToggleUserList}
              class="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[9999] w-16 h-16 bg-teal-500 hover:bg-teal-600 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 md:hidden"
              aria-label="Find Someone to Chat With"
              title="Select User"
            >
              <FiUsers class="w-7 h-7" />
            </button>
          </Show>
        </Show>
      </div>
    </>
  );
};

export default Chat;
