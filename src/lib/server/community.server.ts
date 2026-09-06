/**
 * Core server-side community engine: message delivery, inbound webhook
 * processing, verification, questions/answers and broadcasts.
 * Server-only (uses the service-role client). Never import from a component.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ConversationMember, ReplyMessage } from "../domain/conversation";
import {
  handleInboundMessage,
  otpMessage,
  sectionLabel,
  verificationSuccessMessage,
} from "../domain/conversation";
import {
  canReceiveAdministrativeMessage,
  canReceiveSectionContent,
  type RoutableMember,
} from "../domain/isolation";
import { maskPhone, type Section } from "../domain/types";
import {
  generateOtp,
  hashOtp,
  isWhatsAppConfigured,
  sendReply,
  type SendResult,
} from "./whatsapp.server";

type MemberRow = {
  id: string;
  internal_member_id: string;
  whatsapp_user_id: string;
  phone_number: string;
  display_name: string | null;
  section: Section | null;
  status: RoutableMember["status"];
  verification_status: "pending" | "in_review" | "verified" | "rejected" | "expired";
  onboarding_step: string;
};

const OTP_TTL_MINUTES = 10;

export async function logAudit(input: {
  event: string;
  actorAdminId?: string | null;
  actorLabel?: string;
  memberId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await supabaseAdmin.from("audit_logs").insert({
    event: input.event,
    actor_admin_id: input.actorAdminId ?? null,
    actor_label: input.actorLabel ?? "system",
    member_id: input.memberId ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: (input.metadata ?? {}) as never,
  });
}

/**
 * Single delivery path for every outbound message.
 * `scope: "community"` is isolation-checked; `scope: "admin"` is a direct
 * administrative notice (approval, warning, verification code).
 */
export async function deliverToMember(
  member: MemberRow,
  reply: ReplyMessage,
  scope: "community" | "admin",
  section?: Section,
): Promise<SendResult> {
  if (scope === "community") {
    if (!section || !canReceiveSectionContent(member, section)) {
      return { ok: false, simulated: false, error: "Recipient is not eligible for this content." };
    }
  } else if (!canReceiveAdministrativeMessage(member)) {
    return { ok: false, simulated: false, error: "Recipient has been removed." };
  }

  const result = await sendReply(member.whatsapp_user_id, reply);

  await supabaseAdmin.from("messages").insert({
    whatsapp_message_id: result.whatsappMessageId ?? null,
    member_id: member.id,
    section: section ?? member.section,
    direction: "outbound",
    message_type: reply.type === "buttons" ? "interactive" : "text",
    message_text: reply.text,
    status: result.ok ? "sent" : "failed",
    error_detail: result.error ?? null,
    sent_at: result.ok ? new Date().toISOString() : null,
    failed_at: result.ok ? null : new Date().toISOString(),
  });

  if (!result.ok) {
    console.warn(
      `[whatsapp] delivery failed to ${maskPhone(member.phone_number)}: ${result.error ?? "unknown"}`,
    );
  }
  return result;
}

export function sendTextToMember(member: MemberRow, body: string, scope: "community" | "admin", section?: Section) {
  return deliverToMember(member, { type: "text", text: body }, scope, section);
}

async function getOrCreateMember(waId: string, phone: string, profileName?: string) {
  const { data: existing } = await supabaseAdmin
    .from("members")
    .select("*")
    .eq("whatsapp_user_id", waId)
    .maybeSingle();

  if (existing) return { member: existing as unknown as MemberRow, created: false };

  const { data: created, error } = await supabaseAdmin
    .from("members")
    .insert({
      whatsapp_user_id: waId,
      phone_number: phone,
      display_name: profileName ?? null,
      status: "pending",
      verification_status: "pending",
      onboarding_step: "welcome",
    })
    .select("*")
    .single();

  if (error || !created) throw new Error("Could not create the member record.");

  await logAudit({
    event: "MEMBER_CREATED",
    memberId: created.id,
    metadata: { phone: maskPhone(phone) },
  });
  return { member: created as unknown as MemberRow, created: true };
}

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabaseAdmin.from("system_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? fallback;
}

/** Idempotency gate: returns false when this webhook event was already handled. */
export async function claimWebhookEvent(eventKey: string, payload: unknown): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("webhook_events")
    .insert({ event_key: eventKey, payload: payload as never });
  if (error) return false; // unique violation -> duplicate delivery
  return true;
}

export interface InboundMessage {
  waId: string;
  phone: string;
  profileName?: string;
  messageId: string;
  text: string;
  type: string;
}

