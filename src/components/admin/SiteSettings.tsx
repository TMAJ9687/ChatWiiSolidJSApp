import { Component, createSignal, onMount, For, Show } from "solid-js";
import { FiSave, FiRefreshCw, FiTrash2, FiPlus, FiEdit2 } from "solid-icons/fi";

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  maxUsers: number;
  allowAnonymous: boolean;
  requireAgeVerification: boolean;
  minAge: number;
  maxAge: number;
  enableVipFeatures: boolean;
  vipPrice: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowedCountries: string[];
  blockedWords: string[];
  autoModeration: boolean;
  reportThreshold: number;
}

interface SiteSettingsProps {
  currentUserId: string;
}

const SiteSettings: Component<SiteSettingsProps> = (props) => {
  const [settings, setSettings] = createSignal<SiteSettings>({
    siteName: "ChatWii",
    siteDescription: "Connect with people from around the world",
    maxUsers: 1000,
    allowAnonymous: true,
    requireAgeVerification: true,
    minAge: 18,
    maxAge: 80,
    enableVipFeatures: true,
    vipPrice: 9.99,
    maintenanceMode: false,
    maintenanceMessage: "We'll be back soon! ChatWii is currently undergoing maintenance.",
    allowedCountries: [],
    blockedWords: ["spam", "scam", "fraud"],
    autoModeration: true,
    reportThreshold: 3,
  });

  const [loading, setLoading] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [newBlockedWord, setNewBlockedWord] = createSignal("");
  const [newCountry, setNewCountry] = createSignal("");

  const countries = [
    "United States", "Canada", "United Kingdom", "Germany", "France", "Italy", "Spain",
    "Australia", "Japan", "South Korea", "Brazil", "Mexico", "India", "China", "Russia",
    "Netherlands", "Sweden", "Norway", "Denmark", "Finland", "Switzerland", "Austria",
    "Belgium", "Ireland", "Portugal", "Greece", "Turkey", "Poland", "Czech Republic",
    "Hungary", "Romania", "Bulgaria", "Croatia", "Serbia", "Ukraine", "Lithuania",
    "Latvia", "Estonia", "Slovakia", "Slovenia", "Malta", "Cyprus", "Luxembourg",
    "Iceland", "New Zealand", "South Africa", "Argentina", "Chile", "Colombia", "Peru"
  ];

  onMount(() => {
    loadSettings();
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      // In a real app, load from Supabase settings table
      // For now, load from localStorage as demo
      const savedSettings = localStorage.getItem("chatwii-admin-settings");
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // In a real app, save to Supabase settings table
      // For now, save to localStorage as demo
      localStorage.setItem("chatwii-admin-settings", JSON.stringify(settings()));
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    if (confirm("Are you sure you want to reset all settings to default values?")) {
      setSettings({
        siteName: "ChatWii",
        siteDescription: "Connect with people from around the world",
        maxUsers: 1000,
        allowAnonymous: true,
        requireAgeVerification: true,
        minAge: 18,
        maxAge: 80,
        enableVipFeatures: true,
        vipPrice: 9.99,
        maintenanceMode: false,
        maintenanceMessage: "We'll be back soon! ChatWii is currently undergoing maintenance.",
        allowedCountries: [],
        blockedWords: ["spam", "scam", "fraud"],
        autoModeration: true,
        reportThreshold: 3,
      });
    }
  };

  const updateSetting = (key: keyof SiteSettings, value: any) => {
    setSettings({ ...settings(), [key]: value });
  };

  const addBlockedWord = () => {
    const word = newBlockedWord().trim().toLowerCase();
    if (word && !settings().blockedWords.includes(word)) {
      updateSetting("blockedWords", [...settings().blockedWords, word]);
      setNewBlockedWord("");
    }
  };

  const removeBlockedWord = (word: string) => {
    updateSetting("blockedWords", settings().blockedWords.filter(w => w !== word));
  };

  const addAllowedCountry = () => {
    const country = newCountry().trim();
    if (country && !settings().allowedCountries.includes(country)) {
      updateSetting("allowedCountries", [...settings().allowedCountries, country]);
      setNewCountry("");
    }
  };

  const removeAllowedCountry = (country: string) => {
    updateSetting("allowedCountries", settings().allowedCountries.filter(c => c !== country));
  };

  return (
    <div class="space-y-8">
      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            Site Settings
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Configure global site settings and preferences
          </p>
        </div>
        <div class="mt-4 sm:mt-0 flex gap-2">
          <button
            onClick={resetSettings}
            class="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <FiRefreshCw size={16} />
            Reset
          </button>
          <button
            onClick={saveSettings}
            disabled={saving()}
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <FiSave size={16} />
            {saving() ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <Show when={loading()}>
        <div class="text-center py-12">
          <div class="text-gray-500 dark:text-gray-400">Loading settings...</div>
        </div>
      </Show>

      <Show when={!loading()}>
        <div class="space-y-8">
          {/* General Settings */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="p-6">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                General Settings
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={settings().siteName}
                    onInput={(e) => updateSetting("siteName", e.currentTarget.value)}
                    class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Users Online
                  </label>
                  <input
                    type="number"
                    value={settings().maxUsers}
                    onInput={(e) => updateSetting("maxUsers", parseInt(e.currentTarget.value) || 0)}
                    class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Site Description
                  </label>
                  <textarea
                    value={settings().siteDescription}
                    onInput={(e) => updateSetting("siteDescription", e.currentTarget.value)}
                    rows="3"
                    class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div class="mt-6 space-y-4">
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings().allowAnonymous}
                    onChange={(e) => updateSetting("allowAnonymous", e.currentTarget.checked)}
                    class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    Allow anonymous users
                  </span>
                </label>
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings().requireAgeVerification}
                    onChange={(e) => updateSetting("requireAgeVerification", e.currentTarget.checked)}
                    class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    Require age verification
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Age Settings */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="p-6">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Age Restrictions
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Minimum Age
                  </label>
                  <input
                    type="number"
                    value={settings().minAge}
                    onInput={(e) => updateSetting("minAge", parseInt(e.currentTarget.value) || 18)}
                    min="13"
                    max="100"
                    class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maximum Age
                  </label>
                  <input
                    type="number"
                    value={settings().maxAge}
                    onInput={(e) => updateSetting("maxAge", parseInt(e.currentTarget.value) || 80)}
                    min="18"
                    max="120"
                    class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* VIP Settings */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="p-6">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                VIP Settings
              </h2>
              <div class="space-y-4">
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings().enableVipFeatures}
                    onChange={(e) => updateSetting("enableVipFeatures", e.currentTarget.checked)}
                    class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    Enable VIP features
                  </span>
                </label>
                <Show when={settings().enableVipFeatures}>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      VIP Price (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings().vipPrice}
                      onInput={(e) => updateSetting("vipPrice", parseFloat(e.currentTarget.value) || 0)}
                      class="w-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </Show>
              </div>
            </div>
          </div>

          {/* Maintenance Mode */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="p-6">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Maintenance Mode
              </h2>
              <div class="space-y-4">
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings().maintenanceMode}
                    onChange={(e) => updateSetting("maintenanceMode", e.currentTarget.checked)}
                    class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    Enable maintenance mode
                  </span>
                </label>
                <Show when={settings().maintenanceMode}>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Maintenance Message
                    </label>
                    <textarea
                      value={settings().maintenanceMessage}
                      onInput={(e) => updateSetting("maintenanceMessage", e.currentTarget.value)}
                      rows="3"
                      class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                </Show>
              </div>
            </div>
          </div>

          {/* Moderation Settings */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="p-6">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Moderation Settings
              </h2>
              <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <label class="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings().autoModeration}
                      onChange={(e) => updateSetting("autoModeration", e.currentTarget.checked)}
                      class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span class="ml-3 text-sm text-gray-700 dark:text-gray-300">
                      Enable auto-moderation
                    </span>
                  </label>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Auto-suspend after reports
                    </label>
                    <input
                      type="number"
                      value={settings().reportThreshold}
                      onInput={(e) => updateSetting("reportThreshold", parseInt(e.currentTarget.value) || 3)}
                      min="1"
                      max="10"
                      class="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Blocked Words */}
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Blocked Words
                  </label>
                  <div class="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newBlockedWord()}
                      onInput={(e) => setNewBlockedWord(e.currentTarget.value)}
                      onKeyPress={(e) => e.key === "Enter" && addBlockedWord()}
                      placeholder="Add blocked word..."
                      class="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={addBlockedWord}
                      class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <FiPlus size={16} />
                    </button>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <For each={settings().blockedWords}>
                      {(word) => (
                        <span class="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm">
                          {word}
                          <button
                            onClick={() => removeBlockedWord(word)}
                            class="text-red-500 hover:text-red-700 ml-1"
                          >
                            ×
                          </button>
                        </span>
                      )}
                    </For>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Country Restrictions */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="p-6">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Country Restrictions
              </h2>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Leave empty to allow all countries. Add countries to restrict access to only these countries.
              </p>
              <div class="space-y-4">
                <div class="flex gap-2">
                  <select
                    value={newCountry()}
                    onChange={(e) => setNewCountry(e.currentTarget.value)}
                    class="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a country...</option>
                    <For each={countries.filter(c => !settings().allowedCountries.includes(c))}>
                      {(country) => <option value={country}>{country}</option>}
                    </For>
                  </select>
                  <button
                    onClick={addAllowedCountry}
                    disabled={!newCountry()}
                    class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <FiPlus size={16} />
                  </button>
                </div>
                <Show when={settings().allowedCountries.length > 0}>
                  <div class="space-y-2">
                    <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Allowed Countries ({settings().allowedCountries.length})
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      <For each={settings().allowedCountries}>
                        {(country) => (
                          <div class="flex items-center justify-between px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg">
                            <span class="text-sm">{country}</span>
                            <button
                              onClick={() => removeAllowedCountry(country)}
                              class="text-green-500 hover:text-green-700 ml-2"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div class="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving()}
              class="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <FiSave size={18} />
              {saving() ? "Saving Changes..." : "Save All Changes"}
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default SiteSettings;