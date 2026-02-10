"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowLeft } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ForgotPasswordSchema } from "@/lib/validations/auth";

type ForgotPasswordValues = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: ForgotPasswordValues) {
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.status === 429) {
        setError("Too many attempts. Please try again later.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  if (submitted) {
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-xl font-light text-muted-foreground">
          Check your email
        </h2>
        <p className="text-sm text-muted-foreground">
          If an account exists with that email, you&apos;ll receive a password
          reset link.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-center text-xl font-light text-muted-foreground">
        Reset your password
      </h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isSubmitting ? "Sending..." : "Send reset link"}
          </Button>

          <p className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline"
            >
              <ArrowLeft className="size-4" />
              Back to sign in
            </Link>
          </p>
        </form>
      </Form>
    </div>
  );
}
