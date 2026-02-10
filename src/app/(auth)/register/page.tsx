import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create Account | Studio Saturn",
  description: "Create your Studio Saturn account to book a tattoo appointment",
};

export default function RegisterPage() {
  return (
    <div>
      <h2 className="mb-6 text-center text-xl font-light text-muted-foreground">
        Create your account
      </h2>
      <RegisterForm />
    </div>
  );
}
