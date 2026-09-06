/**
 * WhatsApp Business Platform (Meta Cloud API) service layer.
 *
 * This is the ONLY place that talks to Meta. Everything else in the app calls
 * these functions. Official Cloud API only — no automation, no QR sessions.
 *
 * When credentials are missing the service reports `configured: false` and, in
 * development mode, records the outbound message as a simulated send instead of
 * pretending it reached WhatsApp.
 */
import type { ReplyMessage } from "../domain/conversation";

const GRAPH_VERSION = "v21.0";

export interface WhatsAppConfig {
  accessToken?: string;
  phoneNumberId?: string;
  verifyToken?: string;
  appSecret?: string;
  devMode: boolean;
}

export function getWhatsAppConfig(): WhatsAppConfig {
  return {
    accessToken: process.env["WHATSAPP_ACCESS_TOKEN"] || undefined,
    phoneNumberId: process.env["WHATSAPP_PHONE_NUMBER_ID"] || undefined,
    verifyToken: process.env["WHATSAPP_VERIFY_TOKEN"] || undefined,
    appSecret: process.env["WHATSAPP_APP_SECRET"] || undefined,
    devMode: (process.env["WHATSAPP_DEV_MODE"] || "").toLowerCase() === "true",
  };
}

export function isWhatsAppConfigured(config = getWhatsAppConfig()): boolean {
  return Boolean(config.accessToken && config.phoneNumberId);
}

export interface SendResult {
  ok: boolean;
  simulated: boolean;
  whatsappMessageId?: string;
  error?: string;
}

async function callGraph(body: Record<string, unknown>): Promise<SendResult> {
  const config = getWhatsAppConfig();

  if (!isWhatsAppConfigured(config)) {
    if (config.devMode) {
      return {
        ok: true,
        simulated: true,
        whatsappMessageId: `dev-${crypto.randomUUID()}`,
      };
    }
    return { ok: false, simulated: false, error: "WhatsApp integration is not configured." };
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${config.phoneNumberId}/messages`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { messages?: { id: string }[]; error?: { message?: string } }
      | null;

    if (!response.ok) {
      // Never leak tokens or raw provider internals upwards.
      const message = payload?.error?.message ?? `WhatsApp API error (${response.status})`;
      return { ok: false, simulated: false, error: message };
    }
    return { ok: true, simulated: false, whatsappMessageId: payload?.messages?.[0]?.id };
  } catch (error) {
    console.error("[whatsapp] send failed", error instanceof Error ? error.message : error);
    return { ok: false, simulated: false, error: "Could not reach the WhatsApp service." };
  }
}

export function sendText(to: string, body: string): Promise<SendResult> {
  return callGraph({
    to,
    type: "text",
    text: { preview_url: false, body: body.slice(0, 4096) },
  });
}

export function sendButtons(
  to: string,
  body: string,
  buttons: { id: string; title: string }[],
): Promise<SendResult> {
  return callGraph({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body.slice(0, 1024) },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

/**
 * Template messages are required by Meta when replying outside the 24-hour
 * customer service window (e.g. most broadcasts).
 */
export function sendTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  bodyParameters: string[] = [],
): Promise<SendResult> {
  return callGraph({
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(bodyParameters.length
        ? {
            components: [
              {
                type: "body",
                parameters: bodyParameters.map((textValue) => ({ type: "text", text: textValue })),
              },
            ],
          }
        : {}),
    },
  });
}

export function sendReply(to: string, reply: ReplyMessage): Promise<SendResult> {
  if (reply.type === "buttons" && reply.buttons?.length) {
    return sendButtons(to, reply.text, reply.buttons);
  }
  return sendText(to, reply.text);
}

/** Meta signs every webhook body with the app secret (X-Hub-Signature-256). */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const { appSecret, devMode } = getWhatsAppConfig();
  if (!appSecret) {
    // Without an app secret we cannot trust anything; only dev mode may skip.
    return devMode;
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expectedHex = signatureHeader.slice("sha256=".length);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const computedHex = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return timingSafeEqualHex(computedHex, expectedHex);
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hashOtp(code: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}:${code}`),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function generateOtp(): string {
  const random = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  return String(100000 + (random % 900000));
}
