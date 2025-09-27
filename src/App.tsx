import { Component, onMount, onCleanup, lazy, Show } from "solid-js";
import { Router, Route } from "@solidjs/router";
import Landing from "./pages/Landing";
import { dailyCleanupTrigger } from "./services/supabase/dailyCleanupTrigger";
import MaintenanceOverlay from "./components/MaintenanceOverlay";
import { maintenanceStore } from "./stores/maintenanceStore";

// Lazy load all non-critical pages including chat
const Chat = lazy(() => import("./pages/Chat"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Idle = lazy(() => import('./pages/Idle'));
// const Feedback = lazy(() => import("./pages/Feedback"));
const About = lazy(() => import("./pages/About"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Safety = lazy(() => import("./pages/Safety"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));

const App: Component = () => {
  let cleanupInterval: NodeJS.Timeout | null = null;

  onMount(async () => {
    // Start automatic cleanup for stale standard users
    try {
      const { enhancedCleanupService } = await import('./services/supabase/enhancedCleanupService');
      cleanupInterval = enhancedCleanupService.startAutomaticCleanup();
    } catch (error) {
      // Cleanup service failed to start - continue silently
    }

    // Start daily cleanup trigger for anonymous users (1+ hour offline)
    try {
      dailyCleanupTrigger.startPeriodicCleanup();
    } catch (error) {
      // Daily cleanup failed to start - continue silently
    }

    // Load debug utilities for console testing (development only)
    if (import.meta.env.DEV) {
      try {
        await import('./utils/debugCleanup');
      } catch (error) {
        // Debug utilities failed to load - continue silently
      }
    }
  });

  onCleanup(() => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
  });

  return (
    <>
      <Router>
        <Route path="/" component={Landing} />
        <Route path="/chat" component={Chat} />
        <Route path="/admin" component={Admin} />
        <Route path="/sys/mgmt/admin" component={AdminLogin} />
        <Route path="/idle" component={Idle} />
        {/* <Route path="/feedback" component={Feedback} /> */}
        <Route path="/about" component={About} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/safety" component={Safety} />
        <Route path="/how-it-works" component={HowItWorks} />
      </Router>
      <Show when={maintenanceStore.isMaintenanceMode()}>
        <MaintenanceOverlay />
      </Show>
    </>
  );
};

export default App;
