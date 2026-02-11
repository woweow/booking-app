"use client";

import { useState, useRef } from "react";
import { SendHorizontal, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type MessageInputProps = {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
};

export function MessageInput({
  onSend,
  disabled,
  placeholder = "Type a message...",
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await onSend(trimmed);
      setValue("");
      textareaRef.current?.focus();
    } catch {
      // Error handled by parent via toast
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isDisabled = disabled || sending;

  return (
    <div className="flex items-end gap-2 border-t border-border p-4">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isDisabled}
        rows={1}
        className="min-h-[40px] max-h-32 resize-none"
      />
      <Button
        size="icon"
        onClick={handleSend}
        disabled={isDisabled || !value.trim()}
        className="shrink-0"
      >
        {sending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <SendHorizontal className="size-4" />
        )}
      </Button>
    </div>
  );
}
