/**
 * Admin API surface. Every function is authenticated (Supabase bearer token)
 * and additionally verifies the caller is a registered administrator.
 * Database access goes through the caller's RLS-scoped client; only WhatsApp
 * delivery uses the privileged server engine, and only after authorisation.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Section } from "./domain/types";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
  if (error || !data) throw new Error("Forbidden");
  const { data: admin } = await context.supabase
    .from("admins")
    .select("id, display_name, email")
    .eq("user_id", context.userId)
    .maybeSingle();
  return admin as { id: string; display_name: string | null; email: string } | null;
}

async function audit(
  context: Ctx,
  adminId: string | null,
  event: string,
  input: { memberId?: string | null; entityType?: string; entityId?: string; metadata?: unknown },
) {
  await context.supabase.from("audit_logs").insert({
    event,
    actor_admin_id: adminId,
    actor_label: "admin",
    member_id: input.memberId ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: (input.metadata ?? {}) as never,
  });
}

/* ------------------------------------------------------------------ status */

export const getSystemStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as Ctx);
    const { isWhatsAppConfigured, getWhatsAppConfig } = await import("./server/whatsapp.server");
    const config = getWhatsAppConfig();
    return { configured: isWhatsAppConfigured(config), devMode: config.devMode };
  });

export const getCurrentAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await assertAdmin(context as Ctx);
    const { data: roles } = await (context as Ctx).supabase
      .from("admin_roles")
      .select("role")
      .eq("user_id", (context as Ctx).userId);
    return {
      admin,
      roles: ((roles ?? []) as { role: string }[]).map((r) => r.role),
    };
  });

/* --------------------------------------------------------------- dashboard */

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const today = since.toISOString();

    const count = async (
      table: string,
      build: (q: any) => any = (q) => q,
    ): Promise<number> => {
      const { count: n } = await build(ctx.supabase.from(table).select("id", { count: "exact", head: true }));
      return n ?? 0;
    };

    const [
      totalMembers,
      pendingMembers,
      approvedMembers,
      boys,
      girls,
      suspended,
      blocked,
      verifiedMembers,
      pendingVerification,
      inReviewVerification,
      rejectedVerification,
      messagesToday,
      questionsToday,
      answersToday,
      broadcastsToday,
      pendingQuestions,
      pendingAnswers,
    ] = await Promise.all([
      count("members"),
      count("members", (q) => q.eq("status", "pending")),
      count("members", (q) => q.eq("status", "approved")),
      count("members", (q) => q.eq("section", "boys")),
      count("members", (q) => q.eq("section", "girls")),
      count("members", (q) => q.eq("status", "suspended")),
      count("members", (q) => q.eq("status", "blocked")),
      count("members", (q) => q.eq("verification_status", "verified")),
      count("verification_records", (q) => q.eq("status", "pending")),
      count("verification_records", (q) => q.eq("status", "in_review")),
      count("verification_records", (q) => q.eq("status", "rejected")),
      count("messages", (q) => q.gte("created_at", today)),
      count("questions", (q) => q.gte("created_at", today)),
      count("answers", (q) => q.gte("created_at", today)),
      count("broadcasts", (q) => q.gte("created_at", today)),
      count("questions", (q) => q.eq("status", "pending")),
      count("answers", (q) => q.eq("status", "pending")),
    ]);

    const { data: activity } = await ctx.supabase
      .from("audit_logs")
      .select("id, event, actor_label, created_at, member_id, entity_type")
      .order("created_at", { ascending: false })
      .limit(12);

    return {
      members: {
        total: totalMembers,
        pending: pendingMembers,
        approved: approvedMembers,
        verified: verifiedMembers,
        boys,
        girls,
        suspended,
        blocked,
      },
      communication: {
        messagesToday,
        questionsToday,
        answersToday,
        broadcastsToday,
        pendingQuestions,
        pendingAnswers,
      },
      verification: {
        pending: pendingVerification,
        inReview: inReviewVerification,
        verified: verifiedMembers,
        rejected: rejectedVerification,
      },
      activity: (activity ?? []) as {
        id: string;
        event: string;
        actor_label: string;
        created_at: string;
      }[],
    };
  });

