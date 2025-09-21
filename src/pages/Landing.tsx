import { Component, createSignal, createEffect, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { BiRegularMessageDetail } from "solid-icons/bi";
import Logo from "../components/shared/Logo";
import ThemeToggle from "../components/shared/ThemeToggle";
import CountryFlag from "../components/shared/CountryFlag";
import NicknameInput from "../components/landing/NicknameInput";
import GenderSelection from "../components/landing/GenderSelection";
import AgeDropdown from "../components/landing/AgeDropdown";
import CaptchaWidget from "../components/landing/CaptchaWidget";
import { authService } from "../services/supabase";
import { validateNickname } from "../utils/validators";
import { detectCountry } from "../utils/countryDetection";
import SEOHead from "../components/seo/SEOHead";
import { generatePageStructuredData } from "../utils/structuredData";
import { useAnalytics } from "../hooks/useAnalytics";
import { createServiceLogger } from "../utils/logger";

const logger = createServiceLogger('Landing');

const Landing: Component = () => {
  const navigate = useNavigate();
  const analytics = useAnalytics();

  // Form state
  const [nickname, setNickname] = createSignal("");
  const [gender, setGender] = createSignal<"male" | "female" | null>(null);
  const [age, setAge] = createSignal<number | null>(null);
  const [nicknameError, setNicknameError] = createSignal("");

  // Location state
  const [countryCode, setCountryCode] = createSignal("US");
  const [countryName, setCountryName] = createSignal("United States");

  // UI state
  const [isValid, setIsValid] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [pageReady, setPageReady] = createSignal(false);
  
  // CAPTCHA state
  const [captchaToken, setCaptchaToken] = createSignal<string | null>(null);
  const [captchaError, setCaptchaError] = createSignal("");

  // CAPTCHA enabled for bot protection
  const captchaRequired = true;

  // Initialize page with immediate readiness signal, then enhance
  onMount(() => {
    // Mark page as ready immediately to prevent navigation blocking
    setPageReady(true);

    // Immediately track page view with defaults - don't wait for country detection
    analytics.trackPageView('landing');
    analytics.setUserProperty('page_type', 'landing');

    // Defer country detection and analytics to next tick to avoid blocking navigation
    setTimeout(async () => {
      try {
        const country = await detectCountry();
        setCountryCode(country.code);
        setCountryName(country.name);

        // Update analytics with actual country
        analytics.setUserProperty('user_country', country.code);
      } catch (error) {
        // Country detection failed - use defaults and continue
        logger.warn("Country detection failed, using defaults:", error);
        setCountryCode("US");
        setCountryName("United States");

        // Update analytics with default country
        analytics.setUserProperty('user_country', 'US');
      }
    }, 0);
  });

  // Validation effect with comprehensive debugging
  createEffect(() => {
    const nick = nickname();

    if (nick.length === 0) {
      setNicknameError("");
      setIsValid(false);
      return;
    }

    const validation = validateNickname(nick);

    if (!validation.valid) {
      setNicknameError(validation.error || "");
      setIsValid(false);
      return;
    }

    setNicknameError("");
    const g = gender();
    const a = age();
    const captcha = captchaToken();

    // CAPTCHA validation - check if token exists
    const isCaptchaValid = captchaRequired ? !!captcha : true;

    const finalValid = validation.valid && g !== null && a !== null && isCaptchaValid;

    setIsValid(finalValid);
  });

  // Random nickname generator with much more variety
  const generateRandomNickname = () => {
    const adjectives = [
      "Amazing", "Awesome", "Bold", "Brave", "Bright", "Calm", "Clever", "Cool", "Creative", "Daring",
      "Dynamic", "Epic", "Fast", "Fierce", "Free", "Fun", "Gentle", "Happy", "Heroic", "Inspiring",
      "Joyful", "Kind", "Lucky", "Magical", "Mighty", "Noble", "Optimistic", "Peaceful", "Quick", "Radiant",
      "Smart", "Strong", "Sunny", "Swift", "Vibrant", "Wild", "Wise", "Zealous", "Cosmic", "Golden",
      "Silver", "Crystal", "Diamond", "Electric", "Mystic", "Phoenix", "Royal", "Stellar", "Thunder", "Zen"
    ];

    const nouns = [
      "Tiger", "Eagle", "Lion", "Wolf", "Bear", "Fox", "Hawk", "Falcon", "Panther", "Jaguar",
      "Dragon", "Phoenix", "Star", "Moon", "Sun", "Ocean", "Mountain", "River", "Storm", "Lightning",
      "Thunder", "Wave", "Fire", "Ice", "Wind", "Earth", "Sky", "Cloud", "Rain", "Snow",
      "Rose", "Oak", "Pine", "Sage", "Ivy", "Coral", "Pearl", "Ruby", "Emerald", "Sapphire",
      "Knight", "Warrior", "Hunter", "Scout", "Ranger", "Guardian", "Champion", "Hero", "Legend", "Master",
      "Arrow", "Blade", "Shield", "Crown", "Gem", "Crystal", "Prism", "Echo", "Spirit", "Soul"
    ];

    const patterns = [
      // Pattern 1: Adjective + Noun (no number) - 40% chance
      () => {
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${adj} ${noun}`;
      },
      
      // Pattern 2: Adjective + Noun + single digit - 25% chance
      () => {
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 10);
        return `${adj} ${noun} ${num}`;
      },
      
      // Pattern 3: AdjectiveNoun (compact) + number - 15% chance  
      () => {
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 99) + 1;
        return `${adj}${noun}${num}`;
      },

      // Pattern 4: Adjective-Noun format - 10% chance
      () => {
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        return `${adj}-${noun}`;
      },

      // Pattern 5: Single meaningful word + number - 10% chance
      () => {
        const word = [...adjectives, ...nouns][Math.floor(Math.random() * (adjectives.length + nouns.length))];
        const num = Math.floor(Math.random() * 99) + 1;
        return `${word}${num}`;
      }
    ];

    // Select random pattern based on weighted probability
    const rand = Math.random();
    let selectedPattern;
    
    if (rand < 0.4) selectedPattern = patterns[0];
    else if (rand < 0.65) selectedPattern = patterns[1]; 
    else if (rand < 0.8) selectedPattern = patterns[2];
    else if (rand < 0.9) selectedPattern = patterns[3];
    else selectedPattern = patterns[4];
    
    let nickname = selectedPattern();
    
    // Ensure it fits within 20 characters
    if (nickname.length > 20) {
      // Fallback to compact pattern if too long
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      nickname = `${adj}${noun}`.substring(0, 18) + Math.floor(Math.random() * 99);
    }
    
    setNickname(nickname);
  };

  // CAPTCHA handlers for bot protection
  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    setCaptchaError("");
  };

  const handleCaptchaExpired = () => {
    setCaptchaToken(null);
    setCaptchaError("CAPTCHA expired. Please verify again.");
  };

  const handleCaptchaError = () => {
    setCaptchaToken(null);
    setCaptchaError("CAPTCHA verification failed. Please try again.");
  };

  // Handle chat start with anonymous auth
  const handleStartChat = async () => {
    if (!isValid()) return;

    // CAPTCHA validation for bot protection
    if (captchaRequired && !captchaToken()) {
      setCaptchaError("Please complete CAPTCHA verification.");
      return;
    }

    setLoading(true);
    try {
      // Track chat start attempt
      analytics.chat.startChat();
      analytics.setUserProperty('user_gender', gender()!);
      analytics.setUserProperty('user_age_range', age()! < 25 ? '18-24' : age()! < 35 ? '25-34' : age()! < 50 ? '35-49' : '50+');
      
      await authService.signInAnonymously({
        nickname: nickname(),
        gender: gender()!,
        age: age()!,
        country: countryCode(),
      });

      // Track successful chat join
      analytics.chat.joinChat();
      
      // Navigate to chat
      navigate("/chat");
    } catch (error) {
      logger.error("Failed to start chat:", error);
      setNicknameError("Failed to connect. Please try again.");
      
      // Track failed chat attempt
      analytics.trackEvent('chat_start_failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="ChatWii - Anonymous Chat Platform"
        description="Connect with people worldwide through anonymous chat. No registration required. Private, safe, and secure conversations with complete anonymity. Join thousands chatting now!"
        keywords={[
          "anonymous chat online",
          "chat with strangers safely",
          "private messaging app",
          "secure anonymous chat",
          "free chat no registration",
          "global chat platform",
          "safe online chatting",
          "encrypted messaging"
        ]}
        url="https://chatwii.com"
        image="https://chatwii.com/images/chatwii-homepage-og.jpg"
        type="website"
        structuredData={generatePageStructuredData('homepage', {})}
        canonical="https://chatwii.com"
      />

      {!pageReady() ? (
        // Loading screen while page initializes
        <div class="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 flex items-center justify-center">
          <div class="text-center">
            <div class="w-8 h-8 border-2 border-secondary-500/30 border-t-secondary-500 rounded-full animate-spin mx-auto mb-4" />
            <p class="text-text-600 dark:text-text-400">Loading...</p>
          </div>
        </div>
      ) : (
        <div class="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
      {/* Header */}
      <header class="bg-white dark:bg-neutral-900 shadow-sm">
        <div class="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo />
          <div class="flex items-center gap-2">
            <div class="relative group">
              <button 
                disabled
                class="px-4 py-2 bg-neutral-300 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-400 rounded-lg cursor-not-allowed flex items-center gap-2"
                title="VIP is currently disabled"
              >
                <svg class="w-4 h-4 fill-neutral-500 dark:fill-neutral-400" viewBox="0 0 24 24">
                  <path d="M5 16L3 5l5.5 1L12 2l3.5 4L21 5l-2 11H5zm2.7-2h8.6l.9-5.4-2.1-.4L12 4l-3.1 4.2-2.1.4L7.7 14z"/>
                </svg>
                <span>VIP</span>
              </button>
              <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-800 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                VIP is currently disabled
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="container mx-auto px-4 py-12">
        <div class="max-w-md mx-auto">
          {/* Welcome Card */}
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-text-1000 dark:text-text-0 mb-2">
              Welcome to ChatWii
            </h1>
            <p class="text-lg text-secondary-600 dark:text-secondary-400 font-medium mb-1">
              Chat with Strangers
            </p>
            <p class="text-text-600 dark:text-text-400">
              Connect instantly and anonymously with complete privacy!
            </p>
          </div>

          {/* Registration Card */}
          <div class="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-6 space-y-6">
            <NicknameInput
              value={nickname()}
              onInput={setNickname}
              error={nicknameError()}
              onRandomize={generateRandomNickname}
            />

            <GenderSelection value={gender()} onChange={setGender} />

            <AgeDropdown value={age()} onChange={setAge} />

            {/* CAPTCHA Widget - Enabled for bot protection */}
            <Show when={true}>
              <div class="space-y-2">
                <CaptchaWidget
                  onVerify={handleCaptchaVerify}
                  onExpired={handleCaptchaExpired}
                  onError={handleCaptchaError}
                  theme="light"
                />
                <Show when={captchaError()}>
                  <p class="text-sm text-red-500 dark:text-red-400 text-center">
                    {captchaError()}
                  </p>
                </Show>
              </div>
            </Show>


            {/* Start Chat Button */}
            <button
              onClick={handleStartChat}
              disabled={!isValid() || loading()}
              class={`w-full py-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2
                      ${
                        isValid() && !loading()
                          ? "bg-secondary-500 hover:bg-secondary-600 text-white shadow-md"
                          : "bg-neutral-300 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-400 cursor-not-allowed opacity-50"
                      }`}
            >
              {loading() ? (
                <>
                  <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <BiRegularMessageDetail class="w-5 h-5" />
                  <span>Start Chat</span>
                </>
              )}
            </button>

            <div class="pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <CountryFlag
                countryCode={countryCode()}
                countryName={countryName()}
              />
            </div>
          </div>

          {/* Bottom Tags */}
          <div class="mt-8 flex items-center justify-center gap-6">
            <div class="flex items-center gap-2 text-sm text-text-600 dark:text-text-400">
              <span>🔒</span>
              <span>Safe & Secure</span>
            </div>
            <div class="flex items-center gap-2 text-sm text-text-600 dark:text-text-400">
              <span>👤</span>
              <span>Anonymous</span>
            </div>
            <div class="flex items-center gap-2 text-sm text-text-600 dark:text-text-400">
              <span>🌍</span>
              <span>Global</span>
            </div>
          </div>

          {/* User count */}
          <p class="text-center mt-6 text-sm text-text-600 dark:text-text-400">
            Join thousands of users chatting anonymously worldwide
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer class="mt-auto py-8 border-t border-neutral-200 dark:border-neutral-700">
        <div class="container mx-auto px-4">
          <div class="flex items-center justify-center gap-8 mb-4">
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
      )}
    </>
  );
};

export default Landing;
