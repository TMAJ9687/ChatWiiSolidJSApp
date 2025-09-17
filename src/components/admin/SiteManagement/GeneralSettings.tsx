import { Component, createSignal, onMount, Show } from "solid-js";
import { FiSave, FiRefreshCw, FiAlertTriangle, FiDownload, FiUpload } from "solid-icons/fi";
import { siteSettingsService } from "../../../services/supabase/siteSettingsService";
import { createServiceLogger } from "../../../utils/logger";

interface GeneralSettingsData {
  adsenseLink1: string;
  adsenseLink2: string;
  adsenseLink3: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

interface GeneralSettingsProps {
  currentUserId: string;
}

const logger = createServiceLogger('GeneralSettings');

const GeneralSettings: Component<GeneralSettingsProps> = (props) => {
  const [settings, setSettings] = createSignal<GeneralSettingsData>({
    adsenseLink1: "",
    adsenseLink2: "",
    adsenseLink3: "",
    maintenanceMode: false,
    maintenanceMessage: "We'll be back soon! ChatWii is currently undergoing maintenance.",
  });

  const [loading, setLoading] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [validationErrors, setValidationErrors] = createSignal<Record<string, string>>({});
  const [lastBackup, setLastBackup] = createSignal<string | null>(null);

  onMount(() => {
    loadSettings();
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [adsenseLink1, adsenseLink2, adsenseLink3, maintenanceMode, maintenanceMessage] = await Promise.all([
        siteSettingsService.getSetting("adsense_link_1"),
        siteSettingsService.getSetting("adsense_link_2"),
        siteSettingsService.getSetting("adsense_link_3"),
        siteSettingsService.getSetting("maintenance_mode"),
        siteSettingsService.getSetting("maintenance_message"),
      ]);

      setSettings({
        adsenseLink1: adsenseLink1 || "",
        adsenseLink2: adsenseLink2 || "",
        adsenseLink3: adsenseLink3 || "",
        maintenanceMode: maintenanceMode === "true" || maintenanceMode === true,
        maintenanceMessage: maintenanceMessage || "We'll be back soon! ChatWii is currently undergoing maintenance.",
      });

      // Load last backup timestamp
      const backup = await siteSettingsService.getSetting("last_settings_backup");
      setLastBackup(backup);
    } catch (error) {
      logger.error("Error loading general settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateSettings = (): boolean => {
    const errors: Record<string, string> = {};
    const currentSettings = settings();

    // Validate AdSense links (should be valid URLs if provided)
    const urlRegex = /^https?:\/\/.+/;
    
    if (currentSettings.adsenseLink1 && !urlRegex.test(currentSettings.adsenseLink1)) {
      errors.adsenseLink1 = "Please enter a valid URL starting with http:// or https://";
    }
    if (currentSettings.adsenseLink2 && !urlRegex.test(currentSettings.adsenseLink2)) {
      errors.adsenseLink2 = "Please enter a valid URL starting with http:// or https://";
    }
    if (currentSettings.adsenseLink3 && !urlRegex.test(currentSettings.adsenseLink3)) {
      errors.adsenseLink3 = "Please enter a valid URL starting with http:// or https://";
    }

    // Validate maintenance message
    if (currentSettings.maintenanceMode && !currentSettings.maintenanceMessage.trim()) {
      errors.maintenanceMessage = "Maintenance message is required when maintenance mode is enabled";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveSettings = async () => {
    if (!validateSettings()) {
      return;
    }

    setSaving(true);
    try {
      const currentSettings = settings();
      
      // Save all settings
      await Promise.all([
        siteSettingsService.updateSetting("adsense_link_1", currentSettings.adsenseLink1),
        siteSettingsService.updateSetting("adsense_link_2", currentSettings.adsenseLink2),
        siteSettingsService.updateSetting("adsense_link_3", currentSettings.adsenseLink3),
        siteSettingsService.updateSetting("maintenance_mode", currentSettings.maintenanceMode.toString()),
        siteSettingsService.updateSetting("maintenance_message", currentSettings.maintenanceMessage),
      ]);

      // Create automatic backup
      await createBackup();

      alert("General settings saved successfully! Changes will be reflected on the site immediately.");
    } catch (error) {
      logger.error("Error saving general settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const createBackup = async () => {
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        settings: settings(),
        createdBy: props.currentUserId,
      };

      await siteSettingsService.updateSetting("settings_backup", JSON.stringify(backupData));
      await siteSettingsService.updateSetting("last_settings_backup", backupData.timestamp);
      setLastBackup(backupData.timestamp);
    } catch (error) {
      logger.error("Error creating backup:", error);
    }
  };

  const downloadBackup = async () => {
    try {
      const backupData = await siteSettingsService.getSetting("settings_backup");
      if (backupData) {
        const blob = new Blob([backupData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chatwii-settings-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      logger.error("Error downloading backup:", error);
      alert("Failed to download backup.");
    }
  };

  const restoreFromBackup = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      
      if (backupData.settings && confirm("Are you sure you want to restore settings from this backup? Current settings will be overwritten.")) {
        setSettings(backupData.settings);
        await saveSettings();
        alert("Settings restored successfully from backup!");
      }
    } catch (error) {
      logger.error("Error restoring backup:", error);
      alert("Invalid backup file. Please select a valid backup file.");
    }
    
    // Reset file input
    input.value = "";
  };

  const updateSetting = <K extends keyof GeneralSettingsData>(key: K, value: GeneralSettingsData[K]) => {
    setSettings({ ...settings(), [key]: value });
    
    // Clear validation error for this field
    const errors = { ...validationErrors() };
    delete errors[key];
    setValidationErrors(errors);
  };

  const resetToDefaults = () => {
    if (confirm("Are you sure you want to reset all general settings to default values?")) {
      setSettings({
        adsenseLink1: "",
        adsenseLink2: "",
        adsenseLink3: "",
        maintenanceMode: false,
        maintenanceMessage: "We'll be back soon! ChatWii is currently undergoing maintenance.",
      });
      setValidationErrors({});
    }
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            General Settings
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Configure AdSense links, maintenance mode, and backup settings
          </p>
        </div>
        <div class="mt-4 sm:mt-0 flex gap-2">
          <button
            onClick={resetToDefaults}
            class="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
          >
            <FiRefreshCw size={14} />
            Reset
          </button>
          <button
            onClick={saveSettings}
            disabled={saving() || loading()}
            class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
          >
            <FiSave size={14} />
            {saving() ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <Show when={loading()}>
        <div class="text-center py-8">
          <div class="text-gray-500 dark:text-gray-400">Loading general settings...</div>
        </div>
      </Show>

      <Show when={!loading()}>
        <div class="space-y-6">
          {/* AdSense Links */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="p-6">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Google AdSense Configuration
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Configure up to 3 AdSense links that will be displayed on the site. Changes take effect immediately.
              </p>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    AdSense Link 1
                  </label>
                  <input
                    type="url"
                    value={settings().adsenseLink1}
                    onInput={(e) => updateSetting("adsenseLink1", e.currentTarget.value)}
                    placeholder="https://example.com/ad1"
                    class={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors().adsenseLink1 
                        ? "border-red-300 dark:border-red-600" 
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  />
                  <Show when={validationErrors().adsenseLink1}>
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                      {validationErrors().adsenseLink1}
                    </p>
                  </Show>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    AdSense Link 2
                  </label>
                  <input
                    type="url"
                    value={settings().adsenseLink2}
                    onInput={(e) => updateSetting("adsenseLink2", e.currentTarget.value)}
                    placeholder="https://example.com/ad2"
                    class={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors().adsenseLink2 
                        ? "border-red-300 dark:border-red-600" 
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  />
                  <Show when={validationErrors().adsenseLink2}>
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                      {validationErrors().adsenseLink2}
                    </p>
                  </Show>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    AdSense Link 3
                  </label>
                  <input
                    type="url"
                    value={settings().adsenseLink3}
                    onInput={(e) => updateSetting("adsenseLink3", e.currentTarget.value)}
                    placeholder="https://example.com/ad3"
                    class={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors().adsenseLink3 
                        ? "border-red-300 dark:border-red-600" 
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  />
                  <Show when={validationErrors().adsenseLink3}>
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                      {validationErrors().adsenseLink3}
                    </p>
                  </Show>
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance Mode */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="p-6">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Maintenance Mode
              </h3>
              
              <div class="space-y-4">
                <label class="flex items-start">
                  <input
                    type="checkbox"
                    checked={settings().maintenanceMode}
                    onChange={(e) => updateSetting("maintenanceMode", e.currentTarget.checked)}
                    class="mt-1 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <div class="ml-3">
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable maintenance mode
                    </span>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      When enabled, the entire site will show a maintenance page to all users except admins
                    </p>
                  </div>
                </label>

                <Show when={settings().maintenanceMode}>
                  <div class="ml-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div class="flex items-center gap-2 mb-3">
                      <FiAlertTriangle class="text-yellow-600 dark:text-yellow-400" size={16} />
                      <span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Maintenance Mode Active
                      </span>
                    </div>
                    
                    <div>
                      <label class="block text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                        Maintenance Message
                      </label>
                      <textarea
                        value={settings().maintenanceMessage}
                        onInput={(e) => updateSetting("maintenanceMessage", e.currentTarget.value)}
                        rows="3"
                        placeholder="Enter the message users will see during maintenance..."
                        class={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                          validationErrors().maintenanceMessage 
                            ? "border-red-300 dark:border-red-600" 
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      />
                      <Show when={validationErrors().maintenanceMessage}>
                        <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                          {validationErrors().maintenanceMessage}
                        </p>
                      </Show>
                    </div>
                  </div>
                </Show>
              </div>
            </div>
          </div>

          {/* Backup and Restore */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="p-6">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Settings Backup & Restore
              </h3>
              
              <div class="space-y-4">
                <Show when={lastBackup()}>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    Last backup: {new Date(lastBackup()!).toLocaleString()}
                  </p>
                </Show>

                <div class="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={downloadBackup}
                    class="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <FiDownload size={14} />
                    Download Backup
                  </button>
                  
                  <label class="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer text-sm">
                    <FiUpload size={14} />
                    Restore from Backup
                    <input
                      type="file"
                      accept=".json"
                      onChange={restoreFromBackup}
                      class="hidden"
                    />
                  </label>
                </div>

                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Backups are created automatically when settings are saved. You can also manually download and restore backups.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default GeneralSettings;