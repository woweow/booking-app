"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle, CreditCard, Loader2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PaymentRequestData = {
  id: string;
  amountCents: number;
  note?: string | null;
  status: "PENDING" | "PAID" | "CANCELLED";
  paidAt?: string | null;
};

type PaymentRequestCardProps = {
  paymentRequest: PaymentRequestData;
  isClient: boolean;
};

export function PaymentRequestCard({
  paymentRequest,
  isClient,
}: PaymentRequestCardProps) {
  const [loading, setLoading] = useState(false);
  const amount = (paymentRequest.amountCents / 100).toFixed(2);

  async function handlePay() {
    setLoading(true);
    try {
      const res = await fetch(`/api/payment-requests/${paymentRequest.id}/pay`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to initiate payment");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (paymentRequest.status === "CANCELLED") {
    return (
      <div className="mx-2 my-1 rounded-xl border border-muted bg-muted/30 p-4 opacity-60">
        <div className="flex items-center gap-2">
          <XCircle className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground line-through">
            Payment request: ${amount}
          </span>
          <Badge variant="secondary" className="text-xs">
            Cancelled
          </Badge>
        </div>
        {paymentRequest.note && (
          <p className="mt-1 text-xs text-muted-foreground italic line-through">
            {paymentRequest.note}
          </p>
        )}
      </div>
    );
  }

  if (paymentRequest.status === "PAID") {
    return (
      <div className="mx-2 my-1 rounded-xl border border-[hsl(82_8%_48%)]/30 bg-[hsl(82_8%_48%)]/5 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="size-4 text-[hsl(82_8%_48%)]" />
          <span className="text-sm font-medium">${amount}</span>
          <Badge
            variant="outline"
            className="border-[hsl(82_8%_48%)]/30 text-[hsl(82_8%_48%)] text-xs"
          >
            Paid
          </Badge>
        </div>
        {paymentRequest.note && (
          <p className="mt-1 text-xs text-muted-foreground italic">
            {paymentRequest.note}
          </p>
        )}
        {paymentRequest.paidAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            Paid on {format(new Date(paymentRequest.paidAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        )}
      </div>
    );
  }

  // PENDING
  return (
    <div className="mx-2 my-1 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <CreditCard className="size-4 text-primary" />
        <span className="text-sm font-medium">${amount}</span>
        <Badge variant="outline" className="text-xs">
          Pending
        </Badge>
      </div>
      {paymentRequest.note && (
        <p className="mt-2 text-xs text-muted-foreground italic">
          {paymentRequest.note}
        </p>
      )}
      {isClient && (
        <Button
          onClick={handlePay}
          disabled={loading}
          size="sm"
          className={cn("mt-3 w-full gap-2 sm:w-auto")}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CreditCard className="size-4" />
          )}
          {loading ? "Redirecting..." : "Pay Now"}
        </Button>
      )}
    </div>
  );
}
