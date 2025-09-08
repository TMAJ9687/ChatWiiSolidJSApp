import { Component, Show, createSignal } from "solid-js";
import { FiCornerUpLeft } from "solid-icons/fi";
import type { Message } from "../../../types/message.types";
import type { TranslationResponse } from "../../../services/supabase";
import BlurredImageMessage from "./BlurredImageMessage";
import ImageModal from "./ImageModal";
import ReactionPicker from "./ReactionPicker";
import ReactionDisplay from "./ReactionDisplay";
import ReplyDisplay from "./ReplyDisplay";
import TranslationButton from "./TranslationButton";
import TranslationDisplay from "./TranslationDisplay";
import VoicePlayer from "./VoicePlayer";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  currentUserId?: string;
  userNickname?: string;
  currentUserRole?: string;
  onReplyClick?: (message: Message) => void;
}

const MessageBubble: Component<MessageBubbleProps> = (props) => {
  const [showImageModal, setShowImageModal] = createSignal(false);
  const [showActions, setShowActions] = createSignal(false);

  // VIP/Admin exclusive visibility for read receipts
  const canSeeReadReceipts = () => {
    const userRole = props.currentUserRole || "standard";
    return ["vip", "admin"].includes(userRole);
  };

  // VIP/Admin exclusive access to reply and reactions
  const canUseReplyAndReactions = () => {
    const userRole = props.currentUserRole || "standard";
    return ["vip", "admin"].includes(userRole);
  };
  const [translation, setTranslation] =
    createSignal<TranslationResponse | null>(null);
  const [showTranslation, setShowTranslation] = createSignal(false);

  const handleImageClick = () => {
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
  };

  const handleReplyClick = () => {
    if (props.onReplyClick) {
      props.onReplyClick(props.message);
    }
  };

  const handleTranslationToggle = (
    translationResult: TranslationResponse | null
  ) => {
    setTranslation(translationResult);
    setShowTranslation(!!translationResult);
  };

  return (
    <div
      class={`flex gap-2 mb-3 w-full max-w-full min-w-0 ${
        props.isOwn ? "justify-end" : "justify-start"
      }`}
    >
      <div
        class={`max-w-[85vw] sm:max-w-[70%] min-w-0 shrink overflow-hidden ${
          props.isOwn ? "order-1" : ""
        }`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Reply Context */}
        <ReplyDisplay message={props.message} />

        {/* Message Content */}
        <div class="relative">
          <div
            class={`${
              props.message.type === "image" ? "p-1" : "px-4 py-2"
            } rounded-2xl min-w-0 overflow-hidden ${
              props.isOwn
                ? "bg-secondary-500 text-white rounded-br-sm"
                : "bg-white dark:bg-neutral-800 text-text-1000 dark:text-text-0 rounded-bl-sm border border-neutral-200 dark:border-neutral-700"
            }`}
          >
            <Show when={props.message.type === "text"}>
              <p
                class="text-sm break-words"
                style="word-break: break-word; overflow-wrap: anywhere; max-width: 100%;"
              >
                {props.message.content}
              </p>
            </Show>

            <Show
              when={props.message.type === "image" && props.message.imageUrl}
            >
              <div class="max-w-full overflow-hidden">
                <BlurredImageMessage
                  imageUrl={props.message.imageUrl!}
                  onImageClick={handleImageClick}
                />
              </div>
            </Show>

            <Show
              when={props.message.type === "voice" && props.message.voiceData}
            >
              <VoicePlayer
                voiceData={{
                  url: props.message.content, // voice URL is stored in content
                  duration: props.message.voiceData!.duration,
                  size: 0, // We don't store file size in message, so use 0
                  timestamp: props.message.createdAt,
                }}
              />
            </Show>
          </div>

          {/* Action Buttons */}
          <Show when={showActions() && props.currentUserId}>
            <div
              class={`absolute top-0 ${
                props.isOwn
                  ? "left-0 -translate-x-full"
                  : "right-0 translate-x-full"
              } flex items-center gap-1 px-2`}
            >
              {/* Reply Button - VIP/Admin only */}
              <Show when={canUseReplyAndReactions()}>
                <button
                  onClick={handleReplyClick}
                  class="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 transition-all duration-200 hover:scale-105"
                  title="Reply to message (VIP feature)"
                >
                  <FiCornerUpLeft class="w-4 h-4" />
                </button>
              </Show>

              {/* Translation Button (only for text messages) */}
              <Show
                when={props.message.type === "text" && props.message.content}
              >
                <TranslationButton
                  text={props.message.content}
                  onTranslationToggle={handleTranslationToggle}
                />
              </Show>

              {/* Reaction Picker - VIP/Admin only */}
              <Show when={canUseReplyAndReactions()}>
                <ReactionPicker
                  messageId={props.message.id}
                  userNickname={props.userNickname}
                />
              </Show>
            </div>
          </Show>
        </div>

        {/* Translation Display */}
        <Show when={props.message.type === "text" && props.message.content}>
          <TranslationDisplay
            translation={translation()}
            originalText={props.message.content}
            isVisible={showTranslation()}
          />
        </Show>

        {/* Reactions Display - VIP/Admin only */}
        <Show when={props.currentUserId && canUseReplyAndReactions()}>
          <ReactionDisplay
            messageId={props.message.id}
            currentUserId={props.currentUserId!}
            userNickname={props.userNickname}
          />
        </Show>

        <div
          class={`flex items-center gap-2 mt-1 ${
            props.isOwn ? "justify-end" : ""
          }`}
        >
          <span class="text-xs text-text-400 dark:text-text-600">
            {props.message.timestamp}
          </span>
          {props.isOwn && canSeeReadReceipts() && (
            <span class="text-xs text-text-400 dark:text-text-600">
              {props.message.status === "sent" && "✓"}
              {props.message.status === "delivered" && "✓✓"}
              {props.message.status === "read" && (
                <span class="text-secondary-500">✓✓</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Image Modal */}
      <Show when={props.message.type === "image" && props.message.imageUrl}>
        <ImageModal
          isOpen={showImageModal()}
          imageUrl={props.message.imageUrl!}
          onClose={closeImageModal}
        />
      </Show>
    </div>
  );
};

export default MessageBubble;
