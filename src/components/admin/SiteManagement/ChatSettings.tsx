import { Component, createSignal, onMount, Show } from "solid-js";
import { FiSave, FiRefreshCw, FiImage, FiMessageCircle, FiUsers, FiClock } from "solid-icons/fi";
import { siteSettingsService } from "../../../services/supabase/siteSettingsService";
import { createServiceLogger } from "../../../utils/logger";

interface ChatSettingsData {
  maxImageUploadsStandard: number;
  maxImageUploadsVip: number;
  messageRateLimit: number; // messages per minute
  maxMessageLength: number;
  allowEmojis: boolean;
  allowPrivateMessages: boolean;
  autoDeleteMessages: boolean;
  messageRetentionDays: number;
  enableTypingIndicators: boolean;
  enableReadReceipts: boolean;
  maxRoomCapacity: number;
  allowGuestUsers: boolean;
  moderationLevel: 'low' | 'medium' | 'high';
}

interface ChatSettingsProps {
  currentUserId: string;
}

const logger = createServiceLogger('ChatSettings');

const ChatSettings: Component<ChatSettingsProps> = (props) => {
  const [settings, setSettings] = createSignal<ChatSettingsData>({
    maxImageUploadsStandard: 10,
    maxImageUploadsVip: 50,
    messageRateLimit: 30,
    maxMessageLength: 500,
    allowEmojis: true,
    allowPrivateMessages: true,
    autoDeleteMessages: false,
    messageRetentionDays: 30,
    enableTypingIndicators: true,
    enableReadReceipts: false,
    maxRoomCapacity: 100,
    allowGuestUsers: true,
    moderationLevel: 'medium',
  });

  const [loading, setLoading] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [validationErrors, setValidationErrors] = createSignal<Record<string, string>>({});

  onMount(() => {
    loadSettings();
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [
        maxImageUploadsStandard,
        maxImageUploadsVip,
        messageRateLimit,
        maxMessageLength,
        allowEmojis,
        allowPrivateMessages,
        autoDeleteMessages,
        messageRetentionDays,
        enableTypingIndicators,
        enableReadReceipts,
        maxRoomCapacity,
        allowGuestUsers,
        moderationLevel,
      ] = await Promise.all([
        siteSettingsService.getSetting("max_image_uploads_standard"),
        siteSettingsService.getSetting("max_image_uploads_vip"),
        siteSettingsService.getSetting("message_rate_limit"),
        siteSettingsService.getSetting("max_message_length"),
        siteSettingsService.getSetting("allow_emojis"),
        siteSettingsService.getSetting("allow_private_messages"),
        siteSettingsService.getSetting("auto_delete_messages"),
        siteSettingsService.getSetting("message_retention_days"),
        siteSettingsService.getSetting("enable_typing_indicators"),
        siteSettingsService.getSetting("enable_read_receipts"),
        siteSettingsService.getSetting("max_room_capacity"),
        siteSettingsService.getSetting("allow_guest_users"),
        siteSettingsService.getSetting("moderation_level"),
      ]);

      setSettings({
        maxImageUploadsStandard: parseInt(maxImageUploadsStandard) || 10,
        maxImageUploadsVip: parseInt(maxImageUploadsVip) || 50,
        messageRateLimit: parseInt(messageRateLimit) || 30,
        maxMessageLength: parseInt(maxMessageLength) || 500,
        allowEmojis: allowEmojis === "true" || allowEmojis === true,
        allowPrivateMessages: allowPrivateMessages === "true" || allowPrivateMessages === true,
        autoDeleteMessages: autoDeleteMessages === "true" || autoDeleteMessages === true,
        messageRetentionDays: parseInt(messageRetentionDays) || 30,
        enableTypingIndicators: enableTypingIndicators === "true" || enableTypingIndicators === true,
        enableReadReceipts: enableReadReceipts === "true" || enableReadReceipts === true,
        maxRoomCapacity: parseInt(maxRoomCapacity) || 100,
        allowGuestUsers: allowGuestUsers === "true" || allowGuestUsers === true,
        moderationLevel: (moderationLevel as 'low' | 'medium' | 'high') || 'medium',
      });
    } catch (error) {
      logger.error("Error loading chat settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateSettings = (): boolean => {
    const errors: Record<string, string> = {};
    const currentSettings = settings();

    // Validate numeric values
    if (currentSettings.maxImageUploadsStandard < 0 || currentSettings.maxImageUploadsStandard > 100) {
      errors.maxImageUploadsStandard = "Must be between 0 and 100";
    }
    if (currentSettings.maxImageUploadsVip < 0 || currentSettings.maxImageUploadsVip > 500) {
      errors.maxImageUploadsVip = "Must be between 0 and 500";
    }
    if (currentSettings.messageRateLimit < 1 || currentSettings.messageRateLimit > 120) {
      errors.messageRateLimit = "Must be between 1 and 120 messages per minute";
    }
    if (currentSettings.maxMessageLength < 10 || currentSettings.maxMessageLength > 2000) {
      errors.maxMessageLength = "Must be between 10 and 2000 characters";
    }
    if (currentSettings.messageRetentionDays < 1 || currentSettings.messageRetentionDays > 365) {
      errors.messageRetentionDays = "Must be between 1 and 365 days";
    }
    if (currentSettings.maxRoomCapacity < 10 || currentSettings.maxRoomCapacity > 1000) {
      errors.maxRoomCapacity = "Must be between 10 and 1000 users";
    }

    // Logical validations
    if (currentSettings.maxImageUploadsVip < currentSettings.maxImageUploadsStandard) {
      errors.maxImageUploadsVip = "VIP limit should be higher than standard limit";
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
        siteSettingsService.updateSetting("max_image_uploads_standard", currentSettings.maxImageUploadsStandard.toString()),
        siteSettingsService.updateSetting("max_image_uploads_vip", currentSettings.maxImageUploadsVip.toString()),
        siteSettingsService.updateSetting("message_rate_limit", currentSettings.messageRateLimit.toString()),
        siteSettingsService.updateSetting("max_message_length", currentSettings.maxMessageLength.toString()),
        siteSettingsService.updateSetting("allow_emojis", currentSettings.allowEmojis.toString()),
        siteSettingsService.updateSetting("allow_private_messages", currentSettings.allowPrivateMessages.toString()),
        siteSettingsService.updateSetting("auto_delete_messages", currentSettings.autoDeleteMessages.toString()),
        siteSettingsService.updateSetting("message_retention_days", currentSettings.messageRetentionDays.toString()),
        siteSettingsService.updateSetting("enable_typing_indicators", currentSettings.enableTypingIndicators.toString()),
        siteSettingsService.updateSetting("enable_read_receipts", currentSettings.enableReadReceipts.toString()),
        siteSettingsService.updateSetting("max_room_capacity", currentSettings.maxRoomCapacity.toString()),
        siteSettingsService.updateSetting("allow_guest_users", currentSettings.allowGuestUsers.toString()),
        siteSettingsService.updateSetting("moderation_level", currentSettings.moderationLevel),
      ]);

      alert("Chat settings saved successfully! Changes will be reflected on the main site immediately.");
    } catch (error) {
      logger.error("Error saving chat settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof ChatSettingsData>(key: K, value: ChatSettingsData[K]) => {
    setSettings({ ...settings(), [key]: value });
    
    // Clear validation error for this field
    const errors = { ...validationErrors() };
    delete errors[key];
    setValidationErrors(errors);
  };

  const resetToDefaults = () => {
    if (confirm("Are you sure you want to reset all chat settings to default values?")) {
      setSettings({
        maxImageUploadsStandard: 10,
        maxImageUploadsVip: 50,
        messageRateLimit: 30,
        maxMessageLength: 500,
        allowEmojis: true,
        allowPrivateMessages: true,
        autoDeleteMessages: false,
        messageRetentionDays: 30,
        enableTypingIndicators: true,
        enableReadReceipts: false,
        maxRoomCapacity: 100,
        allowGuestUsers: true,
        moderationLevel: 'medium',
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
            Chat Settings
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Configure chat behavior, limits, and features for all users
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
          <div class="text-gray-500 dark:text-gray-400">Loading chat settings...</div>
        </div>
      </Show>

      <Show when={!loading()}>
        <div class="space-y-6">
          {/* Image Upload Limits */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="p-6">
              <div class="flex items-center gap-2 mb-4">
                <FiImage class="text-blue-600 dark:text-blue-400" size={20} />
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                  Image Upload Limits
                </h3>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Standard Users (per session)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings().maxImageUploadsStandard}
                    onInput={(e) => updateSetting("maxImageUploadsStandard", parseInt(e.currentTarget.value) || 0)}
                    class={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors().maxImageUploadsStandard 
                        ? "border-red-300 dark:border-red-600" 
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  />
                  <Show when={validationErrors().maxImageUploadsStandard}>
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                      {validationErrors().maxImageUploadsStandard}
                    </p>
                  </Show>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Default: 10 images per session
                  </p>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    VIP Users (per session)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={settings().maxImageUploadsVip}
                    onInput={(e) => updateSetting("maxImageUploadsVip", parseInt(e.currentTarget.value) || 0)}
                    class={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors().maxImageUploadsVip 
                        ? "border-red-300 dark:border-red-600" 
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  />
                  <Show when={validationErrors().maxImageUploadsVip}>
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                      {validationErrors().maxImageUploadsVip}
                    </p>
                  </Show>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Should be higher than standard limit
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Message Configuration */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="p-6">
              <div class="flex items-center gap-2 mb-4">
                <FiMessageCircle class="text-green-600 dark:text-green-400" size={20} />
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                  Message Configuration
                </h3>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rate Limit (messages/minute)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={settings().messageRateLimit}
                    onInput={(e) => updateSetting("messageRateLimit", parseInt(e.currentTarget.value) || 1)}
                    class={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors().messageRateLimit 
                        ? "border-red-300 dark:border-red-600" 
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  />
                  <Show when={validationErrors().messageRateLimit}>
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                      {validationErrors().messageRateLimit}
                    </p>
                  </Show>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Message Length (characters)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="2000"
                    value={settings().maxMessageLength}
                    onInput={(e) => updateSetting("maxMessageLength", parseInt(e.currentTarget.value) || 10)}
                    class={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors().maxMessageLength 
                        ? "border-red-300 dark:border-red-600" 
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  />
                  <Show when={validationErrors().maxMessageLength}>
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                      {validationErrors().maxMessageLength}
                    </p>
                  </Show>
                </div>
              </div>

              <div class="mt-6 space-y-4">
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings().allowEmojis}
                    onChange={(e) => updateSetting("allowEmojis", e.currentTarget.checked)}
                    class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    Allow emoji usage in messages
                  </span>
                </label>

                <label class="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings().allowPrivateMessages}
                    onChange={(e) => updateSetting("allowPrivateMessages", e.currentTarget.checked)}
                    class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    Allow private messages between users
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Message Retention */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="p-6">
              <div class="flex items-center gap-2 mb-4">
                <FiClock class="text-purple-600 dark:text-purple-400" size={20} />
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                  Message Retention
                </h3>
              </div>
              
              <div class="space-y-4">
                <label class="flex items-start">
                  <input
                    type="checkbox"
                    checked={settings().autoDeleteMessages}
                    onChange={(e) => updateSetting("autoDeleteMessages", e.currentTarget.checked)}
                    class="mt-1 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <div class="ml-3">
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Auto-delete old messages
                    </span>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      Automatically delete messages after the retention period
                    </p>
                  </div>
                </label>

                <Show when={settings().autoDeleteMessages}>
                  <div class="ml-6">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Retention Period (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={settings().messageRetentionDays}
                      onInput={(e) => updateSetting("messageRetentionDays", parseInt(e.currentTarget.value) || 1)}
                      class={`w-32 p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors().messageRetentionDays 
                          ? "border-red-300 dark:border-red-600" 
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    />
                    <Show when={validationErrors().messageRetentionDays}>
                      <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                        {validationErrors().messageRetentionDays}
                      </p>
                    </Show>
                  </div>
                </Show>
              </div>
            </div>
          </div>

          {/* Chat Features */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="p-6">
              <div class="flex items-center gap-2 mb-4">
                <FiUsers class="text-orange-600 dark:text-orange-400" size={20} />
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                  Chat Features & Behavior
                </h3>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Room Capacity
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={settings().maxRoomCapacity}
                    onInput={(e) => updateSetting("maxRoomCapacity", parseInt(e.currentTarget.value) || 10)}
                    class={`w-full p-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors().maxRoomCapacity 
                        ? "border-red-300 dark:border-red-600" 
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  />
                  <Show when={validationErrors().maxRoomCapacity}>
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                      {validationErrors().maxRoomCapacity}
                    </p>
                  </Show>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Moderation Level
                  </label>
                  <select
                    value={settings().moderationLevel}
                    onChange={(e) => updateSetting("moderationLevel", e.currentTarget.value as 'low' | 'medium' | 'high')}
                    class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low - Minimal filtering</option>
                    <option value="medium">Medium - Balanced filtering</option>
                    <option value="high">High - Strict filtering</option>
                  </select>
                </div>
              </div>

              <div class="mt-6 space-y-4">
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings().enableTypingIndicators}
                    onChange={(e) => updateSetting("enableTypingIndicators", e.currentTarget.checked)}
                    class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    Show typing indicators
                  </span>
                </label>

                <label class="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings().enableReadReceipts}
                    onChange={(e) => updateSetting("enableReadReceipts", e.currentTarget.checked)}
                    class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    Enable read receipts for private messages
                  </span>
                </label>

                <label class="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings().allowGuestUsers}
                    onChange={(e) => updateSetting("allowGuestUsers", e.currentTarget.checked)}
                    class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-3 text-sm text-gray-700 dark:text-gray-300">
                    Allow guest users (without registration)
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ChatSettings;