/* ----------------------------------------------------------------- members */

export interface MemberFilters {
  search?: string;
  status?: string;
  section?: string;
  verification?: string;
  page?: number;
  pageSize?: number;
}

export const listMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: MemberFilters) => input ?? {})
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(100, data.pageSize ?? 20);

    let query = ctx.supabase
      .from("members")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (data.section && data.section !== "all") query = query.eq("section", data.section);
    if (data.verification && data.verification !== "all")
      query = query.eq("verification_status", data.verification);
    if (data.search?.trim()) {
      const term = data.search.trim().replace(/[%,]/g, "");
      query = query.or(
        `internal_member_id.ilike.%${term}%,display_name.ilike.%${term}%,phone_number.ilike.%${term}%`,
      );
    }

    const { data: rows, count, error } = await query;
    if (error) throw new Error("Could not load members.");
    return { rows: rows ?? [], total: count ?? 0, page, pageSize };
  });

export const getMemberDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const [member, messages, questions, answers, moderation, verifications] = await Promise.all([
      ctx.supabase.from("members").select("*").eq("id", data.id).maybeSingle(),
      ctx.supabase
        .from("messages")
        .select("*")
        .eq("member_id", data.id)
        .order("created_at", { ascending: false })
        .limit(50),
      ctx.supabase.from("questions").select("*").eq("member_id", data.id).order("created_at", { ascending: false }),
      ctx.supabase.from("answers").select("*").eq("member_id", data.id).order("created_at", { ascending: false }),
      ctx.supabase
        .from("moderation_actions")
        .select("*")
        .eq("member_id", data.id)
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("verification_records")
        .select("*")
        .eq("member_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    if (!member.data) throw new Error("Member not found.");
    return {
      member: member.data,
      messages: messages.data ?? [],
      questions: questions.data ?? [],
      answers: answers.data ?? [],
      moderation: moderation.data ?? [],
      verifications: verifications.data ?? [],
    };
  });

export type MemberAction =
  | "approve"
  | "reject"
  | "suspend"
  | "block"
  | "remove"
  | "restore"
  | "assign_section"
  | "note"
  | "warn";

export const applyMemberAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id: string; action: MemberAction; section?: Section; reason?: string; note?: string }) => {
      if (!input?.id || !input?.action) throw new Error("Invalid request.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const admin = await assertAdmin(ctx);
    const now = new Date().toISOString();

    const { data: member } = await ctx.supabase
      .from("members")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!member) throw new Error("Member not found.");

    const patch: Record<string, unknown> = {};
    let event = "";
    let notice: string | null = null;

    switch (data.action) {
      case "approve":
        if (!member.section && !data.section)
          throw new Error("Assign a section before approving this member.");
        Object.assign(patch, {
          status: "approved",
          verification_status: "verified",
          approved_at: now,
          approved_by: admin?.id ?? null,
          onboarding_step: "done",
          ...(data.section ? { section: data.section } : {}),
        });
        event = "MEMBER_APPROVED";
        notice = `Your membership has been approved. Your member reference is ${member.internal_member_id}. Send *HELP* to see what you can do.`;
        break;
      case "reject":
        Object.assign(patch, { status: "removed", verification_status: "rejected", removed_at: now });
        event = "MEMBER_REJECTED";
        notice = "Your membership request was not approved at this time.";
        break;
      case "suspend":
        Object.assign(patch, { status: "suspended", suspended_at: now });
        event = "MEMBER_SUSPENDED";
        notice = "Your membership has been suspended. You will not receive community content for now.";
        break;
      case "block":
        Object.assign(patch, { status: "blocked", blocked_at: now });
        event = "MEMBER_BLOCKED";
        break;
      case "remove":
        Object.assign(patch, { status: "removed", removed_at: now });
        event = "MEMBER_REMOVED";
        break;
      case "restore":
        Object.assign(patch, {
          status: member.section ? "approved" : "pending",
          suspended_at: null,
          blocked_at: null,
          removed_at: null,
        });
        event = "MEMBER_RESTORED";
        notice = "Your membership has been restored.";
        break;
      case "assign_section":
        if (!data.section) throw new Error("Choose a section.");
        Object.assign(patch, { section: data.section });
        event = "SECTION_ASSIGNED";
        break;
      case "note":
        Object.assign(patch, { admin_notes: data.note ?? "" });
        event = "ADMIN_NOTE_UPDATED";
        break;
      case "warn":
        event = "MEMBER_WARNED";
        notice = `Community warning: ${data.reason ?? "please follow the community rules."}`;
        break;
    }

    if (Object.keys(patch).length) {
      const { error } = await ctx.supabase.from("members").update(patch).eq("id", data.id);
      if (error) throw new Error("Could not update the member.");
    }

    if (data.action !== "note") {
      await ctx.supabase.from("moderation_actions").insert({
        member_id: data.id,
        admin_id: admin?.id ?? null,
        action: data.action,
        reason: data.reason ?? null,
        target_type: "member",
        target_id: data.id,
      });
    }

    await audit(ctx, admin?.id ?? null, event, {
      memberId: data.id,
      entityType: "member",
      entityId: data.id,
      metadata: { section: data.section ?? null, reason: data.reason ?? null },
    });

    if (notice) {
      const { sendTextToMember } = await import("./server/community.server");
      await sendTextToMember({ ...member, ...patch } as never, notice, "admin");
    }
    return { ok: true };
  });

