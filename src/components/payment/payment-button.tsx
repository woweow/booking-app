"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function PaymentButton({
  bookingId,
  depositAmount,
}: {
  bookingId: string;
  depositAmount: number;
}) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to create payment session");
        return;
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        toast.error("Payment service unavailable");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handlePay} disabled={loading} className="gap-2">
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CreditCard className="size-4" />
      )}
      {loading ? "Processing..." : `Pay Deposit — $${(depositAmount / 100).toFixed(2)}`}
    </Button>
  );
}
