import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

export const AuditAction = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGOUT: "LOGOUT",
  ACCOUNT_CREATED: "ACCOUNT_CREATED",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  ACCOUNT_UNLOCKED: "ACCOUNT_UNLOCKED",
  ACCOUNT_UPDATED: "ACCOUNT_UPDATED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED: "PASSWORD_RESET_COMPLETED",
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_UPDATED: "BOOKING_UPDATED",
  BOOKING_APPROVED: "BOOKING_APPROVED",
  BOOKING_DECLINED: "BOOKING_DECLINED",
  BOOKING_CANCELLED: "BOOKING_CANCELLED",
  BOOKING_SCHEDULED: "BOOKING_SCHEDULED",
  BOOKING_VIEWED: "BOOKING_VIEWED",
  CONSENT_SUBMITTED: "CONSENT_SUBMITTED",
  CONSENT_VIEWED: "CONSENT_VIEWED",
  CONSENT_DOWNLOADED: "CONSENT_DOWNLOADED",
  PAYMENT_INITIATED: "PAYMENT_INITIATED",
  PAYMENT_COMPLETED: "PAYMENT_COMPLETED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  PAYMENT_REFUNDED: "PAYMENT_REFUNDED",
  FLASH_PIECE_CREATED: "FLASH_PIECE_CREATED",
  FLASH_PIECE_UPDATED: "FLASH_PIECE_UPDATED",
  FLASH_PIECE_DELETED: "FLASH_PIECE_DELETED",
  BOOK_PUBLISHED: "BOOK_PUBLISHED",
  BOOK_UNPUBLISHED: "BOOK_UNPUBLISHED",
} as const;

export const AuditResult = {
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE",
  ERROR: "ERROR",
} as const;

export const ResourceType = {
  USER: "User",
  BOOKING: "Booking",
  CONSENT_FORM: "ConsentForm",
  PAYMENT: "Payment",
  FLASH_PIECE: "FlashPiece",
  BOOK: "Book",
} as const;

type AuditLogParams = {
  action: string;
  userId?: string | null;
  userEmail?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  result: string;
  details?: Record<string, unknown> | null;
  request?: NextRequest | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const ipAddress =
      params.request?.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      params.request?.headers.get("x-real-ip") ||
      params.ipAddress ||
      "unknown";

    const userAgent =
      params.request?.headers.get("user-agent") || params.userAgent || "unknown";

    const detailsJson = params.details ? JSON.stringify(params.details) : null;

    await prisma.auditLog.create({
      data: {
        action: params.action,
        userId: params.userId || null,
        userEmail: params.userEmail || null,
        resourceType: params.resourceType || null,
        resourceId: params.resourceId || null,
        result: params.result,
        ipAddress,
        userAgent,
        details: detailsJson,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

export async function logLoginSuccess(
  userId: string,
  userEmail: string,
  request?: NextRequest
): Promise<void> {
  await createAuditLog({
    action: AuditAction.LOGIN_SUCCESS,
    userId,
    userEmail,
    result: AuditResult.SUCCESS,
    request,
  });
}

export async function logLoginFailure(
  email: string,
  reason: string,
  request?: NextRequest
): Promise<void> {
  await createAuditLog({
    action: AuditAction.LOGIN_FAILED,
    userId: null,
    userEmail: email,
    result: AuditResult.FAILURE,
    details: { reason },
    request,
  });
}

export async function logAccountCreated(
  userId: string,
  userEmail: string,
  request?: NextRequest
): Promise<void> {
  await createAuditLog({
    action: AuditAction.ACCOUNT_CREATED,
    userId,
    userEmail,
    resourceType: ResourceType.USER,
    resourceId: userId,
    result: AuditResult.SUCCESS,
    request,
  });
}

export async function logAccountLocked(
  email: string,
  lockedUntil: Date,
  request?: NextRequest
): Promise<void> {
  await createAuditLog({
    action: AuditAction.ACCOUNT_LOCKED,
    userEmail: email,
    result: AuditResult.SUCCESS,
    details: { lockedUntil: lockedUntil.toISOString() },
    request,
  });
}

export async function logPasswordChanged(
  userId: string,
  userEmail: string,
  request?: NextRequest
): Promise<void> {
  await createAuditLog({
    action: AuditAction.PASSWORD_CHANGED,
    userId,
    userEmail,
    resourceType: ResourceType.USER,
    resourceId: userId,
    result: AuditResult.SUCCESS,
    request,
  });
}

export async function logPasswordResetRequested(
  email: string,
  request?: NextRequest
): Promise<void> {
  await createAuditLog({
    action: AuditAction.PASSWORD_RESET_REQUESTED,
    userEmail: email,
    result: AuditResult.SUCCESS,
    request,
  });
}

export async function logPasswordResetCompleted(
  userId: string,
  userEmail: string,
  request?: NextRequest
): Promise<void> {
  await createAuditLog({
    action: AuditAction.PASSWORD_RESET_COMPLETED,
    userId,
    userEmail,
    resourceType: ResourceType.USER,
    resourceId: userId,
    result: AuditResult.SUCCESS,
    request,
  });
}