export const sendMemberMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; text: string }) => {
    if (!input?.id || !input?.text?.trim()) throw new Error("Write a message first.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const admin = await assertAdmin(ctx);
    const { data: member } = await ctx.supabase.from("members").select("*").eq("id", data.id).maybeSingle();
    if (!member) throw new Error("Member not found.");

    const { sendTextToMember } = await import("./server/community.server");
    const result = await sendTextToMember(member as never, data.text.slice(0, 4000), "admin");
    await audit(ctx, admin?.id ?? null, "MESSAGE_SENT", { memberId: data.id, entityType: "message" });
    if (!result.ok) throw new Error(result.error ?? "The message could not be delivered.");
    return { ok: true, simulated: result.simulated };
  });

/* ------------------------------------------------------------ verification */

export const listVerifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    let query = ctx.supabase
      .from("verification_records")
      .select("*, members(internal_member_id, display_name, phone_number, section, status)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    const { data: rows } = await query;
    return rows ?? [];
  });

export const reviewVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; decision: "verified" | "rejected"; notes?: string }) => input)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const admin = await assertAdmin(ctx);
    const { data: record } = await ctx.supabase
      .from("verification_records")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!record) throw new Error("Verification record not found.");

    await ctx.supabase
      .from("verification_records")
      .update({
        status: data.decision,
        review_notes: data.notes ?? null,
        reviewer_id: admin?.id ?? null,
        verified_at: data.decision === "verified" ? new Date().toISOString() : null,
      })
      .eq("id", data.id);

    await ctx.supabase
      .from("members")
      .update({
        verification_status: data.decision,
        ...(data.decision === "verified"
          ? { section: record.requested_section, status: "in_review" }
          : { status: "verification_required" }),
      })
      .eq("id", record.member_id);

    await audit(
      ctx,
      admin?.id ?? null,
      data.decision === "verified" ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
      { memberId: record.member_id, entityType: "verification", entityId: data.id },
    );
    return { ok: true };
  });

/* -------------------------------------------------------------- questions */

export const listQuestions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string; section?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    let query = ctx.supabase
      .from("questions")
      .select("*, members(internal_member_id, display_name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (data.section && data.section !== "all") query = query.eq("section", data.section);
    const { data: rows } = await query;
    return rows ?? [];
  });

