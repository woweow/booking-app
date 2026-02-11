"use client";

import { format } from "date-fns";
import {
  CheckCircle,
  AlertCircle,
  CreditCard,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PaymentButton } from "./payment-button";

export function PaymentRequired({
  bookingId,
  depositAmount,
  totalAmount,
}: {
  bookingId: string;
  depositAmount: number;
  totalAmount?: number | null;
}) {
  return (
    <Card className="border-accent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-medium">
          <CreditCard className="size-5" />
          Payment Required
        </CardTitle>
        <CardDescription>
          A deposit is required to confirm your appointment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-3xl font-light">
            ${(depositAmount / 100).toFixed(2)}
          </p>
          <PaymentButton bookingId={bookingId} depositAmount={depositAmount} />
        </div>

        {totalAmount && (
          <>
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit</span>
                <span>${(depositAmount / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span>${(totalAmount / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Remaining (due at appointment)</span>
                <span>${((totalAmount - depositAmount) / 100).toFixed(2)}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function PaymentSuccess() {
  return (
    <Card className="border-[hsl(82_8%_48%)]/30">
      <CardContent className="flex items-center gap-3 py-4">
        <CheckCircle className="size-6 text-[hsl(82_8%_48%)]" />
        <div>
          <p className="font-medium text-[hsl(82_8%_48%)]">
            Payment Successful
          </p>
          <p className="text-sm text-muted-foreground">
            Your deposit has been received. Your appointment is now confirmed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function PaymentCancelled({
  bookingId,
  depositAmount,
}: {
  bookingId: string;
  depositAmount: number;
}) {
  return (
    <Card className="border-accent">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="size-6 text-accent" />
          <div>
            <p className="font-medium">Payment Cancelled</p>
            <p className="text-sm text-muted-foreground">
              Your payment was cancelled. You can try again when you&apos;re ready.
            </p>
          </div>
        </div>
        <PaymentButton bookingId={bookingId} depositAmount={depositAmount} />
      </CardContent>
    </Card>
  );
}

export function DepositPaid({ paidAt }: { paidAt: string }) {
  return (
    <Card className="border-[hsl(82_8%_48%)]/30">
      <CardContent className="flex items-center gap-3 py-4">
        <CheckCircle className="size-5 text-[hsl(82_8%_48%)]" />
        <div>
          <p className="font-medium text-[hsl(82_8%_48%)]">Deposit Paid</p>
          <p className="text-sm text-muted-foreground">
            Paid on {format(new Date(paidAt), "MMMM d, yyyy")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
