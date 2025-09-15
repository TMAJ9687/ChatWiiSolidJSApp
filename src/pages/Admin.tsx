import { Component, createSignal, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import AdminSidebar from "../components/admin/AdminSidebar";
import Dashboard from "../components/admin/Dashboard";
import UserManagement from "../components/admin/UserManagement";
import ReportsPanel from "../components/admin/ReportsPanel";
import FeedbackPanel from "../components/admin/FeedbackPanel";
import AuditLogs from "../components/admin/AuditLogs";
import SiteSettings from "../components/admin/SiteSettings";
import { CleanupPanel } from "../components/admin/CleanupPanel";
import { authService } from "../services/supabase";
import { adminService } from "../services/supabase/adminService";
import SEOHead from "../components/seo/SEOHead";
import type { User } from "../types/user.types";

const Admin: Component = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = createSignal<User | null>(null);
  const [activeTab, setActiveTab] = createSignal("dashboard");
  const [loading, setLoading] = createSignal(true);
  const [isAuthorized, setIsAuthorized] = createSignal(false);

  onMount(async () => {
    try {
      // Check authentication
      const user = await authService.getCurrentUser();
      if (!user) {
        navigate("/");
        return;
      }

      setCurrentUser(user);

      // Check admin privileges
      const isAdmin = await adminService.isAdmin(user.id);
      if (!isAdmin) {
        navigate("/chat");
        return;
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  });

  const renderActiveTab = () => {
    const userId = currentUser()?.id || "";
    
    switch (activeTab()) {
      case "dashboard":
        return <Dashboard currentUserId={userId} currentUserNickname={currentUser()?.nickname || "Admin"} />;
      case "users":
        return <UserManagement currentUserId={userId} />;
      case "reports":
        return <ReportsPanel currentUserId={userId} />;
      case "feedback":
        return <FeedbackPanel />;
      case "audit":
        return <AuditLogs currentUserId={userId} />;
      case "cleanup":
        return <CleanupPanel />;
      case "settings":
        return <SiteSettings currentUserId={userId} />;
      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <>
      <SEOHead 
        title="ChatWii - Admin Dashboard"
        description="ChatWii admin dashboard for managing users and site settings."
      />
      
      <Show when={!loading()} fallback={
      <div class="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div class="text-gray-500 dark:text-gray-400">Loading admin panel...</div>
      </div>
    }>
      <Show when={isAuthorized()} fallback={
        <div class="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
          <div class="text-center">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h1>
            <p class="text-gray-600 dark:text-gray-400 mb-4">
              You don't have permission to access the admin panel.
            </p>
            <button
              onClick={() => navigate("/chat")}
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Chat
            </button>
          </div>
        </div>
      }>
        <div class="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex">
          <AdminSidebar
            activeTab={activeTab()}
            onTabChange={setActiveTab}
            currentUserId={currentUser()?.id || ""}
          />

          {/* Main Content */}
          <div class="flex-1 md:ml-0">
            <main class="p-4 md:p-8 max-w-full">
              {renderActiveTab()}
            </main>
          </div>
        </div>
      </Show>
    </Show>
    </>
  );
};

export default Admin;