export const moderateQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      action: "approve" | "reject" | "publish" | "hide" | "close" | "delete" | "edit";
      text?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const admin = await assertAdmin(ctx);
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {};

    if (data.action === "approve") patch["status"] = "approved";
    if (data.action === "reject") patch["status"] = "rejected";
    if (data.action === "hide") patch["status"] = "hidden";
    if (data.action === "delete") patch["status"] = "deleted";
    if (data.action === "close") Object.assign(patch, { status: "closed", closed_at: now });
    if (data.action === "edit") patch["question_text"] = (data.text ?? "").slice(0, 2000);
    if (data.action === "publish") Object.assign(patch, { status: "published", published_at: now });

    const { error } = await ctx.supabase.from("questions").update(patch).eq("id", data.id);
    if (error) throw new Error("Could not update the question.");

    let delivered = 0;
    if (data.action === "publish") {
      const { distributeQuestion } = await import("./server/community.server");
      delivered = await distributeQuestion(data.id);
    }

    await audit(ctx, admin?.id ?? null, `QUESTION_${data.action.toUpperCase()}D`, {
      entityType: "question",
      entityId: data.id,
      metadata: { delivered },
    });
    return { ok: true, delivered };
  });

/* ----------------------------------------------------------------- answers */

export const listAnswers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string; section?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    let query = ctx.supabase
      .from("answers")
      .select("*, questions(question_reference, question_text), members(internal_member_id)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (data.section && data.section !== "all") query = query.eq("section", data.section);
    const { data: rows } = await query;
    return rows ?? [];
  });

export const moderateAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id: string; action: "approve" | "reject" | "publish" | "hide" | "delete" }) => input,
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const admin = await assertAdmin(ctx);
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {};
    if (data.action === "approve") Object.assign(patch, { status: "approved", approved_at: now });
    if (data.action === "reject") patch["status"] = "rejected";
    if (data.action === "hide") patch["status"] = "hidden";
    if (data.action === "delete") patch["status"] = "deleted";
    if (data.action === "publish") Object.assign(patch, { status: "published", published_at: now });

    const { error } = await ctx.supabase.from("answers").update(patch).eq("id", data.id);
    if (error) throw new Error("Could not update the answer.");

    let delivered = 0;
    if (data.action === "publish") {
      const { distributeAnswer } = await import("./server/community.server");
      delivered = await distributeAnswer(data.id);
    }
    await audit(ctx, admin?.id ?? null, `ANSWER_${data.action.toUpperCase()}D`, {
      entityType: "answer",
      entityId: data.id,
      metadata: { delivered },
    });
    return { ok: true, delivered };
  });

/* -------------------------------------------------------------- broadcasts */

export interface BroadcastInput {
  target: "boys" | "girls" | "both" | "selected";
  memberIds?: string[];
  message: string;
  idempotencyKey?: string;
}

async function resolveRecipients(ctx: Ctx, input: BroadcastInput) {
  const { filterRecipients } = await import("./domain/isolation");
  if (input.target === "selected") {
    const ids = (input.memberIds ?? []).slice(0, 500);
    if (!ids.length) return [];
    const { data } = await ctx.supabase.from("members").select("*").in("id", ids);
    return (data ?? []).filter((m: any) => m.status === "approved" && m.section);
  }
  const { data } = await ctx.supabase.from("members").select("*").eq("status", "approved");
  return filterRecipients((data ?? []) as never[], input.target as never);
}

export const previewBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: BroadcastInput) => input)
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const recipients = await resolveRecipients(ctx, data);
    return { count: recipients.length };
  });

