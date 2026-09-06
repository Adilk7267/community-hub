/**
 * Shared domain types for the Private WhatsApp Community Manager.
 * Kept free of any server/browser specific import so it can be used everywhere
 * (UI, server functions, webhook route, tests).
 */

export type Section = "boys" | "girls";

export type MemberStatus =
  | "pending"
  | "verification_required"
  | "in_review"
  | "approved"
  | "suspended"
  | "blocked"
  | "removed";

export type VerificationStatus = "pending" | "in_review" | "verified" | "rejected" | "expired";

export type QuestionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "published"
  | "hidden"
  | "closed"
  | "deleted";

export type AnswerStatus = "pending" | "approved" | "rejected" | "published" | "hidden" | "deleted";

export type MessageStatus = "received" | "queued" | "sent" | "delivered" | "read" | "failed";

export type BroadcastTarget = Section | "both" | "selected";

export type OnboardingStep =
  | "welcome"
  | "rules"
  | "consent"
  | "name"
  | "section_request"
  | "verification"
  | "in_review"
  | "done";

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  pending: "Pending",
  verification_required: "Verification required",
  in_review: "In review",
  approved: "Approved",
  suspended: "Suspended",
  blocked: "Blocked",
  removed: "Removed",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  pending: "Pending",
  in_review: "In review",
  verified: "Verified",
  rejected: "Rejected",
  expired: "Expired",
};

/** Mask a phone number for logs and any non-admin surface: +923001234567 -> +9230*****67 */
export function maskPhone(phone: string): string {
  const cleaned = phone.trim();
  if (cleaned.length <= 6) return "*".repeat(cleaned.length);
  return `${cleaned.slice(0, 5)}${"*".repeat(Math.max(3, cleaned.length - 7))}${cleaned.slice(-2)}`;
}
