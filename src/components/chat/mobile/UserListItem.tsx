import { Component, Show } from "solid-js";
import { FiSlash, FiUserX } from "solid-icons/fi";
import type { User } from "../../../types/user.types";

interface UserListItemProps {
  user: User;
  isSelected: boolean;
  onClick: () => void;
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

  const handleClick = () => {
    if (!props.isCurrentUser) {
      props.onClick();
    }
  };

  return (
    <div class="px-1 py-0.5">
      <div
        onMouseDown={handleClick}
        onClick={handleClick}
        onTouchStart={handleClick}
        class={`w-full p-3 flex items-center gap-3 rounded-xl border transition-all duration-200 relative
                ${props.user.role === "admin" 
                  ? props.isSelected
                    ? "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-300 dark:border-yellow-600 shadow-lg shadow-yellow-200/50 dark:shadow-yellow-900/30"
                    : "bg-gradient-to-r from-yellow-25 to-amber-25 dark:from-yellow-900/10 dark:to-amber-900/10 border-yellow-200 dark:border-yellow-700 hover:border-yellow-300 dark:hover:border-yellow-600 hover:shadow-md hover:shadow-yellow-200/30"
                  : props.user.role === "vip"
                  ? props.isSelected
                    ? "bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-300 dark:border-purple-600 shadow-lg shadow-purple-200/50 dark:shadow-purple-900/30"
                    : "bg-gradient-to-r from-purple-25 to-pink-25 dark:from-purple-900/10 dark:to-pink-900/10 border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md hover:shadow-purple-200/30"
                  : props.isSelected 
                    ? "bg-secondary-50 dark:bg-secondary-900/20 border-secondary-200 dark:border-secondary-700 shadow-sm" 
                    : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 hover:shadow-sm"
                }
                ${
                  props.isCurrentUser
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:scale-[1.02]"
                }
                ${props.isBlocked ? "opacity-60 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800" : ""}
                ${props.isBlockedBy ? "opacity-60 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800" : ""}`}
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
