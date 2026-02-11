"use client";

import { formatDistanceToNow } from "date-fns";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";

type Thread = {
  participant: {
    id: string;
    name: string;
    email: string;
  };
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
};

type ConversationsListProps = {
  threads: Thread[];
  selectedId?: string | null;
  currentUserId: string;
  onSelect: (participantId: string) => void;
};

export function ConversationsList({
  threads,
  selectedId,
  currentUserId,
  onSelect,
}: ConversationsListProps) {
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <MessageSquare className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {threads.map((thread) => {
        const isSelected = selectedId === thread.participant.id;
        const isArtistSent =
          thread.lastMessage?.senderId === currentUserId;
        const preview = thread.lastMessage
          ? `${isArtistSent ? "You: " : ""}${thread.lastMessage.content}`
          : "No messages yet";

        return (
          <button
            key={thread.participant.id}
            onClick={() => onSelect(thread.participant.id)}
            className={cn(
              "flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-secondary/50",
              isSelected && "bg-secondary"
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">
                  {thread.participant.name}
                </p>
                {thread.lastMessage && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(
                      new Date(thread.lastMessage.createdAt),
                      { addSuffix: true }
                    )}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {preview}
              </p>
            </div>
            {thread.unreadCount > 0 && (
              <Badge className="shrink-0 bg-destructive text-destructive-foreground">
                {thread.unreadCount}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