export const sendBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: BroadcastInput) => {
    if (!input?.message?.trim()) throw new Error("Write a message first.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const admin = await assertAdmin(ctx);

    // Idempotency: the same key never sends twice.
    if (data.idempotencyKey) {
      const { data: existing } = await ctx.supabase
        .from("broadcasts")
        .select("id, recipient_count")
        .eq("idempotency_key", data.idempotencyKey)
        .maybeSingle();
      if (existing) return { ok: true, duplicate: true, sent: 0, failed: 0 };
    }

    const recipients = await resolveRecipients(ctx, data);
    const { data: broadcast, error } = await ctx.supabase
      .from("broadcasts")
      .insert({
        created_by: admin?.id ?? null,
        target_type: data.target,
        section: data.target === "boys" || data.target === "girls" ? data.target : null,
        message_text: data.message.slice(0, 4000),
        status: "sending",
        recipient_count: recipients.length,
        idempotency_key: data.idempotencyKey ?? null,
      })
      .select("id")
      .single();
    if (error || !broadcast) throw new Error("Could not create the broadcast.");

    await audit(ctx, admin?.id ?? null, "BROADCAST_CREATED", {
      entityType: "broadcast",
      entityId: broadcast.id,
      metadata: { target: data.target, recipients: recipients.length },
    });

    const { deliverToMember } = await import("./server/community.server");
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients as any[]) {
      const result = await deliverToMember(
        recipient,
        { type: "text", text: data.message.slice(0, 4000) },
        "community",
        recipient.section,
      );
      if (result.ok) sent += 1;
      else failed += 1;

      await ctx.supabase.from("broadcast_recipients").insert({
        broadcast_id: broadcast.id,
        member_id: recipient.id,
        status: result.ok ? "sent" : "failed",
        whatsapp_message_id: result.whatsappMessageId ?? null,
        sent_at: result.ok ? new Date().toISOString() : null,
        failed_at: result.ok ? null : new Date().toISOString(),
        error_detail: result.error ?? null,
      });
    }

    await ctx.supabase
      .from("broadcasts")
      .update({
        status: failed === 0 ? "sent" : sent === 0 ? "failed" : "partially_failed",
        sent_at: new Date().toISOString(),
      })
      .eq("id", broadcast.id);

    await audit(ctx, admin?.id ?? null, "BROADCAST_SENT", {
      entityType: "broadcast",
      entityId: broadcast.id,
      metadata: { sent, failed },
    });
    return { ok: true, duplicate: false, sent, failed };
  });

export const listBroadcasts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const { data } = await ctx.supabase
      .from("broadcasts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

/* ------------------------------------------------- messages / logs / config */

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { direction?: string; status?: string; page?: number } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const page = Math.max(1, data.page ?? 1);
    const pageSize = 25;
    let query = ctx.supabase
      .from("messages")
      .select("*, members(internal_member_id, display_name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (data.direction && data.direction !== "all") query = query.eq("direction", data.direction);
    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    const { data: rows, count } = await query;
    return { rows: rows ?? [], total: count ?? 0, page, pageSize };
  });

export const listModeration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const { data } = await ctx.supabase
      .from("moderation_actions")
      .select("*, members(internal_member_id, display_name, status)")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { event?: string } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    let query = ctx.supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.event?.trim()) query = query.ilike("event", `%${data.event.trim()}%`);
    const { data: rows } = await query;
    return rows ?? [];
  });

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as Ctx;
    await assertAdmin(ctx);
    const { data } = await ctx.supabase.from("system_settings").select("*").order("key");
    return data ?? [];
  });

export const updateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string; value: unknown }) => {
    if (!input?.key) throw new Error("Invalid setting.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const admin = await assertAdmin(ctx);
    const { error } = await ctx.supabase
      .from("system_settings")
      .upsert(
        { key: data.key, value: data.value as never, updated_by: admin?.id ?? null, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) throw new Error("Could not save the setting.");
    await audit(ctx, admin?.id ?? null, "SETTINGS_CHANGED", {
      entityType: "setting",
      metadata: { key: data.key },
    });
    return { ok: true };
  });

/* --------------------------------------------------------- development mode */

export const simulateInboundMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { phone: string; text: string; name?: string }) => {
    if (!/^\+?\d{7,15}$/.test(input?.phone ?? "")) throw new Error("Enter a valid phone number.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const admin = await assertAdmin(ctx);
    const { getWhatsAppConfig } = await import("./server/whatsapp.server");
    if (!getWhatsAppConfig().devMode) {
      throw new Error("Development mode is switched off, so simulation is disabled.");
    }
    const waId = data.phone.replace(/\D/g, "");
    const { processInboundMessage } = await import("./server/community.server");
    await processInboundMessage({
      waId,
      phone: `+${waId}`,
      ...(data.name ? { profileName: data.name } : {}),
      messageId: `dev-${crypto.randomUUID()}`,
      text: data.text,
      type: "text",
    });
    await audit(ctx, admin?.id ?? null, "DEV_SIMULATED_INBOUND", { metadata: { waId } });
    return { ok: true };
  });
