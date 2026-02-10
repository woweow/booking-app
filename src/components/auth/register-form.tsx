"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { RegisterSchema, checkPasswordStrength } from "@/lib/validations/auth";

type RegisterValues = z.infer<typeof RegisterSchema>;

function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null;

  const { score, feedback } = checkPasswordStrength(password);
  const colors = [
    "bg-destructive",
    "bg-destructive",
    "bg-yellow-500",
    "bg-accent",
    "bg-[hsl(82_8%_48%)]",
  ];
  const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < score ? colors[score] : "bg-secondary"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {labels[score]}
        {feedback !== labels[score] && ` — ${feedback}`}
      </p>
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const watchPassword = form.watch("password");

  async function onSubmit(values: RegisterValues) {
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError("Too many attempts. Please try again later.");
          return;
        }
        setError(data.error || "Registration failed. Please try again.");
        return;
      }

      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        toast.success("Account created! Please sign in.");
        router.push("/login");
        return;
      }

      toast.success(`Welcome, ${values.name}!`);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your name"
                  autoComplete="name"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Phone{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  autoComplete="tel"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <PasswordStrengthIndicator password={watchPassword} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  );
}
