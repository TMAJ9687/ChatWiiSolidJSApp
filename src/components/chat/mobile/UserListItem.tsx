import { Component, Show } from "solid-js";
import { FiSlash, FiUserX } from "solid-icons/fi";
import type { User } from "../../../types/user.types";
// import styles from "./UserListItem.module.css"; // Temporarily disabled for debugging

interface UserListItemProps {
  user: User;
  isSelected: boolean;
  isCurrentUser: boolean;
  isBlocked?: boolean;
  isBlockedBy?: boolean;
}

const UserListItem: Component<UserListItemProps> = (props) => {
  const getFlagSrc = (country: string) => {
    if (!country) return "/flags/us.svg";
    const code = country.toLowerCase();
    return code === "il" ? "/flags/ps.svg" : `/flags/${code}.svg`;
  };

  const getGenderColor = (gender: string) => {
    return gender === "male" ? "text-blue-500" : "text-pink-500";
  };

  return (
    <div class="px-1 py-0.5">
      <div
        class="w-full p-3 flex items-center gap-3 border bg-white dark:bg-neutral-800"
        style="touch-action: inherit;" // Completely neutral
      >
      <div class={`rounded-full p-0.5 ${props.user.gender === 'male' ? 'ring-2 ring-blue-500' : 'ring-2 ring-pink-500'}`}>
        <img
          src={props.user.avatar || `/avatars/standard/${props.user.gender}.png`}
          alt={props.user.nickname}
          class="w-10 h-10 rounded-full object-cover pointer-events-none"
          onError={(e) => {
            e.currentTarget.src = `/avatars/standard/male.png`;
          }}
        />
      </div>

      <div class="flex-1 text-left">
        <div class="flex items-center gap-2">
          <span class="font-medium text-text-1000 dark:text-text-0">
            {props.user.nickname}
          </span>
          
          {/* Admin Crown */}
          <Show when={props.user.role === "admin"}>
            <div class="flex items-center gap-1">
              <div class="relative">
                <svg class="w-4 h-4 text-yellow-500 drop-shadow-sm animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 6L9 2L5 6L2 6L5 10L12 8L19 10L22 6L19 6L15 2L12 6Z"/>
                  <path d="M5 10L12 8L19 10L22 14L19 18L12 16L5 18L2 14L5 10Z"/>
                </svg>
                <div class="absolute -inset-1 bg-yellow-400/20 rounded-full blur-sm"></div>
              </div>
              <span class="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">ADMIN</span>
            </div>
          </Show>

          {/* VIP Diamond Badge */}
          <Show when={props.user.role === "vip"}>
            <div class="flex items-center gap-1">
              <div class="relative">
                <svg class="w-4 h-4 text-purple-500 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 2L8 8L12 2L16 8L18 2L22 8L18 14L12 22L6 14L2 8L6 2Z"/>
                </svg>
                <div class="absolute -inset-1 bg-purple-400/30 rounded-full blur-sm animate-pulse"></div>
              </div>
              <span class="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">VIP</span>
            </div>
          </Show>

          {props.isCurrentUser && (
            <span class="text-xs text-text-400 dark:text-text-600">(You)</span>
          )}
        </div>

        <div class="flex items-center gap-2 mt-1">
          <img
            src={getFlagSrc(props.user.country)}
            alt={props.user.country}
            class="w-5 h-3 object-cover pointer-events-none"
            onError={(e) => {
              e.currentTarget.src = "/flags/us.svg";
            }}
          />
          <span class={`text-sm ${props.user.gender === 'male' ? 'text-blue-500' : 'text-pink-500'}`}>
            • {props.user.gender} • {props.user.age}
          </span>
        </div>
      </div>


      
      {/* Blocking indicators */}
      <Show when={props.isBlocked}>
        <div class="flex flex-col items-center">
          <FiSlash class="w-4 h-4 text-red-600" title="You blocked this user" />
          <span class="text-xs text-red-600">Blocked</span>
        </div>
      </Show>
      
      <Show when={props.isBlockedBy && !props.isBlocked}>
        <div class="flex flex-col items-center">
          <FiUserX class="w-4 h-4 text-yellow-600" title="This user blocked you" />
          <span class="text-xs text-yellow-600">Blocked you</span>
        </div>
      </Show>
      </div>
    </div>
  );
};

export default UserListItem;
