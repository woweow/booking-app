"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MessageThread } from "@/components/messaging/message-thread";
import { MessageInput } from "@/components/messaging/message-input";
import { ConversationsList } from "@/components/messaging/conversations-list";

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

function ClientMessages({ userId }: { userId: string }) {
  const [hasBookings, setHasBookings] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkBookings() {
      try {
        const res = await fetch("/api/bookings");
        if (res.ok) {
          const data = await res.json();
          setHasBookings(Array.isArray(data.bookings) && data.bookings.length > 0);
        } else {
          setHasBookings(false);
        }
      } catch {
        setHasBookings(false);
      }
    }
    checkBookings();
  }, []);

  async function handleSend(content: string) {
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      toast.error("Failed to send message. Please try again.");
      throw new Error("Send failed");
    }
  }

  if (hasBookings === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasBookings) {
    return (
      <Card className="flex flex-col items-center justify-center gap-4 py-16">
        <MessageSquare className="size-10 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-lg font-medium">No messages yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Messages will be available once you submit a booking request.
          </p>
        </div>
        <Button asChild>
          <Link href="/bookings/new">
            <CalendarDays className="mr-2 size-4" />
            Create a Booking Request
          </Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex h-[calc(100svh-16rem)] flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">Chat with Jane</h2>
      </div>

      <MessageThread
        currentUserId={userId}
        threadEndpoint="/api/messages/thread"
        pollInterval={5000}
      />

      <MessageInput onSend={handleSend} placeholder="Message Jane..." />
    </Card>
  );
}

function ArtistMessages({ userId }: { userId: string }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(false);

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

  function selectConversation(participantId: string) {
    setSelectedId(participantId);
    setMobileShowThread(true);
  }

  async function handleSend(content: string) {
    if (!selectedId) return;

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, receiverId: selectedId }),
    });

    if (!res.ok) {
      toast.error("Failed to send message. Please try again.");
      throw new Error("Send failed");
    }

    fetchThreads();
  }

  const selectedThread = threads.find((t) => t.participant.id === selectedId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100svh-16rem)]">
      {/* Desktop: two-panel */}
      <div className="hidden h-full gap-4 lg:grid lg:grid-cols-3">
        {/* Conversations list */}
        <Card className="overflow-y-auto">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">Conversations</h2>
            <p className="text-xs text-muted-foreground">
              {threads.reduce((acc, t) => acc + t.unreadCount, 0)} unread
            </p>
          </div>
          <ConversationsList
            threads={threads}
            selectedId={selectedId}
            currentUserId={userId}
            onSelect={selectConversation}
          />
        </Card>

        {/* Thread view */}
        <Card className="col-span-2 flex flex-col overflow-hidden">
          {selectedThread ? (
            <>
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-medium">
                  {selectedThread.participant.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedThread.participant.email}
                </p>
              </div>
              <MessageThread
                currentUserId={userId}
                threadEndpoint={`/api/messages/${selectedId}`}
                pollInterval={5000}
              />
              <MessageInput
                onSend={handleSend}
                placeholder={`Message ${selectedThread.participant.name}...`}
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
      <div className="h-full lg:hidden">
        {!mobileShowThread || !selectedThread ? (
          <Card className="h-full overflow-y-auto">
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
                selectedId={selectedId}
                currentUserId={userId}
                onSelect={selectConversation}
              />
            )}
          </Card>
        ) : (
          <Card className="flex h-full flex-col overflow-hidden">
            <div className="border-b border-border px-4 py-3">
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
                    {selectedThread.participant.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedThread.participant.email}
                  </p>
                </div>
              </div>
            </div>
            <MessageThread
              currentUserId={userId}
              threadEndpoint={`/api/messages/${selectedId}`}
              pollInterval={5000}
            />
            <MessageInput
              onSend={handleSend}
              placeholder={`Message ${selectedThread.participant.name}...`}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const isArtist = session.user.role === "ARTIST";
  const userId = session.user.id;

  return (
    <div className="space-y-4">
      <div>
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