export async function processInboundMessage(input: InboundMessage): Promise<void> {
  const { member } = await getOrCreateMember(input.waId, input.phone, input.profileName);

  await supabaseAdmin.from("messages").insert({
    whatsapp_message_id: input.messageId,
    member_id: member.id,
    section: member.section,
    direction: "inbound",
    message_type: input.type,
    message_text: input.text,
    status: "received",
  });
  await supabaseAdmin
    .from("members")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", member.id);

  const rules = await getSetting<string>("community_rules", "");
  const welcome = await getSetting<string>("welcome_message", "");

  const conversationMember: ConversationMember = {
    id: member.id,
    internal_member_id: member.internal_member_id,
    display_name: member.display_name,
    section: member.section,
    status: member.status,
    verification_status: member.verification_status,
    onboarding_step: member.onboarding_step as ConversationMember["onboarding_step"],
  };

  const result = handleInboundMessage(conversationMember, input.text, { rules, welcome });

  if (Object.keys(result.memberUpdates).length > 0) {
    await supabaseAdmin.from("members").update(result.memberUpdates as never).eq("id", member.id);
    Object.assign(member, result.memberUpdates);
  }

  for (const reply of result.replies) {
    await deliverToMember(member, reply, "admin");
  }

  for (const effect of result.effects) {
    await applyEffect(member, effect);
  }
}

