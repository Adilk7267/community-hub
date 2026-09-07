/**
 * Official Meta WhatsApp Cloud API webhook.
 *
 * GET  — Meta's subscription handshake (hub.challenge).
 * POST — inbound messages and delivery status updates. Every payload is
 *        signature-verified (X-Hub-Signature-256) and de-duplicated before it
 *        can create records or trigger actions.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getWhatsAppConfig } = await import("@/lib/server/whatsapp.server");
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge") ?? "";
        const { verifyToken } = getWhatsAppConfig();

        if (mode === "subscribe" && verifyToken && token === verifyToken) {
          return new Response(challenge, { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },

      POST: async ({ request }) => {
        const rawBody = await request.text();
        const { verifyWebhookSignature } = await import("@/lib/server/whatsapp.server");

        const valid = await verifyWebhookSignature(
          rawBody,
          request.headers.get("x-hub-signature-256"),
        );
        if (!valid) return new Response("Invalid signature", { status: 401 });

        let payload: WebhookPayload;
        try {
          payload = JSON.parse(rawBody) as WebhookPayload;
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const { claimWebhookEvent, processInboundMessage, processStatusUpdate } = await import(
          "@/lib/server/community.server"
        );

        try {
          for (const entry of payload.entry ?? []) {
            for (const change of entry.changes ?? []) {
              const value = change.value;
              if (!value) continue;
              const contacts = value.contacts ?? [];

              for (const message of value.messages ?? []) {
                const fresh = await claimWebhookEvent(`msg:${message.id}`, message);
                if (!fresh) continue;

                const contact = contacts.find((c) => c.wa_id === message.from) ?? contacts[0];
                await processInboundMessage({
                  waId: message.from,
                  phone: `+${message.from}`,
                  ...(contact?.profile?.name ? { profileName: contact.profile.name } : {}),
                  messageId: message.id,
                  text: extractText(message),
                  type: message.type ?? "text",
                });
              }

              for (const status of value.statuses ?? []) {
                const fresh = await claimWebhookEvent(
                  `status:${status.id}:${status.status}`,
                  status,
                );
                if (!fresh) continue;
                await processStatusUpdate(status);
              }
            }
          }
        } catch (error) {
          console.error("[webhook] processing failed", error instanceof Error ? error.message : error);
          // Always 200 so Meta does not retry-storm; the error is logged server-side.
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});

interface WebhookPayload {
  entry?: {
    changes?: {
      value?: {
        contacts?: { wa_id: string; profile?: { name?: string } }[];
        messages?: InboundWebhookMessage[];
        statuses?: { id: string; status: string; timestamp?: string }[];
      };
    }[];
  }[];
}

interface InboundWebhookMessage {
  id: string;
  from: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string; payload?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
}

function extractText(message: InboundWebhookMessage): string {
  if (message.text?.body) return message.text.body;
  if (message.interactive?.button_reply)
    return message.interactive.button_reply.id ?? message.interactive.button_reply.title ?? "";
  if (message.interactive?.list_reply)
    return message.interactive.list_reply.id ?? message.interactive.list_reply.title ?? "";
  if (message.button) return message.button.payload ?? message.button.text ?? "";
  return "";
}
