import { Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { BiRegularArrowBack } from "solid-icons/bi";
import { FiShield, FiAlertTriangle, FiFlag, FiEyeOff, FiHeart, FiUserX } from "solid-icons/fi";
import Logo from "../components/shared/Logo";
import ThemeToggle from "../components/shared/ThemeToggle";
import SEOHead from "../components/seo/SEOHead";
import { generatePageStructuredData } from "../utils/structuredData";

const Safety: Component = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead 
        title="Safety | ChatWii"
        description="Complete safety guide for anonymous chat. Learn how to chat safely, report users, block inappropriate content, and protect your privacy online."
        keywords={[
          "anonymous chat safety",
          "safe online chatting",
          "chat safety tips",
          "how to chat safely",
          "report inappropriate chat",
          "online safety guide"
        ]}
        url="https://chatwii.com/safety"
        image="https://chatwii.com/images/safety-guide-og.jpg"
        type="website"
        structuredData={generatePageStructuredData('safety', {})}
        canonical="https://chatwii.com/safety"
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
            <FiShield class="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h1 class="text-4xl md:text-5xl font-bold text-text-1000 dark:text-text-0 mb-6">
              Safety Guide
            </h1>
            <p class="text-xl text-text-600 dark:text-text-400 max-w-3xl mx-auto">
              Your safety is our top priority. Learn how to have positive, secure 
              conversations and protect yourself while using ChatWii.
            </p>
          </div>

          {/* Quick Safety Tips */}
          <div class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-8 mb-12">
            <h2 class="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mb-6 text-center">
              🛡️ Quick Safety Reminders
            </h2>
            <div class="grid md:grid-cols-2 gap-6">
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <span class="text-emerald-600 dark:text-emerald-400">✓</span>
                  <span class="text-emerald-800 dark:text-emerald-200">Never share personal information</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-emerald-600 dark:text-emerald-400">✓</span>
                  <span class="text-emerald-800 dark:text-emerald-200">Use the block feature if someone makes you uncomfortable</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-emerald-600 dark:text-emerald-400">✓</span>
                  <span class="text-emerald-800 dark:text-emerald-200">Report inappropriate behavior immediately</span>
                </div>
              </div>
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <span class="text-emerald-600 dark:text-emerald-400">✓</span>
                  <span class="text-emerald-800 dark:text-emerald-200">Trust your instincts - leave if something feels wrong</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-emerald-600 dark:text-emerald-400">✓</span>
                  <span class="text-emerald-800 dark:text-emerald-200">Remember conversations are temporary and anonymous</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-emerald-600 dark:text-emerald-400">✓</span>
                  <span class="text-emerald-800 dark:text-emerald-200">Be respectful and kind to others</span>
                </div>
              </div>
            </div>
          </div>

          {/* Safety Features */}
          <div class="grid md:grid-cols-3 gap-8 mb-12">
            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 text-center">
              <FiFlag class="w-12 h-12 text-danger-500 mx-auto mb-4" />
              <h3 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-3">
                Report System
              </h3>
              <p class="text-text-600 dark:text-text-400">
                Instantly report inappropriate behavior, harassment, or spam. 
                Our moderation team reviews all reports quickly.
              </p>
            </div>

            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 text-center">
              <FiUserX class="w-12 h-12 text-warning-500 mx-auto mb-4" />
              <h3 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-3">
                Block Users
              </h3>
              <p class="text-text-600 dark:text-text-400">
                Immediately block any user who makes you uncomfortable. 
                They won't be able to contact you again.
              </p>
            </div>

            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 text-center">
              <FiEyeOff class="w-12 h-12 text-primary-500 mx-auto mb-4" />
              <h3 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-3">
                Complete Anonymity
              </h3>
              <p class="text-text-600 dark:text-text-400">
                Your real identity is never revealed. Chat freely without 
                worrying about personal information exposure.
              </p>
            </div>
          </div>

          {/* Detailed Guidelines */}
          <div class="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8 md:p-12 space-y-8">

            {/* Personal Information */}
            <section>
              <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-4 flex items-center gap-3">
                <FiAlertTriangle class="w-6 h-6 text-warning-500" />
                Never Share Personal Information
              </h2>
              <div class="space-y-4 text-text-700 dark:text-text-300">
                <p>
                  <strong class="text-text-900 dark:text-text-100">Keep these private:</strong>
                </p>
                <div class="grid md:grid-cols-2 gap-4">
                  <div>
                    <ul class="list-disc pl-6 space-y-2">
                      <li>Real name or surname</li>
                      <li>Phone number</li>
                      <li>Email address</li>
                      <li>Home or work address</li>
                      <li>Social media profiles</li>
                    </ul>
                  </div>
                  <div>
                    <ul class="list-disc pl-6 space-y-2">
                      <li>School or workplace name</li>
                      <li>Financial information</li>
                      <li>Photos of yourself</li>
                      <li>Location details</li>
                      <li>Family information</li>
                    </ul>
                  </div>
                </div>
                <div class="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg p-4">
                  <p class="text-danger-800 dark:text-danger-200">
                    <strong>⚠️ Warning:</strong> Scammers may try to build trust before asking for personal information. Never share personal details, even if someone seems friendly.
                  </p>
                </div>
              </div>
            </section>

            {/* Recognizing Red Flags */}
            <section>
              <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-4">
                🚩 Recognizing Red Flags
              </h2>
              <div class="space-y-4 text-text-700 dark:text-text-300">
                <p><strong class="text-text-900 dark:text-text-100">Watch out for users who:</strong></p>
                <div class="grid md:grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <div class="flex items-start gap-3">
                      <span class="text-danger-500 mt-1">🚩</span>
                      <span>Ask for personal information repeatedly</span>
                    </div>
                    <div class="flex items-start gap-3">
                      <span class="text-danger-500 mt-1">🚩</span>
                      <span>Send inappropriate or sexual messages</span>
                    </div>
                    <div class="flex items-start gap-3">
                      <span class="text-danger-500 mt-1">🚩</span>
                      <span>Try to move conversations to other platforms</span>
                    </div>
                    <div class="flex items-start gap-3">
                      <span class="text-danger-500 mt-1">🚩</span>
                      <span>Ask for money or financial assistance</span>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <div class="flex items-start gap-3">
                      <span class="text-danger-500 mt-1">🚩</span>
                      <span>Use excessive flattery or love-bombing</span>
                    </div>
                    <div class="flex items-start gap-3">
                      <span class="text-danger-500 mt-1">🚩</span>
                      <span>Become aggressive when told 'no'</span>
                    </div>
                    <div class="flex items-start gap-3">
                      <span class="text-danger-500 mt-1">🚩</span>
                      <span>Share links to suspicious websites</span>
                    </div>
                    <div class="flex items-start gap-3">
                      <span class="text-danger-500 mt-1">🚩</span>
                      <span>Try to pressure you into quick decisions</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Using Safety Features */}
            <section>
              <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-4">
                🛠️ Using Safety Features
              </h2>
              <div class="space-y-6 text-text-700 dark:text-text-300">
                
                <div class="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                  <h3 class="text-lg font-semibold text-text-900 dark:text-text-100 mb-3 flex items-center gap-2">
                    <FiUserX class="w-5 h-5 text-warning-500" />
                    How to Block Someone
                  </h3>
                  <ol class="list-decimal pl-6 space-y-2">
                    <li>Click on the user's name in the chat</li>
                    <li>Select "Block User" from the menu</li>
                    <li>Confirm the action - they'll be blocked immediately</li>
                    <li>Blocked users cannot see or contact you again</li>
                  </ol>
                </div>

                <div class="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                  <h3 class="text-lg font-semibold text-text-900 dark:text-text-100 mb-3 flex items-center gap-2">
                    <FiFlag class="w-5 h-5 text-danger-500" />
                    How to Report Someone
                  </h3>
                  <ol class="list-decimal pl-6 space-y-2">
                    <li>Click on the user's name or message</li>
                    <li>Select "Report User" from the menu</li>
                    <li>Choose the reason for reporting</li>
                    <li>Provide any additional details</li>
                    <li>Our moderation team will review within 24 hours</li>
                  </ol>
                </div>

                <div class="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6">
                  <h3 class="text-lg font-semibold text-text-900 dark:text-text-100 mb-3">
                    📱 Quick Exit
                  </h3>
                  <p>If you ever feel unsafe, simply close your browser tab. Since ChatWii doesn't require accounts, you can leave instantly without any traces.</p>
                </div>
              </div>
            </section>

            {/* Community Guidelines */}
            <section>
              <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-4 flex items-center gap-3">
                <FiHeart class="w-6 h-6 text-secondary-500" />
                Community Guidelines
              </h2>
              <div class="space-y-4 text-text-700 dark:text-text-300">
                <p><strong class="text-text-900 dark:text-text-100">Help us maintain a positive environment by:</strong></p>
                <div class="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 class="font-semibold text-success-600 dark:text-success-400 mb-3">✓ Do:</h4>
                    <ul class="list-disc pl-6 space-y-1">
                      <li>Be respectful and kind</li>
                      <li>Use appropriate language</li>
                      <li>Respect others' boundaries</li>
                      <li>Report inappropriate behavior</li>
                      <li>Help newcomers feel welcome</li>
                    </ul>
                  </div>
                  <div>
                    <h4 class="font-semibold text-danger-600 dark:text-danger-400 mb-3">✗ Don't:</h4>
                    <ul class="list-disc pl-6 space-y-1">
                      <li>Share inappropriate content</li>
                      <li>Harass or bully others</li>
                      <li>Spam or flood chat</li>
                      <li>Share personal information</li>
                      <li>Try to scam or deceive others</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Mental Health */}
            <section>
              <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-4">
                🧠 Mental Health & Well-being
              </h2>
              <div class="space-y-4 text-text-700 dark:text-text-300">
                <p>
                  <strong class="text-text-900 dark:text-text-100">Remember:</strong>
                </p>
                <ul class="list-disc pl-6 space-y-2">
                  <li>Take breaks if conversations become overwhelming</li>
                  <li>Don't rely solely on anonymous chats for emotional support</li>
                  <li>If you're in crisis, contact professional help immediately</li>
                  <li>It's okay to leave a conversation if it makes you uncomfortable</li>
                </ul>
                <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p class="text-blue-800 dark:text-blue-200">
                    <strong>Crisis Resources:</strong> If you're in immediate danger or having thoughts of self-harm, please contact emergency services (911) or a crisis helpline in your country immediately.
                  </p>
                </div>
              </div>
            </section>

            {/* For Parents */}
            <section>
              <h2 class="text-2xl font-bold text-text-1000 dark:text-text-0 mb-4">
                👨‍👩‍👧‍👦 For Parents & Guardians
              </h2>
              <div class="space-y-4 text-text-700 dark:text-text-300">
                <p>
                  <strong class="text-text-900 dark:text-text-100">If your teen uses ChatWii:</strong>
                </p>
                <ul class="list-disc pl-6 space-y-2">
                  <li>Discuss online safety and the importance of not sharing personal information</li>
                  <li>Make sure they know they can talk to you if something makes them uncomfortable</li>
                  <li>Review our safety features together</li>
                  <li>Remind them that strangers online may not be who they claim to be</li>
                  <li>Encourage them to trust their instincts and leave uncomfortable situations</li>
                </ul>
              </div>
            </section>

          </div>

          {/* Emergency Contact */}
          <div class="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-2xl p-8 text-center mt-12">
            <h2 class="text-2xl font-bold text-danger-800 dark:text-danger-200 mb-4">
              🚨 Need Immediate Help?
            </h2>
            <p class="text-danger-700 dark:text-danger-300 mb-4">
              If you're in immediate danger or experiencing harassment that makes you feel unsafe:
            </p>
            <div class="space-y-2">
              <p class="font-semibold text-danger-800 dark:text-danger-200">
                • Contact local emergency services (911 in US)
              </p>
              <p class="font-semibold text-danger-800 dark:text-danger-200">
                • Use our feedback system to report urgent safety issues
              </p>
              <p class="font-semibold text-danger-800 dark:text-danger-200">
                • Block and report the user immediately
              </p>
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
              onClick={() => navigate("/about")}
              class="text-sm text-text-600 dark:text-text-400 hover:text-secondary-500"
            >
              About
            </button>
            <button
              onClick={() => navigate("/privacy")}
              class="text-sm text-text-600 dark:text-text-400 hover:text-secondary-500"
            >
              Privacy Policy
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

export default Safety;