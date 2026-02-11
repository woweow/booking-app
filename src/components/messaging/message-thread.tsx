"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageSquare } from "lucide-react";

import { cn } from "@/lib/utils";
import { PaymentRequestCard } from "@/components/messaging/payment-request-card";

type PaymentRequestData = {
  id: string;
  amountCents: number;
  note?: string | null;
  status: "PENDING" | "PAID" | "CANCELLED";
  paidAt?: string | null;
};

type Message = {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  type?: "TEXT" | "PAYMENT_REQUEST";
  sender?: { name: string };
  paymentRequest?: PaymentRequestData | null;
};

type MessageThreadProps = {
  currentUserId: string;
  isClient?: boolean;
  messages?: Message[];
  threadEndpoint?: string;
  pollInterval?: number;
};

export function MessageThread({
  currentUserId,
  isClient = false,
  messages: controlledMessages,
  threadEndpoint,
  pollInterval = 5000,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(controlledMessages || []);
  const [loading, setLoading] = useState(!controlledMessages);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isControlled = controlledMessages !== undefined;

  const fetchMessages = useCallback(async () => {
    if (!threadEndpoint) return;
    try {
      const res = await fetch(threadEndpoint);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [threadEndpoint]);

  useEffect(() => {
    if (isControlled) {
      setMessages(controlledMessages);
      return;
    }

    fetchMessages();

    const interval = setInterval(fetchMessages, pollInterval);
    return () => clearInterval(interval);
  }, [isControlled, controlledMessages, fetchMessages, pollInterval]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading messages...
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <MessageSquare className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No messages yet. Start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.map((msg) => {
        const isSent = msg.senderId === currentUserId;

        // Payment request messages render as full-width cards
        if (msg.type === "PAYMENT_REQUEST" && msg.paymentRequest) {
          return (
            <div key={msg.id} className="flex justify-center">
              <div className="w-full max-w-md">
                <PaymentRequestCard
                  paymentRequest={msg.paymentRequest}
                  isClient={isClient}
                />
                <p className="mt-1 text-center text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(msg.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          );
        }

        return (
          <div
            key={msg.id}
            className={cn("flex", isSent ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm",
                isSent
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {!isSent && msg.sender && (
                <p className="mb-0.5 text-xs font-medium opacity-70">
                  {msg.sender.name}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p
                className={cn(
                  "mt-1 text-xs",
                  isSent ? "text-primary-foreground/60" : "text-muted-foreground"
                )}
              >
                {formatDistanceToNow(new Date(msg.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
