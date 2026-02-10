import { prisma } from "@/lib/db";
import { logAccountLocked } from "@/lib/audit";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const RESET_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const PROGRESSIVE_DELAY_BASE_MS = 1000; // 1 second

type LockoutStatus = {
  isLocked: boolean;
  lockedUntil?: Date;
  remainingMinutes?: number;
  failedAttempts: number;
  requiresDelay: number;
};

export function calculateProgressiveDelay(attempts: number): number {
  if (attempts <= 1) return 0;
  return PROGRESSIVE_DELAY_BASE_MS * Math.pow(2, attempts - 2);
}

export async function checkAccountLockout(email: string): Promise<LockoutStatus> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      failedLoginAttempts: true,
      lastFailedLoginAt: true,
      lockedUntil: true,
    },
  });

  if (!user) {
    return { isLocked: false, failedAttempts: 0, requiresDelay: 0 };
  }

  const now = Date.now();

  // Account currently locked
  if (user.lockedUntil && user.lockedUntil.getTime() > now) {
    const remainingMs = user.lockedUntil.getTime() - now;
    return {
      isLocked: true,
      lockedUntil: user.lockedUntil,
      remainingMinutes: Math.ceil(remainingMs / 60000),
      failedAttempts: user.failedLoginAttempts,
      requiresDelay: 0,
    };
  }

  // Lockout expired - auto-unlock
  if (user.lockedUntil && user.lockedUntil.getTime() <= now) {
    await resetFailedLoginAttempts(email);
    return { isLocked: false, failedAttempts: 0, requiresDelay: 0 };
  }

  // Check if counter should reset (15 minute window)
  if (
    user.lastFailedLoginAt &&
    now - user.lastFailedLoginAt.getTime() > RESET_WINDOW_MS
  ) {
    await resetFailedLoginAttempts(email);
    return { isLocked: false, failedAttempts: 0, requiresDelay: 0 };
  }

  return {
    isLocked: false,
    failedAttempts: user.failedLoginAttempts,
    requiresDelay: calculateProgressiveDelay(user.failedLoginAttempts),
  };
}

export async function recordFailedLoginAttempt(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      failedLoginAttempts: true,
      lastFailedLoginAt: true,
    },
  });

  if (!user) return;

  const now = Date.now();
  let newFailedAttempts = user.failedLoginAttempts + 1;

  // Reset counter if 15 minutes have passed
  if (
    user.lastFailedLoginAt &&
    now - user.lastFailedLoginAt.getTime() > RESET_WINDOW_MS
  ) {
    newFailedAttempts = 1;
  }

  const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = shouldLock
    ? new Date(now + LOCKOUT_DURATION_MS)
    : null;

  await prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      failedLoginAttempts: newFailedAttempts,
      lastFailedLoginAt: new Date(now),
      lockedUntil,
    },
  });

  if (shouldLock && lockedUntil) {
    await logAccountLocked(normalizedEmail, lockedUntil);
  }
}

export async function resetFailedLoginAttempts(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  await prisma.user.update({
    where: { email: normalizedEmail },
    data: {
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
      lockedUntil: null,
    },
  });
}
