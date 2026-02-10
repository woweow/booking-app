import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { UserRole } from "@/generated/prisma/enums";
import {
  checkAccountLockout,
  recordFailedLoginAttempt,
  resetFailedLoginAttempts,
} from "@/lib/account-lockout";
import { logLoginSuccess, logLoginFailure } from "@/lib/audit";

// Ensure extended types are loaded
import "@/lib/types/next-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login?error=invalid",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        // Check account lockout
        const lockoutStatus = await checkAccountLockout(email);
        if (lockoutStatus.isLocked) {
          // Generic error to prevent user enumeration
          throw new Error("Invalid email or password");
        }

        // Apply progressive delay if needed
        if (lockoutStatus.requiresDelay > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, lockoutStatus.requiresDelay)
          );
        }

        // Look up user
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          await recordFailedLoginAttempt(email);
          await logLoginFailure(email, "User not found");
          return null;
        }

        // Verify password
        const isPasswordValid = await compare(password, user.passwordHash);
        if (!isPasswordValid) {
          await recordFailedLoginAttempt(email);
          await logLoginFailure(email, "Invalid password");
          return null;
        }

        // Success: reset failed attempts and log
        await resetFailedLoginAttempts(email);
        await logLoginSuccess(user.id, user.email);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: UserRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
});
