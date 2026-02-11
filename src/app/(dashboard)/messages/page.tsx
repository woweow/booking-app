"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageThread } from "@/components/messaging/message-thread";
import { MessageInput } from "@/components/messaging/message-input";
import {
  ConversationsList,
  type BookingThread,
} from "@/components/messaging/conversations-list";

const TERMINAL_STATUSES = ["DECLINED", "CANCELLED"];

function ClientMessages({ userId }: { userId: string }) {
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<BookingThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    searchParams.get("bookingId")
  );
  const [mobileShowThread, setMobileShowThread] = useState(
    !!searchParams.get("bookingId")
  );

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        const fetched: BookingThread[] = data.threads || [];
        setThreads(fetched);
        // Auto-select if only one thread and nothing selected
        if (!selectedBookingId && fetched.length === 1) {
          setSelectedBookingId(fetched[0].bookingId);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [selectedBookingId]);

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 10000);
    return () => clearInterval(interval);
  }, [fetchThreads]);

  function selectThread(bookingId: string) {
    setSelectedBookingId(bookingId);
    setMobileShowThread(true);
  }

  async function handleSend(content: string) {
    if (!selectedBookingId) return;

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, bookingId: selectedBookingId }),
    });

    if (!res.ok) {
      toast.error("Failed to send message. Please try again.");
      throw new Error("Send failed");
    }

    fetchThreads();
  }

  async function handleMarkUnread(bookingId: string) {
    try {
      const res = await fetch(`/api/messages/${bookingId}/unread`, {
        method: "PATCH",
      });
      if (res.ok) {
        fetchThreads();
      } else {
        toast.error("Failed to mark as unread.");
      }
    } catch {
      toast.error("Failed to mark as unread.");
    }
  }

  const selectedThread = threads.find(
    (t) => t.bookingId === selectedBookingId
  );
  const isTerminal =
    selectedThread && TERMINAL_STATUSES.includes(selectedThread.bookingStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-4 py-16">
        <MessageSquare className="size-10 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-lg font-medium">No messages yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Chat will be available once your booking is reviewed.
          </p>
        </div>
        <Button asChild>
          <Link href="/bookings/new">
            <Plus className="mr-1.5 size-4" />
            Create your first booking
          </Link>
        </Button>
      </Card>
    );
  }

  // Single thread — show it directly without list
  if (threads.length === 1) {
    const thread = threads[0];
    const singleTerminal = TERMINAL_STATUSES.includes(thread.bookingStatus);

    return (
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-medium">Chat with Jane</h2>
            <p className="text-xs text-muted-foreground">
              {thread.bookingDescription}
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/bookings/${thread.bookingId}`}>
              <ExternalLink className="mr-1.5 size-3.5" />
              View Booking
            </Link>
          </Button>
        </div>
        <MessageThread
          currentUserId={userId}
          threadEndpoint={`/api/messages/${thread.bookingId}`}
          pollInterval={5000}
          isClient
        />
        <MessageInput
          onSend={handleSend}
          placeholder="Message Jane..."
          disabled={singleTerminal}
        />
      </Card>
    );
  }

  // Multiple threads — two-panel / mobile layout (same structure as artist)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Desktop: two-panel */}
      <div className="hidden min-h-0 flex-1 gap-4 lg:grid lg:grid-cols-3">
        <Card className="overflow-y-auto">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">Your Bookings</h2>
            <p className="text-xs text-muted-foreground">
              {threads.reduce((acc, t) => acc + t.unreadCount, 0)} unread
            </p>
          </div>
          <ConversationsList
            threads={threads}
            selectedBookingId={selectedBookingId}
            currentUserId={userId}
            onSelect={selectThread}
            onMarkUnread={handleMarkUnread}
          />
        </Card>

        <Card className="col-span-2 flex flex-col overflow-hidden">
          {selectedThread ? (
            <>
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <h2 className="text-sm font-medium">Chat with Jane</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedThread.bookingDescription}
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/bookings/${selectedBookingId}`}>
                    <ExternalLink className="mr-1.5 size-3.5" />
                    View Booking
                  </Link>
                </Button>
              </div>
              <MessageThread
                currentUserId={userId}
                threadEndpoint={`/api/messages/${selectedBookingId}`}
                pollInterval={5000}
                isClient
              />
              <MessageInput
                onSend={handleSend}
                placeholder="Message Jane..."
                disabled={isTerminal}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <MessageSquare className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Select a booking to view messages
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Mobile: single panel */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        {!mobileShowThread || !selectedThread ? (
          <Card className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium">Your Bookings</h2>
              <p className="text-xs text-muted-foreground">
                {threads.reduce((acc, t) => acc + t.unreadCount, 0)} unread
              </p>
            </div>
            <ConversationsList
              threads={threads}
              selectedBookingId={selectedBookingId}
              currentUserId={userId}
              onSelect={selectThread}
              onMarkUnread={handleMarkUnread}
            />
          </Card>
        ) : (
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setMobileShowThread(false)}
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <div>
                    <h2 className="text-sm font-medium">Chat with Jane</h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedThread.bookingDescription}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/bookings/${selectedBookingId}`}>
                    <ExternalLink className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
            <MessageThread
              currentUserId={userId}
              threadEndpoint={`/api/messages/${selectedBookingId}`}
              pollInterval={5000}
              isClient
            />
            <MessageInput
              onSend={handleSend}
              placeholder="Message Jane..."
              disabled={isTerminal}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

function ArtistMessages({ userId }: { userId: string }) {
  const searchParams = useSearchParams();
  const [threads, setThreads] = useState<BookingThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    searchParams.get("bookingId")
  );
  const [mobileShowThread, setMobileShowThread] = useState(
    !!searchParams.get("bookingId")
  );

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
    const interval = setInterval(fetchThreads, 10000);
    return () => clearInterval(interval);
  }, [fetchThreads]);

  function selectThread(bookingId: string) {
    setSelectedBookingId(bookingId);
    setMobileShowThread(true);
  }

  async function handleSend(content: string) {
    if (!selectedBookingId) return;

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, bookingId: selectedBookingId }),
    });

    if (!res.ok) {
      toast.error("Failed to send message. Please try again.");
      throw new Error("Send failed");
    }

    fetchThreads();
  }

  async function handleMarkUnread(bookingId: string) {
    try {
      const res = await fetch(`/api/messages/${bookingId}/unread`, {
        method: "PATCH",
      });
      if (res.ok) {
        fetchThreads();
      } else {
        toast.error("Failed to mark as unread.");
      }
    } catch {
      toast.error("Failed to mark as unread.");
    }
  }

  const selectedThread = threads.find(
    (t) => t.bookingId === selectedBookingId
  );
  const isTerminal =
    selectedThread && TERMINAL_STATUSES.includes(selectedThread.bookingStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Desktop: two-panel */}
      <div className="hidden min-h-0 flex-1 gap-4 lg:grid lg:grid-cols-3">
        <Card className="overflow-y-auto">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">Conversations</h2>
            <p className="text-xs text-muted-foreground">
              {threads.reduce((acc, t) => acc + t.unreadCount, 0)} unread
            </p>
          </div>
          <ConversationsList
            threads={threads}
            selectedBookingId={selectedBookingId}
            currentUserId={userId}
            onSelect={selectThread}
            onMarkUnread={handleMarkUnread}
          />
        </Card>

        <Card className="col-span-2 flex flex-col overflow-hidden">
          {selectedThread ? (
            <>
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <h2 className="text-sm font-medium">
                    {selectedThread.clientName}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedThread.bookingDescription}
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/bookings/${selectedBookingId}`}>
                    <ExternalLink className="mr-1.5 size-3.5" />
                    View Booking
                  </Link>
                </Button>
              </div>
              <MessageThread
                currentUserId={userId}
                threadEndpoint={`/api/messages/${selectedBookingId}`}
                pollInterval={5000}
              />
              <MessageInput
                onSend={handleSend}
                placeholder={`Message ${selectedThread.clientName}...`}
                disabled={isTerminal}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <MessageSquare className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Select a conversation to view messages
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Mobile: single panel */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        {!mobileShowThread || !selectedThread ? (
          <Card className="min-h-0 flex-1 overflow-y-auto">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium">Conversations</h2>
              <p className="text-xs text-muted-foreground">
                {threads.reduce((acc, t) => acc + t.unreadCount, 0)} unread
              </p>
            </div>
            {threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12">
                <MessageSquare className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No conversations yet
                </p>
              </div>
            ) : (
              <ConversationsList
                threads={threads}
                selectedBookingId={selectedBookingId}
                currentUserId={userId}
                onSelect={selectThread}
                onMarkUnread={handleMarkUnread}
              />
            )}
          </Card>
        ) : (
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setMobileShowThread(false)}
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <div>
                    <h2 className="text-sm font-medium">
                      {selectedThread.clientName}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedThread.bookingDescription}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/bookings/${selectedBookingId}`}>
                    <ExternalLink className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
            <MessageThread
              currentUserId={userId}
              threadEndpoint={`/api/messages/${selectedBookingId}`}
              pollInterval={5000}
            />
            <MessageInput
              onSend={handleSend}
              placeholder={`Message ${selectedThread.clientName}...`}
              disabled={isTerminal}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

function MessagesContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  // consume searchParams to avoid SSR bailout warning
  searchParams.get("bookingId");

  if (!session?.user) return null;

  const isArtist = session.user.role === "ARTIST";
  const userId = session.user.id;

  return (
    <div className="flex h-[calc(100svh-8rem)] flex-col gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-light tracking-wide">Messages</h1>
        <p className="text-sm text-muted-foreground">
          {isArtist ? "Manage client conversations" : "Chat with Jane"}
        </p>
      </div>

      {isArtist ? (
        <ArtistMessages userId={userId} />
      ) : (
        <ClientMessages userId={userId} />
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
