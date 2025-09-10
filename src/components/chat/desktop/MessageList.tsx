import { Component, For, createEffect, onMount } from "solid-js";
import MessageBubble from "./MessageBubble";
import type { Message } from "../../../types/message.types";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  userNickname?: string;
  currentUserRole?: string;
  onReplyClick?: (message: Message) => void;
}

const MessageList: Component<MessageListProps> = (props) => {
  let scrollContainer: HTMLDivElement | undefined;

  // Auto scroll to bottom on new messages
  createEffect(() => {
    if (props.messages.length && scrollContainer) {
      setTimeout(() => {
        scrollContainer?.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  });

  return (
    <div ref={scrollContainer} class="flex-1 overflow-y-auto p-4 premium-scrollbar">
      {props.messages.length === 0 ? (
        <div class="flex items-center justify-center h-full text-text-400 dark:text-text-600">
          No messages yet. Start the conversation!
        </div>
      ) : (
        <For each={props.messages}>
          {(message, index) => (
            <MessageBubble
              message={message}
              isOwn={message.senderId === props.currentUserId}
              showAvatar={
                index() === 0 ||
                props.messages[index() - 1]?.senderId !== message.senderId
              }
              currentUserId={props.currentUserId}
              userNickname={props.userNickname}
              currentUserRole={props.currentUserRole}
              onReplyClick={props.onReplyClick}
            />
          )}
        </For>
      )}
    </div>
  );
};

export default MessageList;
