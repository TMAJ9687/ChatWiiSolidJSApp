import { Component, onMount, onCleanup } from "solid-js";
import { Router, Route } from "@solidjs/router";
import Landing from "./pages/Landing";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import Idle from './pages/Idle';
import Feedback from "./pages/Feedback";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Safety from "./pages/Safety";
import HowItWorks from "./pages/HowItWorks";

const App: Component = () => {
  let cleanupInterval: NodeJS.Timeout | null = null;

  onMount(async () => {
    // Start automatic cleanup for stale standard users
    try {
      const { enhancedCleanupService } = await import('./services/supabase/enhancedCleanupService');
      cleanupInterval = enhancedCleanupService.startAutomaticCleanup();
      console.log('Automatic cleanup service started');
    } catch (error) {
      console.warn('Failed to start automatic cleanup:', error);
    }
  });

  onCleanup(() => {
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
    }
  });

  return (
    <Router>
      <Route path="/" component={Landing} />
      <Route path="/chat" component={Chat} />
      <Route path="/admin" component={Admin} />
      <Route path="/sys/mgmt/admin" component={AdminLogin} />
      <Route path="/idle" component={Idle} />
      <Route path="/feedback" component={Feedback} />
      <Route path="/about" component={About} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/safety" component={Safety} />
      <Route path="/how-it-works" component={HowItWorks} />
    </Router>
  );
};

export default App;