async function applyEffect(member: MemberRow, effect: ReturnType<typeof handleInboundMessage>["effects"][number]) {
  switch (effect.kind) {
    case "opt_out": {
      await supabaseAdmin.from("members").update({ status: "suspended", suspended_at: new Date().toISOString() }).eq("id", member.id);
      await logAudit({ event: "MEMBER_OPTED_OUT", memberId: member.id });
      break;
    }
    case "request_section": {
      await supabaseAdmin
        .from("verification_records")
        .update({ status: "expired" })
        .eq("member_id", member.id)
        .in("status", ["pending", "in_review"]);
      await supabaseAdmin.from("verification_records").insert({
        member_id: member.id,
        method: "whatsapp_otp",
        status: "pending",
        requested_section: effect.section,
      });
      await logAudit({
        event: "SECTION_REQUESTED",
        memberId: member.id,
        metadata: { section: effect.section },
      });
      break;
    }
    case "issue_otp": {
      const code = generateOtp();
      const hashed = await hashOtp(code, member.id);
      const { data: record } = await supabaseAdmin
        .from("verification_records")
        .select("id")
        .eq("member_id", member.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (record) {
        await supabaseAdmin
          .from("verification_records")
          .update({
            otp_hash: hashed,
            attempts: 0,
            expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
          })
          .eq("id", record.id);
      }
      await sendTextToMember(member, otpMessage(code), "admin");
      break;
    }
    case "check_otp": {
      const { data: record } = await supabaseAdmin
        .from("verification_records")
        .select("*")
        .eq("member_id", member.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!record) {
        await sendTextToMember(member, "No verification is in progress. Send *START* to begin again.", "admin");
        return;
      }
      const expired = record.expires_at ? new Date(record.expires_at).getTime() < Date.now() : true;
      if (expired) {
        await supabaseAdmin.from("verification_records").update({ status: "expired" }).eq("id", record.id);
        await supabaseAdmin.from("members").update({ verification_status: "expired" }).eq("id", member.id);
        await sendTextToMember(member, "That code has expired. Send *RESEND* for a new one.", "admin");
        return;
      }
      if (record.attempts >= 5) {
        await sendTextToMember(member, "Too many incorrect attempts. Send *RESEND* for a new code.", "admin");
        return;
      }

      const hashed = await hashOtp(effect.code, member.id);
      if (hashed !== record.otp_hash) {
        await supabaseAdmin
          .from("verification_records")
          .update({ attempts: record.attempts + 1 })
          .eq("id", record.id);
        await sendTextToMember(member, "That code is not correct. Please try again.", "admin");
        return;
      }

      await supabaseAdmin
        .from("verification_records")
        .update({ status: "in_review", verified_at: new Date().toISOString() })
        .eq("id", record.id);
      await supabaseAdmin
        .from("members")
        .update({
          verification_status: "in_review",
          status: "in_review",
          onboarding_step: "in_review",
          verification_reference: record.id,
        })
        .eq("id", member.id);
      await sendTextToMember(member, verificationSuccessMessage(member.internal_member_id), "admin");
      await logAudit({ event: "VERIFICATION_COMPLETED", memberId: member.id });
      break;
    }
    case "create_question": {
      if (!member.section) return;
      const { data: question } = await supabaseAdmin
        .from("questions")
        .insert({
          member_id: member.id,
          section: member.section,
          question_text: effect.text.slice(0, 2000),
          status: "pending",
        })
        .select("id, question_reference")
        .single();
      await logAudit({
        event: "QUESTION_CREATED",
        memberId: member.id,
        entityType: "question",
        entityId: question?.id ?? null,
      });
      break;
    }
    case "create_answer": {
      if (!member.section) return;
      const { data: question } = await supabaseAdmin
        .from("questions")
        .select("id, section, status")
        .eq("question_reference", effect.questionReference)
        .maybeSingle();

      // Isolation: you may only answer a published question in your own section.
      if (!question || question.section !== member.section || question.status !== "published") {
        await sendTextToMember(
          member,
          "That question reference was not found in your section.",
          "admin",
        );
        return;
      }
      const { data: answer } = await supabaseAdmin
        .from("answers")
        .insert({
          question_id: question.id,
          member_id: member.id,
          section: member.section,
          answer_text: effect.text.slice(0, 2000),
          status: "pending",
        })
        .select("id")
        .single();
      await logAudit({
        event: "ANSWER_CREATED",
        memberId: member.id,
        entityType: "answer",
        entityId: answer?.id ?? null,
      });
      break;
    }
    case "create_report": {
      await supabaseAdmin.from("moderation_actions").insert({
        member_id: member.id,
        action: "member_report",
        reason: effect.text.slice(0, 2000),
        target_type: "report",
      });
      await logAudit({ event: "REPORT_RECEIVED", memberId: member.id });
      break;
    }
  }
}

export async function processStatusUpdate(status: {
  id: string;
  status: string;
  timestamp?: string;
}): Promise<void> {
  const at = status.timestamp
    ? new Date(Number(status.timestamp) * 1000).toISOString()
    : new Date().toISOString();

  const patch: Record<string, unknown> = {};
  if (status.status === "sent") Object.assign(patch, { status: "sent", sent_at: at });
  else if (status.status === "delivered") Object.assign(patch, { status: "delivered", delivered_at: at });
  else if (status.status === "read") Object.assign(patch, { status: "read", read_at: at });
  else if (status.status === "failed") Object.assign(patch, { status: "failed", failed_at: at });
  else return;

  await supabaseAdmin.from("messages").update(patch as never).eq("whatsapp_message_id", status.id);
  await supabaseAdmin
    .from("broadcast_recipients")
    .update(patch as never)
    .eq("whatsapp_message_id", status.id);
}

/** Publish a question to its own section only. */
export async function distributeQuestion(questionId: string): Promise<number> {
  const { data: question } = await supabaseAdmin
    .from("questions")
    .select("*")
    .eq("id", questionId)
    .single();
  if (!question) throw new Error("Question not found.");

  const { data: recipients } = await supabaseAdmin
    .from("members")
    .select("*")
    .eq("status", "approved")
    .eq("section", question.section);

  const body =
    `*New question ${question.question_reference}* (${sectionLabel(question.section)} section)\n\n` +
    `${question.question_text}\n\n` +
    `Reply with *ANSWER ${question.question_reference} <your answer>* to respond.`;

  let sent = 0;
  for (const recipient of (recipients ?? []) as unknown as MemberRow[]) {
    const result = await deliverToMember(
      recipient,
      { type: "text", text: body },
      "community",
      question.section,
    );
    if (result.ok) sent += 1;
  }
  return sent;
}

/** Publish an approved answer to its own section only, without identifying the answerer. */
export async function distributeAnswer(answerId: string): Promise<number> {
  const { data: answer } = await supabaseAdmin
    .from("answers")
    .select("*, questions(question_reference, section)")
    .eq("id", answerId)
    .single();
  if (!answer) throw new Error("Answer not found.");

  const question = answer.questions as unknown as { question_reference: string; section: Section };
  const { data: recipients } = await supabaseAdmin
    .from("members")
    .select("*")
    .eq("status", "approved")
    .eq("section", question.section);

  const body =
    `*Answer to ${question.question_reference}*\n\n${answer.answer_text}\n\n` +
    `— shared anonymously by a community member`;

  let sent = 0;
  for (const recipient of (recipients ?? []) as unknown as MemberRow[]) {
    const result = await deliverToMember(recipient, { type: "text", text: body }, "community", question.section);
    if (result.ok) sent += 1;
  }
  return sent;
}

export { isWhatsAppConfigured };
export type { MemberRow };
