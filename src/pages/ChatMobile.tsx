import {
  Component,
  createSignal,
  onMount,
  onCleanup,
} from "solid-js";
import { useNavigate } from "@solidjs/router";
import ChatHeader from "../components/chat/mobile/ChatHeader";
import UserListSidebar from "../components/chat/mobile/UserListSidebar";
import ChatArea from "../components/chat/mobile/ChatArea";
import InboxSidebar from "../components/chat/mobile/InboxSidebar";
import HistorySidebar from "../components/chat/mobile/HistorySidebar";
import SiteRulesModal from "../components/chat/mobile/SiteRulesModal";
import ConnectionStatus from "../components/shared/ConnectionStatus";
import KickNotificationHandler from "../components/chat/KickNotificationHandler";
import { authService, presenceService } from "../services/supabase";
import { idleService } from "../services/idleService";
import { useAnalytics } from "../hooks/useAnalytics";
import SEOHead from "../components/seo/SEOHead";
import type { User } from "../types/user.types";

const ChatMobile: Component = () => {
  const navigate = useNavigate();
  const analytics = useAnalytics();
  const [currentUser, setCurrentUser] = createSignal<User | null>(null);
  const [selectedUser, setSelectedUser] = createSignal<User | null>(null);
  const [onlineUsers, setOnlineUsers] = createSignal<User[]>([]);
  const [isInboxOpen, setIsInboxOpen] = createSignal(false);
  const [isHistoryOpen, setIsHistoryOpen] = createSignal(false);
  const [showSiteRules, setShowSiteRules] = createSignal(false);
  const [isUserListOpen, setIsUserListOpen] = createSignal(false);

  let unsubscribePresence: (() => void) | undefined;

  onMount(async () => {
    const user = await authService.getCurrentUser();
    if (!user) {
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
    if (unsubscribePresence) {
      unsubscribePresence();
    }
    
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
    setIsUserListOpen(false); // Close mobile user list when user is selected
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

  const onlineCount = () => onlineUsers().filter((u) => u.online).length;

  return (
    <>
      <SEOHead 
        title="ChatWii - Chat"
        description="Anonymous chat with people worldwide. Safe, private conversations."
      />
      
      <div class="h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900 relative">
        <ChatHeader 
          user={currentUser()} 
          onToggleInbox={handleToggleInbox}
          onToggleHistory={handleToggleHistory}
          onToggleUserList={handleToggleUserList}
          onlineCount={onlineCount()}
          selectedUser={selectedUser()}
        />

        <div class="flex-1 flex overflow-hidden relative w-full max-w-full min-w-0">
          {/* Mobile: Show user list as overlay when open, or chat area when user selected */}
          {/* Desktop: Show both side by side */}
          
          {/* User List - Mobile overlay / Desktop sidebar */}
          <UserListSidebar
            users={onlineUsers()}
            selectedUser={selectedUser()}
            onSelectUser={handleSelectUser}
            currentUser={currentUser()}
            isOpen={isUserListOpen() || !selectedUser()} // Always open if no user selected
            onClose={() => setIsUserListOpen(false)}
          />

          {/* Chat Area - Hidden on mobile when user list is open and no user selected */}
          <div class={`flex-1 min-w-0 max-w-full ${!selectedUser() ? 'hidden md:flex' : 'flex'}`}>
            <ChatArea
              currentUser={currentUser()}
              selectedUser={selectedUser()}
              onCloseChat={handleCloseChat}
            />
          </div>
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
      </div>
    </>
  );
};

export default ChatMobile;