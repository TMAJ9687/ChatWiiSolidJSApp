import { Component, createSignal, onMount, For, Show } from "solid-js";
import { FiUpload, FiTrash2, FiStar, FiImage, FiUsers, FiEye, FiDownload, FiGrid } from "solid-icons/fi";
import { avatarService, type Avatar, type AvatarUploadRequest } from "../../../services/supabase/avatarService";
import { createServiceLogger } from "../../../utils/logger";

interface AvatarManagerProps {
  currentUserId: string;
}

interface AvatarStats {
  totalAvatars: number;
  standardAvatars: number;
  vipAvatars: number;
  maleAvatars: number;
  femaleAvatars: number;
  defaultAvatars: number;
}

const logger = createServiceLogger('AvatarManager');

const AvatarManager: Component<AvatarManagerProps> = (props) => {
  const [avatars, setAvatars] = createSignal<Avatar[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [uploading, setUploading] = createSignal(false);
  const [selectedType, setSelectedType] = createSignal<'standard' | 'vip'>('standard');
  const [selectedGender, setSelectedGender] = createSignal<'male' | 'female'>('male');
  const [stats, setStats] = createSignal<AvatarStats>({
    totalAvatars: 0,
    standardAvatars: 0,
    vipAvatars: 0,
    maleAvatars: 0,
    femaleAvatars: 0,
    defaultAvatars: 0,
  });
  const [previewMode, setPreviewMode] = createSignal(false);

  onMount(() => {
    loadAvatars();
    loadStats();
  });

  const loadAvatars = async () => {
    setLoading(true);
    try {
      const allAvatars = await avatarService.getAvatars();
      setAvatars(allAvatars);
    } catch (error) {
      logger.error("Error loading avatars:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statistics = await avatarService.getAvatarStatistics();
      setStats(statistics);
    } catch (error) {
      logger.error("Error loading avatar statistics:", error);
    }
  };

  const filteredAvatars = () => {
    return avatars().filter(avatar => 
      avatar.type === selectedType() && avatar.gender === selectedGender()
    );
  };

  const handleFileUpload = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => {
        const uploadRequest: AvatarUploadRequest = {
          file,
          type: selectedType(),
          gender: selectedGender(),
          isDefault: false,
        };
        return avatarService.uploadAvatar(uploadRequest, props.currentUserId);
      });

      const results = await Promise.all(uploadPromises);
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        await loadAvatars();
        await loadStats();
        
        if (failureCount === 0) {
          alert(`Successfully uploaded ${successCount} avatar(s)`);
        } else {
          alert(`Uploaded ${successCount} avatar(s), ${failureCount} failed`);
        }
      } else {
        alert("Failed to upload avatars. Please check file formats and sizes.");
      }
    } catch (error) {
      logger.error("Error uploading avatars:", error);
      alert("Failed to upload avatars. Please try again.");
    } finally {
      setUploading(false);
      input.value = ""; // Reset file input
    }
  };

  const deleteAvatar = async (avatarId: string) => {
    if (!confirm("Are you sure you want to delete this avatar? This action cannot be undone.")) {
      return;
    }

    try {
      const result = await avatarService.deleteAvatar(avatarId, props.currentUserId);
      
      if (result.success) {
        await loadAvatars();
        await loadStats();
        alert("Avatar deleted successfully");
      } else {
        alert(result.message || "Failed to delete avatar");
      }
    } catch (error) {
      logger.error("Error deleting avatar:", error);
      alert("Failed to delete avatar. Please try again.");
    }
  };

  const setDefaultAvatar = async (avatarId: string) => {
    try {
      const result = await avatarService.setDefaultAvatar(avatarId, props.currentUserId);
      
      if (result.success) {
        await loadAvatars();
        await loadStats();
        alert("Default avatar set successfully");
      } else {
        alert(result.message || "Failed to set default avatar");
      }
    } catch (error) {
      logger.error("Error setting default avatar:", error);
      alert("Failed to set default avatar. Please try again.");
    }
  };

  const clearAllAvatars = async () => {
    const type = selectedType();
    const gender = selectedGender();
    
    if (!confirm(`Are you sure you want to delete ALL ${type} ${gender} avatars? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await avatarService.clearAvatars(type, gender, props.currentUserId);
      
      if (result.success) {
        await loadAvatars();
        await loadStats();
        alert(result.message);
      } else {
        alert(result.message || "Failed to clear avatars");
      }
    } catch (error) {
      logger.error("Error clearing avatars:", error);
      alert("Failed to clear avatars. Please try again.");
    }
  };

  const exportAvatarList = () => {
    const filtered = filteredAvatars();
    const avatarList = filtered.map(avatar => ({
      id: avatar.id,
      url: avatar.url,
      type: avatar.type,
      gender: avatar.gender,
      isDefault: avatar.isDefault,
      createdAt: avatar.createdAt,
    }));

    const blob = new Blob([JSON.stringify(avatarList, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatwii-avatars-${selectedType()}-${selectedGender()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Avatar Manager
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage user avatars for VIP and standard users by gender
          </p>
        </div>
        <div class="mt-4 sm:mt-0 flex gap-2">
          <button
            onClick={() => setPreviewMode(!previewMode())}
            class={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
              previewMode() 
                ? "bg-blue-600 text-white" 
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <FiEye size={14} />
            {previewMode() ? "Edit Mode" : "Preview Mode"}
          </button>
          <button
            onClick={exportAvatarList}
            class="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <FiDownload size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-center gap-2">
            <FiImage class="text-blue-600 dark:text-blue-400" size={16} />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Total</span>
          </div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats().totalAvatars}
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-center gap-2">
            <FiUsers class="text-green-600 dark:text-green-400" size={16} />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Standard</span>
          </div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats().standardAvatars}
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-center gap-2">
            <FiStar class="text-purple-600 dark:text-purple-400" size={16} />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">VIP</span>
          </div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats().vipAvatars}
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-blue-500 rounded"></div>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Male</span>
          </div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats().maleAvatars}
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-pink-500 rounded"></div>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Female</span>
          </div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats().femaleAvatars}
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-center gap-2">
            <FiStar class="text-yellow-600 dark:text-yellow-400" size={16} />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Defaults</span>
          </div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats().defaultAvatars}
          </div>
        </div>
      </div>

      {/* Category Selection */}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Avatar Categories
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User Type
              </label>
              <div class="flex gap-2">
                <button
                  onClick={() => setSelectedType('standard')}
                  class={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    selectedType() === 'standard'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Standard Users
                </button>
                <button
                  onClick={() => setSelectedType('vip')}
                  class={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    selectedType() === 'vip'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  VIP Users
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gender
              </label>
              <div class="flex gap-2">
                <button
                  onClick={() => setSelectedGender('male')}
                  class={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    selectedGender() === 'male'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Male
                </button>
                <button
                  onClick={() => setSelectedGender('female')}
                  class={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    selectedGender() === 'female'
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Female
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <Show when={!previewMode()}>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div class="p-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                Upload Avatars for {selectedType()} {selectedGender()} users
              </h3>
              <div class="mt-2 sm:mt-0 flex gap-2">
                <button
                  onClick={clearAllAvatars}
                  disabled={filteredAvatars().length === 0}
                  class="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm"
                >
                  <FiTrash2 size={14} />
                  Clear All
                </button>
              </div>
            </div>

            <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
              <FiUpload class="mx-auto text-gray-400 mb-4" size={48} />
              <div class="space-y-2">
                <p class="text-lg font-medium text-gray-900 dark:text-white">
                  Upload Avatar Images
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Select multiple images (JPEG, PNG, GIF, WebP) up to 5MB each
                </p>
              </div>
              
              <label class="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                <FiUpload size={16} />
                {uploading() ? "Uploading..." : "Choose Files"}
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileUpload}
                  disabled={uploading()}
                  class="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </Show>

      {/* Avatar Grid */}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              {selectedType()} {selectedGender()} Avatars ({filteredAvatars().length})
            </h3>
            <FiGrid class="text-gray-400" size={20} />
          </div>

          <Show when={loading()}>
            <div class="text-center py-8">
              <div class="text-gray-500 dark:text-gray-400">Loading avatars...</div>
            </div>
          </Show>

          <Show when={!loading() && filteredAvatars().length === 0}>
            <div class="text-center py-12">
              <FiImage class="mx-auto text-gray-400 mb-4" size={48} />
              <p class="text-gray-500 dark:text-gray-400">
                No avatars found for {selectedType()} {selectedGender()} users
              </p>
              <Show when={!previewMode()}>
                <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Upload some images to get started
                </p>
              </Show>
            </div>
          </Show>

          <Show when={!loading() && filteredAvatars().length > 0}>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <For each={filteredAvatars()}>
                {(avatar) => (
                  <div class="relative group">
                    <div class={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                      avatar.isDefault 
                        ? 'border-yellow-400 dark:border-yellow-500' 
                        : 'border-gray-200 dark:border-gray-600'
                    }`}>
                      <img
                        src={avatar.url}
                        alt={`${avatar.type} ${avatar.gender} avatar`}
                        class="w-full h-full object-cover"
                        loading="lazy"
                      />
                      
                      <Show when={avatar.isDefault}>
                        <div class="absolute top-1 right-1 bg-yellow-400 text-yellow-900 rounded-full p-1">
                          <FiStar size={12} />
                        </div>
                      </Show>

                      <Show when={!previewMode()}>
                        <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Show when={!avatar.isDefault}>
                            <button
                              onClick={() => setDefaultAvatar(avatar.id)}
                              class="p-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                              title="Set as default"
                            >
                              <FiStar size={14} />
                            </button>
                          </Show>
                          
                          <button
                            onClick={() => deleteAvatar(avatar.id)}
                            class="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            title="Delete avatar"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </Show>
                    </div>
                    
                    <Show when={previewMode()}>
                      <div class="mt-2 text-center">
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                          {avatar.isDefault ? 'Default' : 'Available'}
                        </div>
                      </div>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>

      {/* Usage Instructions */}
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          Avatar Management Instructions
        </h4>
        <ul class="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Upload avatars for each user type (Standard/VIP) and gender (Male/Female)</li>
          <li>• Set one avatar as default for each category - new users will get this avatar automatically</li>
          <li>• VIP users can access both VIP and Standard avatar collections</li>
          <li>• Standard users can only access Standard avatar collections</li>
          <li>• Supported formats: JPEG, PNG, GIF, WebP (max 5MB each)</li>
          <li>• Use Preview Mode to see how avatars appear to users</li>
        </ul>
      </div>
    </div>
  );
};

export default AvatarManager;