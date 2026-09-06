/**
 * WhatsApp conversation engine (pure).
 *
 * Takes the current member record + the text they sent and returns the replies
 * to send plus the state changes / side effects the caller must persist.
 * No I/O here, so the whole member experience is unit testable.
 */
import type { MemberStatus, OnboardingStep, Section, VerificationStatus } from "./types";

export interface ConversationMember {
  id: string;
  internal_member_id: string;
  display_name: string | null;
  section: Section | null;
  status: MemberStatus;
  verification_status: VerificationStatus;
  onboarding_step: OnboardingStep;
}

export interface ReplyMessage {
  type: "text" | "buttons";
  text: string;
  buttons?: { id: string; title: string }[];
}

export type SideEffect =
  | { kind: "create_question"; text: string }
  | { kind: "create_answer"; questionReference: string; text: string }
  | { kind: "create_report"; text: string }
  | { kind: "request_section"; section: Section }
  | { kind: "issue_otp" }
  | { kind: "check_otp"; code: string }
  | { kind: "opt_out" };

export interface ConversationResult {
  replies: ReplyMessage[];
  memberUpdates: Partial<{
    display_name: string;
    onboarding_step: OnboardingStep;
    status: MemberStatus;
    consent_accepted_at: string;
  }>;
  effects: SideEffect[];
}

const RULES_FALLBACK =
  "1. Be respectful at all times.\n" +
  "2. Never share another member's contact details.\n" +
  "3. Content stays inside your own section.\n" +
  "4. No spam, harassment or adult content.\n" +
  "5. Admin decisions are final.";

const HELP_TEXT =
  "Available commands:\n" +
  "*STATUS* – see your membership status\n" +
  "*RULES* – read community rules\n" +
  "*ASK <your question>* – submit a question\n" +
  "*ANSWER <Q101> <your answer>* – answer a published question\n" +
  "*REPORT <details>* – report a problem to the admin\n" +
  "*STOP* – stop receiving community messages\n" +
  "*HELP* – show this list";

function text(body: string): ReplyMessage {
  return { type: "text", text: body };
}

