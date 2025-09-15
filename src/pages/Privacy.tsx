import { Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { BiRegularArrowBack } from "solid-icons/bi";
import { FiShield, FiEye, FiTrash2, FiLock } from "solid-icons/fi";
import Logo from "../components/shared/Logo";
import ThemeToggle from "../components/shared/ThemeToggle";
import SEOHead from "../components/seo/SEOHead";
import { generatePageStructuredData } from "../utils/structuredData";

const Privacy: Component = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead 
        title="ChatWii - Privacy Policy"
        description="ChatWii privacy policy: Complete anonymity, no data collection, automatic message deletion. Learn how we protect your privacy in anonymous chat."
        keywords={[
          "chatwii privacy policy",
          "anonymous chat privacy",
          "no data collection",
          "private messaging policy",
          "encrypted chat privacy"
        ]}
        url="https://chatwii.com/privacy"
        image="https://chatwii.com/images/privacy-policy-og.jpg"
        type="website"
        structuredData={generatePageStructuredData('privacy', {})}
        canonical="https://chatwii.com/privacy"
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
          <div class="text-center mb-12">
            <FiShield class="w-16 h-16 text-secondary-500 mx-auto mb-4" />
            <h1 class="text-4xl md:text-5xl font-bold text-text-1000 dark:text-text-0 mb-6">
              Privacy Policy
            </h1>
            <p class="text-xl text-text-600 dark:text-text-400 max-w-3xl mx-auto">
              Your privacy is our top priority. Learn how we protect your data and 
              maintain your anonymity on ChatWii.
            </p>
            <div class="mt-6 text-sm text-text-500 dark:text-text-500">
              Last updated: January 9, 2025
            </div>
          </div>

          {/* Key Points */}
          <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 text-center">
              <FiEye class="w-8 h-8 text-primary-500 mx-auto mb-3" />
              <h3 class="font-semibold text-text-1000 dark:text-text-0 mb-2">No Tracking</h3>
              <p class="text-sm text-text-600 dark:text-text-400">
                We don't track your browsing or collect analytics
              </p>
            </div>
            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 text-center">
              <FiTrash2 class="w-8 h-8 text-danger-500 mx-auto mb-3" />
              <h3 class="font-semibold text-text-1000 dark:text-text-0 mb-2">Auto-Delete</h3>
              <p class="text-sm text-text-600 dark:text-text-400">
                Messages are automatically deleted after 24 hours
              </p>
            </div>
            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 text-center">
              <FiLock class="w-8 h-8 text-emerald-500 mx-auto mb-3" />
              <h3 class="font-semibold text-text-1000 dark:text-text-0 mb-2">Encrypted</h3>
              <p class="text-sm text-text-600 dark:text-text-400">
                All communications are encrypted in transit
              </p>
            </div>
            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 text-center">
              <FiShield class="w-8 h-8 text-secondary-500 mx-auto mb-3" />
              <h3 class="font-semibold text-text-1000 dark:text-text-0 mb-2">Anonymous</h3>
              <p class="text-sm text-text-600 dark:text-text-400">
                No personal information required
              </p>
            </div>
          </div>

          {/* Detailed Policy */}
          <div class="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8 md:p-12 space-y-8">
            
            {/* Data Collection */}
            <section>
              <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-4">
                1. What Information We Collect
              </h2>
              <div class="space-y-4 text-text-700 dark:text-text-300">
                <p>
                  <strong class="text-text-900 dark:text-text-100">Minimal Data Only:</strong> We collect only the absolute minimum information needed to provide our service:
                </p>
                <ul class="list-disc pl-6 space-y-2">
                  <li>Chosen nickname (not linked to your identity)</li>
                  <li>Selected gender and age range (for matching preferences)</li>
                  <li>Country (detected automatically for regional matching)</li>
                  <li>Chat messages (automatically deleted after 24 hours)</li>
                </ul>
                <div class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                  <p class="text-emerald-800 dark:text-emerald-200">
                    <strong>✓ We Never Collect:</strong> Email addresses, phone numbers, real names, IP addresses, device fingerprints, or any personally identifiable information.
                  </p>
                </div>
              </div>
            </section>

            {/* How We Use Data */}
            <section>
              <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-4">
                2. How We Use Your Information
              </h2>
              <div class="space-y-4 text-text-700 dark:text-text-300">
                <ul class="list-disc pl-6 space-y-2">
                  <li>Enable anonymous chat functionality</li>
                  <li>Match users based on preferences and availability</li>
                  <li>Maintain basic safety and moderation</li>
                  <li>Detect and prevent abuse or spam</li>
                </ul>
                <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p class="text-blue-800 dark:text-blue-200">
                    <strong>Important:</strong> We never use your data for advertising, marketing, or commercial purposes. We don't sell, rent, or share your information with third parties.
                  </p>
                </div>
              </div>
            </section>

            {/* Message Privacy */}
            <section>
              <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-4">
                3. Message Privacy & Deletion
              </h2>
              <div class="space-y-4 text-text-700 dark:text-text-300">
                <ul class="list-disc pl-6 space-y-2">
                  <li><strong>Automatic Deletion:</strong> All messages are permanently deleted after 24 hours</li>
                  <li><strong>No Permanent Storage:</strong> We don't create backups or archives of your conversations</li>
                  <li><strong>Encrypted Transit:</strong> All messages are encrypted while being transmitted</li>
                  <li><strong>No Message Scanning:</strong> We don't read, analyze, or process your messages for commercial purposes</li>
                </ul>
                <div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <p class="text-purple-800 dark:text-purple-200">
                    <strong>Exception:</strong> Messages may be temporarily retained only when reported for safety violations, and only for the time needed for moderation review.
                  </p>
                </div>
              </div>
            </section>

            {/* Cookies & Tracking */}
            <section>
              <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-4">
                4. Cookies & Tracking
              </h2>
              <div class="space-y-4 text-text-700 dark:text-text-300">
                <ul class="list-disc pl-6 space-y-2">
                  <li><strong>Essential Cookies Only:</strong> We only use cookies necessary for the service to function</li>
                  <li><strong>No Analytics:</strong> We don't use Google Analytics or similar tracking services</li>
                  <li><strong>No Third-Party Trackers:</strong> No social media pixels, advertising trackers, or data brokers</li>
                  <li><strong>Local Storage:</strong> Some preferences (like dark mode) are stored locally on your device</li>
                </ul>
              </div>
            </section>

            {/* Data Security */}
            <section>
              <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-4">
                5. Data Security
              </h2>
              <div class="space-y-4 text-text-700 dark:text-text-300">
                <ul class="list-disc pl-6 space-y-2">
                  <li><strong>Encryption:</strong> All data is encrypted in transit using industry-standard protocols</li>
                  <li><strong>Secure Infrastructure:</strong> Hosted on secure, reputable cloud infrastructure</li>
                  <li><strong>Access Controls:</strong> Strict access controls limit who can access any data</li>
                  <li><strong>Regular Security Updates:</strong> We maintain up-to-date security practices</li>
                </ul>
              </div>
            </section>

            {/* Your Rights */}
            <section>
              <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-4">
                6. Your Rights
              </h2>
              <div class="space-y-4 text-text-700 dark:text-text-300">
                <ul class="list-disc pl-6 space-y-2">
                  <li><strong>Complete Anonymity:</strong> You can use our service completely anonymously</li>
                  <li><strong>No Account Required:</strong> No registration, verification, or account creation needed</li>
                  <li><strong>Leave Anytime:</strong> Simply close your browser - no data persists</li>
                  <li><strong>Report Issues:</strong> Use our feedback system to report privacy concerns</li>
                </ul>
                <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p class="text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> Since we don't store personal data, traditional "data deletion" requests aren't applicable - your data is already automatically deleted.
                  </p>
                </div>
              </div>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-4">
                7. Children's Privacy
              </h2>
              <div class="space-y-4 text-text-700 dark:text-text-300">
                <p>
                  Our service is intended for users 13 years and older. We require age selection during registration and don't knowingly collect information from children under 13. If you believe a child under 13 has used our service, please contact us through our feedback system.
                </p>
              </div>
            </section>

            {/* International Users */}
            <section>
              <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-4">
                8. International Users
              </h2>
              <div class="space-y-4 text-text-700 dark:text-text-300">
                <p>
                  ChatWii is available globally. We comply with international privacy laws including GDPR, CCPA, and other applicable regulations. Our minimal data collection approach means we exceed most privacy requirements by default.
                </p>
              </div>
            </section>

            {/* Changes to Policy */}
            <section>
              <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-4">
                9. Changes to This Policy
              </h2>
              <div class="space-y-4 text-text-700 dark:text-text-300">
                <p>
                  We may update this privacy policy occasionally. Any changes will be posted on this page with an updated revision date. Continued use of ChatWii after changes indicates acceptance of the updated policy.
                </p>
              </div>
            </section>

            {/* Contact */}
            <section>
              <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-4">
                10. Contact Us
              </h2>
              <div class="space-y-4 text-text-700 dark:text-text-300">
                <p>
                  If you have questions about this privacy policy or our privacy practices, please use our feedback system accessible from the main chat interface.
                </p>
              </div>
            </section>

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
              onClick={() => navigate("/about")}
              class="text-sm text-text-600 dark:text-text-400 hover:text-secondary-500"
            >
              About
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
        </div>
      </footer>
    </div>
    </>
  );
};

export default Privacy;