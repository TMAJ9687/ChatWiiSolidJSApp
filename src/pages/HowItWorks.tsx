import { Component } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { BiRegularArrowBack } from "solid-icons/bi";
import { FiPlay, FiUser, FiMessageCircle, FiShield, FiTrash2, FiGlobe, FiHeart, FiSettings } from "solid-icons/fi";
import Logo from "../components/shared/Logo";
import ThemeToggle from "../components/shared/ThemeToggle";
import SEOHead from "../components/seo/SEOHead";
import { generatePageStructuredData } from "../utils/structuredData";

const HowItWorks: Component = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead 
        title="ChatWii"
        description="Learn how to use ChatWii anonymous chat platform. Step-by-step guide: create nickname, join chat rooms, message safely. No registration required!"
        keywords={[
          "how to use chatwii",
          "anonymous chat guide",
          "how to chat anonymously",
          "getting started anonymous chat",
          "chatwii tutorial",
          "anonymous messaging guide"
        ]}
        url="https://chatwii.com/how-it-works"
        image="https://chatwii.com/images/how-it-works-og.jpg"
        type="website"
        structuredData={generatePageStructuredData('how-it-works', {})}
        canonical="https://chatwii.com/how-it-works"
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
            <FiPlay class="w-16 h-16 text-secondary-500 mx-auto mb-4" />
            <h1 class="text-4xl md:text-5xl font-bold text-text-1000 dark:text-text-0 mb-6">
              How It Works
            </h1>
            <p class="text-xl text-text-600 dark:text-text-400 max-w-3xl mx-auto">
              Get started with ChatWii in just a few simple steps. Anonymous, secure, 
              and private conversations are just moments away.
            </p>
          </div>

          {/* Getting Started Steps */}
          <div class="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8 md:p-12 mb-16">
            <h2 class="text-3xl font-bold text-text-1000 dark:text-text-0 mb-8 text-center">
              🚀 Getting Started
            </h2>
            
            <div class="space-y-8">
              {/* Step 1 */}
              <div class="flex items-start gap-6">
                <div class="flex-shrink-0 w-12 h-12 bg-secondary-500 rounded-full flex items-center justify-center">
                  <span class="text-white font-bold text-lg">1</span>
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-2">
                    Choose Your Anonymous Identity
                  </h3>
                  <p class="text-text-600 dark:text-text-400 mb-4">
                    Create a nickname, select your gender, age range, and we'll detect your country. 
                    No email, phone number, or real name required - stay completely anonymous.
                  </p>
                  <div class="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-4">
                    <p class="text-sm text-text-600 dark:text-text-400">
                      💡 <strong>Tip:</strong> Use our random nickname generator for creative suggestions, 
                      or create your own unique identity!
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div class="flex items-start gap-6">
                <div class="flex-shrink-0 w-12 h-12 bg-secondary-500 rounded-full flex items-center justify-center">
                  <span class="text-white font-bold text-lg">2</span>
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-2">
                    Enter the Chat Room
                  </h3>
                  <p class="text-text-600 dark:text-text-400 mb-4">
                    Click "Start Chat" and you'll be instantly connected to our global community. 
                    See who's online, join ongoing conversations, or start new ones.
                  </p>
                  <div class="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-4">
                    <p class="text-sm text-text-600 dark:text-text-400">
                      🌍 <strong>Global Community:</strong> Connect with people from around the world, 
                      each represented by their chosen avatar and nickname.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div class="flex items-start gap-6">
                <div class="flex-shrink-0 w-12 h-12 bg-secondary-500 rounded-full flex items-center justify-center">
                  <span class="text-white font-bold text-lg">3</span>
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-2">
                    Start Meaningful Conversations
                  </h3>
                  <p class="text-text-600 dark:text-text-400 mb-4">
                    Send messages, share thoughts, ask questions, or just listen. 
                    Every conversation is real-time and completely private.
                  </p>
                  <div class="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-4">
                    <p class="text-sm text-text-600 dark:text-text-400">
                      💬 <strong>Chat Features:</strong> Text messages, image sharing, voice messages, 
                      reactions, and reply functionality - all anonymous and secure.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div class="flex items-start gap-6">
                <div class="flex-shrink-0 w-12 h-12 bg-secondary-500 rounded-full flex items-center justify-center">
                  <span class="text-white font-bold text-lg">4</span>
                </div>
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-2">
                    Leave Anytime, No Traces
                  </h3>
                  <p class="text-text-600 dark:text-text-400 mb-4">
                    When you're done chatting, simply close your browser. No account to delete, 
                    no data to worry about - your anonymity remains intact.
                  </p>
                  <div class="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-4">
                    <p class="text-sm text-text-600 dark:text-text-400">
                      🗑️ <strong>Auto-Cleanup:</strong> All messages automatically delete after 24 hours. 
                      No permanent records, no data storage.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Features */}
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 text-center">
              <FiUser class="w-12 h-12 text-primary-500 mx-auto mb-4" />
              <h3 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-3">
                No Registration
              </h3>
              <p class="text-text-600 dark:text-text-400">
                Jump straight into conversations without creating accounts, providing emails, 
                or going through verification processes.
              </p>
            </div>

            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 text-center">
              <FiMessageCircle class="w-12 h-12 text-secondary-500 mx-auto mb-4" />
              <h3 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-3">
                Rich Messaging
              </h3>
              <p class="text-text-600 dark:text-text-400">
                Send text, images, voice messages, react with emojis, and reply to specific messages 
                - all in real-time.
              </p>
            </div>

            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 text-center">
              <FiGlobe class="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-3">
                Global Reach
              </h3>
              <p class="text-text-600 dark:text-text-400">
                Connect with people from every country and culture. See flags representing the 
                diverse global community.
              </p>
            </div>

            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 text-center">
              <FiShield class="w-12 h-12 text-warning-500 mx-auto mb-4" />
              <h3 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-3">
                Built-in Safety
              </h3>
              <p class="text-text-600 dark:text-text-400">
                Block users, report inappropriate behavior, and use moderation tools to maintain 
                a safe environment.
              </p>
            </div>

            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 text-center">
              <FiTrash2 class="w-12 h-12 text-danger-500 mx-auto mb-4" />
              <h3 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-3">
                Auto-Delete
              </h3>
              <p class="text-text-600 dark:text-text-400">
                Messages disappear automatically after 24 hours. Nothing is permanently stored 
                or archived.
              </p>
            </div>

            <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8 text-center">
              <FiSettings class="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h3 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-3">
                Customizable
              </h3>
              <p class="text-text-600 dark:text-text-400">
                Choose dark or light themes, adjust settings, and personalize your chat experience 
                to your preferences.
              </p>
            </div>
          </div>

          {/* Chat Interface Preview */}
          <div class="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8 md:p-12 mb-16">
            <h2 class="text-3xl font-bold text-text-1000 dark:text-text-0 mb-8 text-center">
              💬 Chat Interface
            </h2>
            
            <div class="space-y-6">
              <div class="grid md:grid-cols-3 gap-6">
                <div class="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-6">
                  <h3 class="font-bold text-text-1000 dark:text-text-0 mb-3">👥 User List</h3>
                  <p class="text-sm text-text-600 dark:text-text-400">
                    See who's online with their chosen avatars and nicknames. 
                    Click to start private conversations or view profiles.
                  </p>
                </div>
                
                <div class="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-6">
                  <h3 class="font-bold text-text-1000 dark:text-text-0 mb-3">💬 Main Chat</h3>
                  <p class="text-sm text-text-600 dark:text-text-400">
                    The main conversation area where everyone can participate. 
                    Messages appear instantly with sender avatars and timestamps.
                  </p>
                </div>
                
                <div class="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-6">
                  <h3 class="font-bold text-text-1000 dark:text-text-0 mb-3">📨 Private Messages</h3>
                  <p class="text-sm text-text-600 dark:text-text-400">
                    Have one-on-one conversations in private. Only you and the other person 
                    can see these messages.
                  </p>
                </div>
              </div>

              <div class="bg-gradient-to-r from-secondary-50 to-primary-50 dark:from-neutral-700 dark:to-neutral-700 rounded-lg p-6">
                <h3 class="font-bold text-text-1000 dark:text-text-0 mb-3 text-center">
                  🎯 Message Features
                </h3>
                <div class="grid md:grid-cols-2 gap-4 text-sm">
                  <div class="space-y-2">
                    <div class="flex items-center gap-2">
                      <span class="text-secondary-600 dark:text-secondary-400">📝</span>
                      <span class="text-text-700 dark:text-text-300">Type and send text messages</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-secondary-600 dark:text-secondary-400">🖼️</span>
                      <span class="text-text-700 dark:text-text-300">Share images and photos</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-secondary-600 dark:text-secondary-400">🎤</span>
                      <span class="text-text-700 dark:text-text-300">Send voice messages</span>
                    </div>
                  </div>
                  <div class="space-y-2">
                    <div class="flex items-center gap-2">
                      <span class="text-secondary-600 dark:text-secondary-400">😀</span>
                      <span class="text-text-700 dark:text-text-300">React with emojis</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-secondary-600 dark:text-secondary-400">↩️</span>
                      <span class="text-text-700 dark:text-text-300">Reply to specific messages</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-secondary-600 dark:text-secondary-400">⌨️</span>
                      <span class="text-text-700 dark:text-text-300">See when others are typing</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div class="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl p-8 md:p-12 mb-16 text-white">
            <div class="text-center mb-8">
              <FiShield class="w-16 h-16 text-white mx-auto mb-4" />
              <h2 class="text-3xl font-bold mb-4">Privacy & Security First</h2>
              <p class="text-xl opacity-90 max-w-2xl mx-auto">
                Your safety and privacy are built into every aspect of ChatWii
              </p>
            </div>

            <div class="grid md:grid-cols-2 gap-8">
              <div class="space-y-4">
                <h3 class="text-xl font-bold mb-4">🔒 What We Protect</h3>
                <div class="space-y-3">
                  <div class="flex items-center gap-3">
                    <span class="text-white/80">✓</span>
                    <span>Your real identity stays completely hidden</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-white/80">✓</span>
                    <span>No personal information is collected or stored</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-white/80">✓</span>
                    <span>Messages are encrypted during transmission</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-white/80">✓</span>
                    <span>Automatic deletion prevents data accumulation</span>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <h3 class="text-xl font-bold mb-4">🛡️ How We Keep You Safe</h3>
                <div class="space-y-3">
                  <div class="flex items-center gap-3">
                    <span class="text-white/80">✓</span>
                    <span>Real-time moderation and reporting system</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-white/80">✓</span>
                    <span>Instant blocking prevents unwanted contact</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-white/80">✓</span>
                    <span>Community guidelines maintain respect</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-white/80">✓</span>
                    <span>No ads or tracking means no data mining</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div class="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-8 md:p-12">
            <h2 class="text-3xl font-bold text-text-1000 dark:text-text-0 mb-8 text-center">
              ❓ Frequently Asked Questions
            </h2>
            
            <div class="space-y-8">
              <div>
                <h3 class="text-lg font-bold text-text-1000 dark:text-text-0 mb-2">
                  Is ChatWii really free?
                </h3>
                <p class="text-text-600 dark:text-text-400">
                  Yes, completely free. No hidden costs, premium features, or subscription fees. 
                  We believe everyone deserves access to anonymous, safe communication.
                </p>
              </div>

              <div>
                <h3 class="text-lg font-bold text-text-1000 dark:text-text-0 mb-2">
                  Do I need to create an account?
                </h3>
                <p class="text-text-600 dark:text-text-400">
                  No account needed! Just choose a nickname and you're ready to chat. 
                  This maintains your anonymity and makes getting started instant.
                </p>
              </div>

              <div>
                <h3 class="text-lg font-bold text-text-1000 dark:text-text-0 mb-2">
                  Can other users find out who I really am?
                </h3>
                <p class="text-text-600 dark:text-text-400">
                  No, your real identity is completely protected. Other users only see your chosen 
                  nickname and avatar. We don't collect or display personal information.
                </p>
              </div>

              <div>
                <h3 class="text-lg font-bold text-text-1000 dark:text-text-0 mb-2">
                  What happens to my messages?
                </h3>
                <p class="text-text-600 dark:text-text-400">
                  All messages automatically delete after 24 hours. We don't create backups, 
                  archives, or permanent records of conversations.
                </p>
              </div>

              <div>
                <h3 class="text-lg font-bold text-text-1000 dark:text-text-0 mb-2">
                  How do I report inappropriate behavior?
                </h3>
                <p class="text-text-600 dark:text-text-400">
                  Click on any user's name or message to access the report function. Our moderation 
                  team reviews all reports quickly and takes appropriate action.
                </p>
              </div>

              <div>
                <h3 class="text-lg font-bold text-text-1000 dark:text-text-0 mb-2">
                  Can I use ChatWii on mobile devices?
                </h3>
                <p class="text-text-600 dark:text-text-400">
                  Yes! ChatWii works on any device with a web browser - phones, tablets, 
                  computers, and more. No app download required.
                </p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div class="text-center mt-16">
            <div class="bg-gradient-to-r from-secondary-500 to-primary-500 rounded-2xl p-8 md:p-12 text-white">
              <FiHeart class="w-16 h-16 text-white mx-auto mb-4" />
              <h2 class="text-3xl font-bold mb-4">Ready to Start Chatting?</h2>
              <p class="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Join thousands of people having meaningful conversations right now. 
                Anonymous, safe, and completely free.
              </p>
              <button
                onClick={() => navigate("/")}
                class="bg-white text-primary-600 font-bold py-4 px-8 rounded-lg hover:bg-neutral-100 transition-colors text-lg"
              >
                Start Chatting Now →
              </button>
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
              onClick={() => navigate("/safety")}
              class="text-sm text-text-600 dark:text-text-400 hover:text-secondary-500"
            >
              Safety Guide
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

export default HowItWorks;