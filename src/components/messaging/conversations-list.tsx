"use client";

import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ImageIcon } from "lucide-react";

export type BookingThread = {
  bookingId: string;
  bookingDescription: string;
  bookingStatus: string;
  bookingType: string;
  clientName: string;
  clientId: string;
  photoUrl: string | null;
  chatEnabled: boolean;
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
};

type ConversationsListProps = {
  threads: BookingThread[];
  selectedBookingId?: string | null;
  currentUserId: string;
  onSelect: (bookingId: string) => void;
};

export function ConversationsList({
  threads,
  selectedBookingId,
  currentUserId,
  onSelect,
}: ConversationsListProps) {
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <ImageIcon className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {threads.map((thread) => {
        const isSelected = selectedBookingId === thread.bookingId;
        const isMeSent = thread.lastMessage?.senderId === currentUserId;
        const preview = thread.lastMessage
          ? `${isMeSent ? "You: " : ""}${thread.lastMessage.content}`
          : "No messages yet";

        return (
          <button
            key={thread.bookingId}
            onClick={() => onSelect(thread.bookingId)}
            className={cn(
              "flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-secondary/50",
              isSelected && "bg-secondary"
            )}
          >
            {/* Photo thumbnail */}
            <div className="size-10 shrink-0 overflow-hidden rounded-full bg-muted">
              {thread.photoUrl ? (
                <Image
                  src={thread.photoUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <ImageIcon className="size-4 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">
                  {thread.clientName}
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
              <p className="truncate text-xs text-muted-foreground">
                {thread.bookingDescription}
              </p>
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
