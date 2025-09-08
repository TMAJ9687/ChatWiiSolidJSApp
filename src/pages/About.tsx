import { Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { BiRegularArrowBack } from "solid-icons/bi";
import { FiUsers, FiShield, FiGlobe, FiHeart } from "solid-icons/fi";
import Logo from "../components/shared/Logo";
import ThemeToggle from "../components/shared/ThemeToggle";
import SEOHead from "../components/seo/SEOHead";
import { generatePageStructuredData } from "../utils/structuredData";

const About: Component = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead 
        title="About | ChatWii"
        description="Learn about ChatWii's mission to provide safe, anonymous chat experiences. Privacy-first platform connecting people globally without compromising your identity or data."
        keywords={[
          "about chatwii",
          "anonymous chat platform",
          "privacy first messaging",
          "safe chat community",
          "global anonymous communication",
          "secure messaging platform"
        ]}
        url="https://chatwii.com/about"
        image="https://chatwii.com/images/about-chatwii-og.jpg"
        type="website"
        structuredData={generatePageStructuredData('about', {})}
        canonical="https://chatwii.com/about"
      />
      
      <div class="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
      {/* Header */}
      <header class="bg-white dark:bg-neutral-900 shadow-sm">
        <div class="container mx-auto px-4 py-4 flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              class="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Go back to home"
            >
              <BiRegularArrowBack class="w-5 h-5 text-text-600 dark:text-text-400" />
            </button>
            <Logo />
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main class="container mx-auto px-4 py-12">
        <div class="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div class="text-center mb-16">
            <h1 class="text-4xl md:text-5xl font-bold text-text-1000 dark:text-text-0 mb-6">
              About ChatWii
            </h1>
            <p class="text-xl text-text-600 dark:text-text-400 max-w-3xl mx-auto">
              Where conversations happen freely, safely, and anonymously. 
              Connect with people from around the world without compromising your privacy.
            </p>
          </div>

          {/* Mission Section */}
          <div class="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8 md:p-12 mb-12">
            <div class="text-center mb-10">
              <FiHeart class="w-16 h-16 text-secondary-500 mx-auto mb-4" />
              <h2 class="text-3xl font-bold text-text-1000 dark:text-text-0 mb-4">
                Our Mission
              </h2>
              <p class="text-lg text-text-600 dark:text-text-400 max-w-2xl mx-auto">
                To create a safe, anonymous, and welcoming space where people can connect, 
                share experiences, and build meaningful conversations without fear of judgment 
                or privacy concerns.
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {/* Privacy First */}
            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 text-center">
              <FiShield class="w-12 h-12 text-primary-500 mx-auto mb-4" />
              <h3 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-3">
                Privacy First
              </h3>
              <p class="text-text-600 dark:text-text-400">
                Your identity remains completely anonymous. No personal information required, 
                no data tracking, no permanent records.
              </p>
            </div>

            {/* Global Community */}
            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 text-center">
              <FiGlobe class="w-12 h-12 text-secondary-500 mx-auto mb-4" />
              <h3 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-3">
                Global Community
              </h3>
              <p class="text-text-600 dark:text-text-400">
                Connect with people from every corner of the world. Share cultures, 
                languages, and experiences in a truly global community.
              </p>
            </div>

            {/* Safe Environment */}
            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 text-center">
              <FiUsers class="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-3">
                Safe Environment
              </h3>
              <p class="text-text-600 dark:text-text-400">
                Advanced moderation, reporting systems, and community guidelines 
                ensure a respectful and safe chatting experience.
              </p>
            </div>
          </div>

          {/* Story Section */}
          <div class="bg-gradient-to-r from-secondary-50 to-primary-50 dark:from-neutral-800 dark:to-neutral-800 rounded-2xl p-8 md:p-12 mb-12">
            <h2 class="text-3xl font-bold text-text-1000 dark:text-text-0 mb-6 text-center">
              Our Story
            </h2>
            <div class="prose prose-lg dark:prose-invert mx-auto">
              <p class="text-text-700 dark:text-text-300 mb-6">
                ChatWii was born from a simple belief: everyone deserves a space to express 
                themselves freely without fear of judgment or privacy invasion. In today's 
                digital world, genuine human connection can be hard to find.
              </p>
              <p class="text-text-700 dark:text-text-300 mb-6">
                We created ChatWii as a sanctuary for authentic conversations - a place where 
                your thoughts, feelings, and experiences matter more than your identity. Whether 
                you're looking for advice, want to share your day, or simply need someone to 
                listen, our global community is here for you.
              </p>
              <p class="text-text-700 dark:text-text-300">
                Every feature we build, every policy we implement, and every decision we make 
                is guided by our commitment to privacy, safety, and fostering genuine human connections.
              </p>
            </div>
          </div>

          {/* Values Section */}
          <div class="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8 md:p-12">
            <h2 class="text-3xl font-bold text-text-1000 dark:text-text-0 mb-8 text-center">
              Our Values
            </h2>
            <div class="grid md:grid-cols-2 gap-8">
              <div class="space-y-6">
                <div>
                  <h3 class="text-lg font-semibold text-text-1000 dark:text-text-0 mb-2">
                    🔒 Privacy & Anonymity
                  </h3>
                  <p class="text-text-600 dark:text-text-400">
                    Your privacy is non-negotiable. We don't collect, store, or sell your personal data.
                  </p>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-text-1000 dark:text-text-0 mb-2">
                    🌍 Inclusivity & Respect
                  </h3>
                  <p class="text-text-600 dark:text-text-400">
                    Everyone is welcome regardless of background, beliefs, or identity.
                  </p>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-text-1000 dark:text-text-0 mb-2">
                    🛡️ Safety First
                  </h3>
                  <p class="text-text-600 dark:text-text-400">
                    Robust moderation and reporting systems keep our community safe.
                  </p>
                </div>
              </div>
              <div class="space-y-6">
                <div>
                  <h3 class="text-lg font-semibold text-text-1000 dark:text-text-0 mb-2">
                    💎 Authentic Connections
                  </h3>
                  <p class="text-text-600 dark:text-text-400">
                    Real conversations matter more than follower counts or likes.
                  </p>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-text-1000 dark:text-text-0 mb-2">
                    🚫 No Ads, No Tracking
                  </h3>
                  <p class="text-text-600 dark:text-text-400">
                    Pure conversation without commercial interruption or data mining.
                  </p>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-text-1000 dark:text-text-0 mb-2">
                    🌱 Community-Driven
                  </h3>
                  <p class="text-text-600 dark:text-text-400">
                    Our users shape the platform through feedback and community guidelines.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer class="mt-auto py-8 border-t border-neutral-200 dark:border-neutral-700">
        <div class="container mx-auto px-4">
          <div class="flex items-center justify-center gap-8 mb-4">
            <button
              onClick={() => navigate("/")}
              class="text-sm text-text-600 dark:text-text-400 hover:text-secondary-500"
            >
              Home
            </button>
            <button
              onClick={() => navigate("/privacy")}
              class="text-sm text-text-600 dark:text-text-400 hover:text-secondary-500"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => navigate("/safety")}
              class="text-sm text-text-600 dark:text-text-400 hover:text-secondary-500"
            >
              Safety Guide
            </button>
            <button
              onClick={() => navigate("/how-it-works")}
              class="text-sm text-text-600 dark:text-text-400 hover:text-secondary-500"
            >
              How It Works
            </button>
          </div>
          <p class="text-center text-xs text-text-400 dark:text-text-600">
            © 2025 ChatWii. Anonymous chat platform trusted worldwide.
          </p>
          <p class="text-center text-xs text-text-400 dark:text-text-600 mt-1">
            Free, secure, private communication with automatic message deletion.
          </p>
        </div>
      </footer>
    </div>
    </>
  );
};

export default About;