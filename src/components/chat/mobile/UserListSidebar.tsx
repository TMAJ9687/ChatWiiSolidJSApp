import { Component, For, Show, createSignal, createEffect, onCleanup, onMount } from "solid-js";
import { FiFilter, FiSearch, FiX } from "solid-icons/fi";
import UserListItem from "./UserListItem";
import { blockingServiceWorkaround as blockingService } from "../../../services/supabase/blockingServiceWorkaround";
import { supabase } from "../../../config/supabase";
import { COUNTRIES } from "../../../utils/countries";
import type { User } from "../../../types/user.types";

interface FilterOptions {
  genders: Set<'male' | 'female'>;
  ageMin: number;
  ageMax: number;
  countries: Set<string>;
}

interface UserListSidebarProps {
  users: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
  currentUser: User | null;
  isOpen?: boolean; // For mobile overlay
  onClose?: () => void; // For mobile overlay
}

const UserListSidebar: Component<UserListSidebarProps> = (props) => {
  const [blockedUsers, setBlockedUsers] = createSignal<string[]>([]);
  const [usersWhoBlockedMe, setUsersWhoBlockedMe] = createSignal<string[]>([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [showFilterPopup, setShowFilterPopup] = createSignal(false);
  const [isScrolling, setIsScrolling] = createSignal(false);
  const [touchStartY, setTouchStartY] = createSignal(0);
  const [touchStartTime, setTouchStartTime] = createSignal(0);
  const [hasMoved, setHasMoved] = createSignal(false);
  const [isTouchDevice, setIsTouchDevice] = createSignal(false);
  const [touchTarget, setTouchTarget] = createSignal<EventTarget | null>(null);
  const [filters, setFilters] = createSignal<FilterOptions>({
    genders: new Set(['male', 'female']),
    ageMin: 18,
    ageMax: 90,
    countries: new Set()
  });

  let filterRef: HTMLDivElement | undefined;
  let scrollContainer: HTMLDivElement | undefined;
  let scrollTimer: NodeJS.Timeout | null = null;

  // Load blocked users and set up real-time updates
  createEffect(async () => {
    if (props.currentUser) {
      try {
        // Load initial blocked users (users I blocked)
        const blocked = await blockingService.getBlockedUsers();
        setBlockedUsers(blocked.map(b => b.id));

        // Load users who blocked me
        const whoBlockedMe = await blockingService.getUsersWhoBlockedMe();
        setUsersWhoBlockedMe(whoBlockedMe);
      } catch (error) {
        console.error('Error loading blocked users:', error);
      }
    }
  });

  // Set up real-time blocking updates with manual refresh fallback
  createEffect(() => {
    if (!props.currentUser) return;

    // Set up periodic refresh as fallback since realtime might not work
    const refreshInterval = setInterval(async () => {
      try {
        const [blocked, whoBlockedMe] = await Promise.all([
          blockingService.getBlockedUsers(),
          blockingService.getUsersWhoBlockedMe()
        ]);

        setBlockedUsers(blocked.map(b => b.id));
        setUsersWhoBlockedMe(whoBlockedMe);
      } catch (error) {
        // Periodic refresh failed - will retry
      }
    }, 2000); // Refresh every 2 seconds

    // Also try realtime updates
    const channel = supabase
      .channel(`user-list-blocks-${props.currentUser!.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'blocks',
        filter: `or(blocker_id.eq.${props.currentUser!.id},blocked_id.eq.${props.currentUser!.id})`
      }, async (payload) => {
        // Real-time block change detected
        try {
          // Force refresh the service cache
          await blockingService.forceRefresh();

          const [blocked, whoBlockedMe] = await Promise.all([
            blockingService.getBlockedUsers(),
            blockingService.getUsersWhoBlockedMe()
          ]);

          // Updated blocked users list
          setBlockedUsers(blocked.map(b => b.id));
          setUsersWhoBlockedMe(whoBlockedMe);
        } catch (error) {
          console.error('Error refreshing blocked users:', error);
        }
      })
      .subscribe();

    onCleanup(() => {
      clearInterval(refreshInterval);
      channel.unsubscribe();
    });
  });



  // Check if any filters are active
  const hasActiveFilters = () => {
    const currentFilters = filters();
    return (
      currentFilters.genders.size < 2 || // Not both genders selected
      currentFilters.ageMin > 18 ||
      currentFilters.ageMax < 90 ||
      currentFilters.countries.size > 0
    );
  };

  // Filter and sort users based on search query, filters, and hierarchy
  const filteredUsers = () => {
    let users = props.users;

    // Apply search filter
    const query = searchQuery().toLowerCase().trim();
    if (query) {
      users = users.filter(user =>
        user.nickname.toLowerCase().includes(query)
      );
    }

    // Apply filters
    const currentFilters = filters();

    // Gender filter
    if (currentFilters.genders.size < 2) {
      users = users.filter(user => currentFilters.genders.has(user.gender));
    }

    // Age filter
    users = users.filter(user =>
      user.age >= currentFilters.ageMin && user.age <= currentFilters.ageMax
    );

    // Country filter
    if (currentFilters.countries.size > 0) {
      users = users.filter(user => currentFilters.countries.has(user.country.toLowerCase()));
    }

    // Hierarchical sorting
    return users.sort((a, b) => {
      // 1. Admin users always come first
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (b.role === 'admin' && a.role !== 'admin') return 1;
      if (a.role === 'admin' && b.role === 'admin') {
        return a.nickname.localeCompare(b.nickname);
      }

      // 2. VIP users come next, sorted by subscription age (oldest VIP first)
      if (a.role === 'vip' && b.role !== 'vip') return -1;
      if (b.role === 'vip' && a.role !== 'vip') return 1;
      if (a.role === 'vip' && b.role === 'vip') {
        // Sort by VIP expires_at date - earlier dates mean older subscriptions
        const aVipDate = a.vip_expires_at ? new Date(a.vip_expires_at) : new Date();
        const bVipDate = b.vip_expires_at ? new Date(b.vip_expires_at) : new Date();
        const comparison = aVipDate.getTime() - bVipDate.getTime();
        if (comparison !== 0) return comparison;
        return a.nickname.localeCompare(b.nickname);
      }

      // 3. Standard users - geographic sorting
      const currentUserCountry = props.currentUser?.country?.toLowerCase() || '';
      const aCountry = a.country?.toLowerCase() || '';
      const bCountry = b.country?.toLowerCase() || '';

      // Current user's country first
      if (aCountry === currentUserCountry && bCountry !== currentUserCountry) return -1;
      if (bCountry === currentUserCountry && aCountry !== currentUserCountry) return 1;

      // If both are in current user's country or both are not, sort alphabetically by country
      if (aCountry !== bCountry) {
        return aCountry.localeCompare(bCountry);
      }

      // Within same country, sort alphabetically by nickname
      return a.nickname.localeCompare(b.nickname);
    });
  };

  // Handle filter changes
  const toggleGender = (gender: 'male' | 'female') => {
    const currentFilters = filters();
    const newGenders = new Set(currentFilters.genders);

    if (newGenders.has(gender)) {
      if (newGenders.size > 1) { // Don't allow unchecking if it's the last one
        newGenders.delete(gender);
      }
    } else {
      newGenders.add(gender);
    }

    setFilters({
      ...currentFilters,
      genders: newGenders
    });
  };

  const updateAgeRange = (min: number, max: number) => {
    const currentFilters = filters();
    setFilters({
      ...currentFilters,
      ageMin: min,
      ageMax: max
    });
  };

  const toggleCountry = (countryCode: string) => {
    const currentFilters = filters();
    const newCountries = new Set(currentFilters.countries);
    const maxCountries = props.currentUser?.role === 'standard' ? 2 : 10; // More for VIP/Admin

    if (newCountries.has(countryCode)) {
      newCountries.delete(countryCode);
    } else if (newCountries.size < maxCountries) {
      newCountries.add(countryCode);
    }

    setFilters({
      ...currentFilters,
      countries: newCountries
    });
  };

  const clearFilters = () => {
    setFilters({
      genders: new Set(['male', 'female']),
      ageMin: 18,
      ageMax: 90,
      countries: new Set()
    });
  };

  // Handle click outside to close filter popup
  const handleClickOutside = (e: Event) => {
    if (filterRef && !filterRef.contains(e.target as Node)) {
      setShowFilterPopup(false);
    }
  };

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('click', handleClickOutside);
    if (scrollTimer) clearTimeout(scrollTimer);
  });

  // Handle scroll events to detect when user is scrolling
  const handleScroll = () => {
    setIsScrolling(true);
    
    // Clear existing timer
    if (scrollTimer) clearTimeout(scrollTimer);
    
    // Set timer to stop scrolling detection after scroll ends
    scrollTimer = setTimeout(() => {
      setIsScrolling(false);
    }, 150); // Short delay to ensure scroll momentum is done
  };

  const handleTouchStart = (e: TouchEvent) => {
    setIsTouchDevice(true);
    setTouchStartY(e.touches[0].clientY);
    setTouchStartTime(Date.now());
    setHasMoved(false);
    setIsScrolling(false); // Reset scroll state
    setTouchTarget(e.target); // Track what element was initially touched
    if (scrollTimer) clearTimeout(scrollTimer);
  };

  // Add new touch move handler - detects movement immediately
  const handleTouchMove = (e: TouchEvent) => {
    const moveThreshold = 5; // pixels - very sensitive to catch scroll intent early
    const currentY = e.touches[0].clientY;
    
    if (Math.abs(currentY - touchStartY()) > moveThreshold) {
      setHasMoved(true);
      setIsScrolling(true); // Set scrolling immediately on movement
    }
  };

  // Add touch end handler
  const handleTouchEnd = () => {
    // Reset after a small delay to handle any pending clicks
    setTimeout(() => {
      setHasMoved(false);
      setIsScrolling(false);
      setTouchTarget(null); // Clear the touch target
    }, 100);
  };

  // Mobile overlay handling
  const handleUserSelect = (user: User) => {
    props.onSelectUser(user);
    // Close overlay on mobile after selection
    if (props.onClose) {
      props.onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay Backdrop - Only show on mobile when open */}
      <Show when={props.isOpen}>
        <div 
          class="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={props.onClose}
        />
      </Show>
      
      {/* User List Sidebar */}
      <aside class={`
        ${props.isOpen ? 'flex' : 'hidden'} 
        fixed inset-0 z-30 md:relative md:z-auto md:inset-auto
        w-full md:max-w-none md:w-80 
        bg-white dark:bg-neutral-800 
        md:border-r border-neutral-200 dark:border-neutral-700 
        flex-col
        h-full
      `}>
        {/* Mobile Close Button */}
        <Show when={props.isOpen && props.onClose}>
          <div class="flex items-center justify-between p-3 border-b border-neutral-200 dark:border-neutral-700 md:hidden">
            <h3 class="text-lg font-semibold text-text-1000 dark:text-text-0">Select User</h3>
            <button
              onClick={props.onClose}
              class="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              aria-label="Close user list"
            >
              <FiX class="w-5 h-5 text-text-600 dark:text-text-400" />
            </button>
          </div>
        </Show>
        
        <div class="p-3 border-b border-neutral-200 dark:border-neutral-700">
          <div class="flex items-center gap-3 h-10">
          {/* Search Bar */}
          <div class="relative flex-1">
            <FiSearch class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-400 dark:text-text-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="w-full h-10 pl-10 pr-3 bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm text-text-900 dark:text-text-100 placeholder:text-text-400 dark:placeholder:text-text-500 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
            />
          </div>

          {/* Filter Button */}
          <div class="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilterPopup(!showFilterPopup())}
              class={`p-2 rounded-lg transition-colors relative ${hasActiveFilters()
                ? 'bg-secondary-100 dark:bg-secondary-900/20 text-secondary-600 dark:text-secondary-400'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-text-600 dark:text-text-400'
                }`}
              aria-label="Filter"
            >
              <FiFilter class="w-4 h-4" />
              {hasActiveFilters() && (
                <div class="absolute -top-1 -right-1 w-2 h-2 bg-secondary-500 rounded-full"></div>
              )}
            </button>

            {/* Filter Popup */}
            <Show when={showFilterPopup()}>
              <div class="fixed top-16 right-4 w-80 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-2xl z-[9999] max-h-[calc(100vh-5rem)] overflow-y-auto">
                <div class="p-4 space-y-4">
                  {/* Header */}
                  <div class="flex items-center justify-between">
                    <h3 class="font-medium text-text-900 dark:text-text-100">Filter Users</h3>
                    <button
                      onClick={() => setShowFilterPopup(false)}
                      class="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    >
                      <FiX class="w-4 h-4 text-text-500" />
                    </button>
                  </div>

                  {/* Gender Filter */}
                  <div>
                    <label class="block text-sm font-medium text-text-800 dark:text-text-200 mb-2">Gender</label>
                    <div class="flex gap-4">
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters().genders.has('male')}
                          onChange={() => toggleGender('male')}
                          class="w-4 h-4 text-secondary-600 border-neutral-300 dark:border-neutral-500 rounded focus:ring-secondary-500 dark:bg-neutral-700"
                        />
                        <span class="text-sm text-text-800 dark:text-text-200">Male</span>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters().genders.has('female')}
                          onChange={() => toggleGender('female')}
                          class="w-4 h-4 text-secondary-600 border-neutral-300 dark:border-neutral-500 rounded focus:ring-secondary-500 dark:bg-neutral-700"
                        />
                        <span class="text-sm text-text-800 dark:text-text-200">Female</span>
                      </label>
                    </div>
                  </div>

                  {/* Age Range */}
                  <div>
                    <label class="block text-sm font-medium text-text-800 dark:text-text-200 mb-2">
                      Age Range: {filters().ageMin} - {filters().ageMax}
                    </label>
                    <div class="space-y-2">
                      <div>
                        <label class="text-xs text-text-600 dark:text-text-400">Minimum: {filters().ageMin}</label>
                        <input
                          type="range"
                          min="18"
                          max="90"
                          value={filters().ageMin}
                          onInput={(e) => updateAgeRange(Number(e.currentTarget.value), filters().ageMax)}
                          class="w-full h-2 bg-neutral-200 dark:bg-neutral-600 rounded-lg appearance-none cursor-pointer slider-thumb"
                        />
                      </div>
                      <div>
                        <label class="text-xs text-text-600 dark:text-text-400">Maximum: {filters().ageMax}</label>
                        <input
                          type="range"
                          min="18"
                          max="90"
                          value={filters().ageMax}
                          onInput={(e) => updateAgeRange(filters().ageMin, Number(e.currentTarget.value))}
                          class="w-full h-2 bg-neutral-200 dark:bg-neutral-600 rounded-lg appearance-none cursor-pointer slider-thumb"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Country Filter */}
                  <div>
                    <label class="block text-sm font-medium text-text-800 dark:text-text-200 mb-2">
                      Countries
                      <span class="text-xs text-text-500 ml-1">
                        ({filters().countries.size}/{props.currentUser?.role === 'standard' ? 2 : 10} selected)
                      </span>
                    </label>
                    <div class="max-h-32 overflow-y-auto border border-neutral-200 dark:border-neutral-600 rounded p-2 space-y-1">
                      <For each={COUNTRIES}>
                        {(country) => (
                          <label class="flex items-center gap-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 p-1 rounded text-xs">
                            <input
                              type="checkbox"
                              checked={filters().countries.has(country.code.toLowerCase())}
                              onChange={() => toggleCountry(country.code.toLowerCase())}
                              disabled={
                                !filters().countries.has(country.code.toLowerCase()) &&
                                filters().countries.size >= (props.currentUser?.role === 'standard' ? 2 : 10)
                              }
                              class="w-3 h-3 text-secondary-600 border-neutral-300 dark:border-neutral-500 rounded focus:ring-secondary-500 dark:bg-neutral-700"
                            />
                            <img
                              src={country.code === 'IL' ? '/flags/ps.svg' : `/flags/${country.code.toLowerCase()}.svg`}
                              alt={country.name}
                              class="w-4 h-3 object-cover"
                              onError={(e) => { e.currentTarget.src = '/flags/us.svg'; }}
                            />
                            <span class="text-text-800 dark:text-text-200">{country.name}</span>
                          </label>
                        )}
                      </For>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <Show when={hasActiveFilters()}>
                    <button
                      onClick={clearFilters}
                      class="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-700 text-text-800 dark:text-text-200 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors text-sm"
                    >
                      Clear All Filters
                    </button>
                  </Show>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </div>



      <div 
        ref={scrollContainer}
        class="flex-1 overflow-y-auto py-1" 
        style="touch-action: pan-y; -webkit-overflow-scrolling: touch;"
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <For each={filteredUsers()}>
          {(user) => (
            <UserListItem
              user={user}
              isSelected={props.selectedUser?.id === user.id}
              onClick={() => handleUserSelect(user)}
              isCurrentUser={props.currentUser?.id === user.id}
              isBlocked={blockedUsers().includes(user.id)}
              isBlockedBy={usersWhoBlockedMe().includes(user.id)}
              isScrolling={isScrolling()}
              hasMoved={hasMoved()}
              touchTarget={touchTarget()}
            />
          )}
        </For>
        </div>
      </aside>
    </>
  );
};

export default UserListSidebar;