function normalize(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

function keyword(input: string): string {
  return normalize(input).toUpperCase();
}

export interface ConversationContext {
  rules?: string;
  welcome?: string;
  /** Community/community-manager display name used in copy. */
  communityName?: string;
}

export function handleInboundMessage(
  member: ConversationMember,
  rawText: string,
  ctx: ConversationContext = {},
): ConversationResult {
  const body = normalize(rawText ?? "");
  const kw = keyword(body);
  const rules = ctx.rules?.trim() || RULES_FALLBACK;
  const empty: ConversationResult = { replies: [], memberUpdates: {}, effects: [] };

  // Hard stops -------------------------------------------------------------
  if (member.status === "blocked" || member.status === "removed") {
    // Silence is deliberate: blocked/removed people receive nothing.
    return empty;
  }

  if (kw === "STOP") {
    return {
      replies: [
        text(
          "You have been opted out of community messages. Send *START* any time to opt back in.",
        ),
      ],
      memberUpdates: {},
      effects: [{ kind: "opt_out" }],
    };
  }

  if (kw === "HELP") return { ...empty, replies: [text(HELP_TEXT)] };
  if (kw === "RULES" || kw === "COMMUNITY RULES")
    return { ...empty, replies: [text(`*Community rules*\n\n${rules}`)] };

  if (kw === "STATUS" || kw === "MY STATUS") {
    return {
      ...empty,
      replies: [
        text(
          `*Your membership*\n` +
            `Member reference: ${member.internal_member_id}\n` +
            `Name: ${member.display_name ?? "not set"}\n` +
            `Section: ${member.section ? sectionLabel(member.section) : "not assigned yet"}\n` +
            `Status: ${member.status.replace(/_/g, " ")}\n` +
            `Verification: ${member.verification_status.replace(/_/g, " ")}`,
        ),
      ],
    };
  }

  if (member.status === "suspended") {
    return {
      ...empty,
      replies: [
        text(
          "Your membership is currently suspended, so community features are unavailable. Send *REPORT <message>* to contact the admin.",
        ),
      ],
    };
  }

  if (kw.startsWith("REPORT")) {
    const detail = body.slice(6).trim();
    if (!detail)
      return { ...empty, replies: [text("Please send: *REPORT <what you want to report>*")] };
    return {
      ...empty,
      replies: [text("Thank you. Your report has been sent to the admin for review.")],
      effects: [{ kind: "create_report", text: detail }],
    };
  }

  // Approved-member commands ----------------------------------------------
  if (member.status === "approved") {
    if (kw.startsWith("ASK")) {
      const question = body.slice(3).trim();
      if (!question)
        return { ...empty, replies: [text("Please send: *ASK <your question>*")] };
      return {
        ...empty,
        replies: [
          text("Your question was received and is waiting for admin review. You'll be notified once it is published."),
        ],
        effects: [{ kind: "create_question", text: question }],
      };
    }

    if (kw.startsWith("ANSWER")) {
      const rest = body.slice(6).trim();
      const match = rest.match(/^(Q\d+)\s+([\s\S]+)$/i);
      if (!match)
        return {
          ...empty,
          replies: [text("Please send: *ANSWER Q101 <your answer>* using the question reference.")],
        };
      return {
        ...empty,
        replies: [text("Your answer was received and is waiting for admin review.")],
        effects: [
          { kind: "create_answer", questionReference: String(match[1]).toUpperCase(), text: String(match[2]) },
        ],
      };
    }

    return {
      ...empty,
      replies: [
        text(
          `Hi ${member.display_name ?? "there"}, you're an approved member of the ${sectionLabel(
            member.section!,
          )} section.\n\n${HELP_TEXT}`,
        ),
      ],
    };
  }

  // Onboarding -------------------------------------------------------------
  return handleOnboarding(member, body, kw, rules, ctx);
}

function handleOnboarding(
  member: ConversationMember,
  body: string,
  kw: string,
  rules: string,
  ctx: ConversationContext,
): ConversationResult {
  const community = ctx.communityName ?? "our private community";

  if (kw === "START" || member.onboarding_step === "welcome") {
    return {
      replies: [
        text(
          ctx.welcome?.trim() ||
            `Welcome to ${community}. This is a private, moderated community. Registration takes about a minute.`,
        ),
        {
          type: "buttons",
          text: `*Community rules*\n\n${rules}\n\nDo you accept these rules?`,
          buttons: [
            { id: "consent_yes", title: "I accept" },
            { id: "consent_no", title: "Not now" },
          ],
        },
      ],
      memberUpdates: { onboarding_step: "consent" },
      effects: [],
    };
  }

  switch (member.onboarding_step) {
    case "rules":
    case "consent": {
      if (kw === "CONSENT_NO" || kw === "NOT NOW" || kw === "NO") {
        return {
          replies: [
            text("No problem. Registration stopped. Send *START* whenever you'd like to join."),
          ],
          memberUpdates: { onboarding_step: "welcome" },
          effects: [],
        };
      }
      if (kw === "CONSENT_YES" || kw === "I ACCEPT" || kw === "YES" || kw === "ACCEPT") {
        return {
          replies: [text("Thank you. What name should the admin see for you?")],
          memberUpdates: {
            onboarding_step: "name",
            consent_accepted_at: new Date().toISOString(),
          },
          effects: [],
        };
      }
      return {
        replies: [
          {
            type: "buttons",
            text: "Please confirm that you accept the community rules.",
            buttons: [
              { id: "consent_yes", title: "I accept" },
              { id: "consent_no", title: "Not now" },
            ],
          },
        ],
        memberUpdates: {},
        effects: [],
      };
    }

    case "name": {
      const name = body.slice(0, 60).trim();
      if (name.length < 2)
        return {
          replies: [text("Please send a name with at least 2 characters.")],
          memberUpdates: {},
          effects: [],
        };
      return {
        replies: [
          {
            type: "buttons",
            text: `Thanks ${name}. Which section are you requesting to join?`,
            buttons: [
              { id: "section_boys", title: "Boys" },
              { id: "section_girls", title: "Girls" },
            ],
          },
        ],
        memberUpdates: { display_name: name, onboarding_step: "section_request" },
        effects: [],
      };
    }

    case "section_request": {
      const section: Section | null =
        kw === "SECTION_BOYS" || kw === "BOYS" ? "boys" : kw === "SECTION_GIRLS" || kw === "GIRLS" ? "girls" : null;
      if (!section) {
        return {
          replies: [
            {
              type: "buttons",
              text: "Please choose the section you are requesting.",
              buttons: [
                { id: "section_boys", title: "Boys" },
                { id: "section_girls", title: "Girls" },
              ],
            },
          ],
          memberUpdates: {},
          effects: [],
        };
      }
      return {
        replies: [
          text(
            "Thanks. To confirm this WhatsApp number belongs to you, I'm sending a 6-digit code. Reply with the code.",
          ),
        ],
        memberUpdates: { onboarding_step: "verification", status: "verification_required" },
        effects: [{ kind: "request_section", section }, { kind: "issue_otp" }],
      };
    }

    case "verification": {
      const code = body.replace(/\D/g, "");
      if (kw === "RESEND")
        return {
          replies: [text("Sending a new code now.")],
          memberUpdates: {},
          effects: [{ kind: "issue_otp" }],
        };
      if (code.length !== 6)
        return {
          replies: [text("Please reply with the 6-digit code, or send *RESEND* for a new one.")],
          memberUpdates: {},
          effects: [],
        };
      return { replies: [], memberUpdates: {}, effects: [{ kind: "check_otp", code }] };
    }

    case "in_review":
      return {
        replies: [
          text(
            "Your registration is with the admin for review. You'll get a message here as soon as a decision is made.",
          ),
        ],
        memberUpdates: {},
        effects: [],
      };

    default:
      return {
        replies: [text("Send *START* to begin registration, or *HELP* to see what I can do.")],
        memberUpdates: {},
        effects: [],
      };
  }
}

export function sectionLabel(section: Section): string {
  return section === "boys" ? "Boys" : "Girls";
}

/** Message sent once verification succeeds and the request goes to the admin. */
export function verificationSuccessMessage(reference: string): string {
  return (
    "Number verified. Your request is now with the admin for approval.\n" +
    `Your member reference is *${reference}*. Send *STATUS* any time to check progress.`
  );
}

export function otpMessage(code: string): string {
  return `Your verification code is *${code}*. It expires in 10 minutes. Reply with this code to continue.`;
}
