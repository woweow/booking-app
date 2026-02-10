import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In | Studio Saturn",
  description: "Sign in to your Studio Saturn account",
};

export default function LoginPage() {
  return (
    <div>
      <h2 className="mb-6 text-center text-xl font-light text-muted-foreground">
        Sign in to your account
      </h2>
      <LoginForm />
    </div>
  );
}
