/**
 * Boys/Girls isolation rules.
 *
 * Every routing decision in the system (broadcasts, question publishing,
 * answer publishing, inbound routing) MUST go through these pure helpers so the
 * rules are enforced in one place and can be unit tested.
 */
import type { MemberStatus, Section } from "./types";

export interface RoutableMember {
  id: string;
  section: Section | null;
  status: MemberStatus;
}

/** Statuses that may receive normal community content. */
const DELIVERABLE_STATUSES: MemberStatus[] = ["approved"];

export function canReceiveCommunityContent(member: RoutableMember): boolean {
  return DELIVERABLE_STATUSES.includes(member.status) && member.section !== null;
}

/** A member may only ever receive content belonging to their own section. */
export function canReceiveSectionContent(member: RoutableMember, section: Section): boolean {
  return canReceiveCommunityContent(member) && member.section === section;
}

/** Filter a candidate recipient list down to the members legitimately allowed to receive it. */
export function filterRecipients<T extends RoutableMember>(
  members: T[],
  target: Section | "both",
): T[] {
  return members.filter((member) => {
    if (!canReceiveCommunityContent(member)) return false;
    if (target === "both") return true;
    return member.section === target;
  });
}

/** Guard used before any cross-section read/write. Throws instead of silently leaking. */
export function assertSameSection(memberSection: Section | null, contentSection: Section): void {
  if (memberSection !== contentSection) {
    throw new Error("Section isolation violation: cross-section access is not allowed.");
  }
}

/** Administrative (non-community) messages such as approval notices are always allowed. */
export function canReceiveAdministrativeMessage(member: RoutableMember): boolean {
  return member.status !== "removed";
}
