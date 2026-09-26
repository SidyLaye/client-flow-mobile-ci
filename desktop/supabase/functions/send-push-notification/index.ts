import { handleCors, getServiceClient, jsonResponse } from "../_shared/helpers.ts";

/**
 * Sends Expo push notifications.
 *
 * Two invocation modes are supported:
 *
 * 1. Supabase Database Webhook on `public.notifications` INSERT:
 *    body shape = { type: "INSERT", table: "notifications", record: { ... } }
 *
 * 2. Direct call from any Edge Function or admin tool:
 *    body shape = { user_id: string, title: string, body?: string, data?: object }
 */

type NotificationRecord = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string | null;
  related_client_id: string | null;
  related_document_id: string | null;
  related_invoice_id: string | null;
  related_message_id: string | null;
  related_request_id: string | null;
};

type ExpoPushMessage = {
  to: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  sound: "default";
  priority: "high";
  channelId?: string;
};

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json();

    // Resolve target user + payload depending on invocation mode.
    let userId: string;
    let title: string;
    let messageBody: string | undefined;
    let data: Record<string, unknown> = {};

    if (body?.type === "INSERT" && body?.record) {
      const rec = body.record as NotificationRecord;
      userId = rec.user_id;
      title = rec.title;
      messageBody = rec.body ?? undefined;
      data = {
        notification_id: rec.id,
        type: rec.type,
        client_id: rec.related_client_id,
        document_id: rec.related_document_id,
        invoice_id: rec.related_invoice_id,
        message_id: rec.related_message_id,
        request_id: rec.related_request_id,
      };
    } else if (body?.user_id && body?.title) {
      userId = body.user_id;
      title = body.title;
      messageBody = body.body;
      data = body.data ?? {};
    } else {
      return jsonResponse({ error: "Payload invalide" }, 400);
    }

    const service = getServiceClient();

    const { data: tokens, error: tokensError } = await service
      .from("push_tokens")
      .select("token")
      .eq("user_id", userId);

    if (tokensError) {
      return jsonResponse({ error: "Lecture push_tokens échouée", details: tokensError.message }, 500);
    }
    if (!tokens || tokens.length === 0) {
      return jsonResponse({ ok: true, sent: 0, reason: "no tokens registered" });
    }

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token as string,
      title,
      body: messageBody,
      data,
      sound: "default",
      priority: "high",
      channelId: "default",
    }));

    // Expo accepts batches of up to 100; chunk to be safe.
    const chunks: ExpoPushMessage[][] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    const expoToken = Deno.env.get("EXPO_ACCESS_TOKEN");
    const responses: unknown[] = [];

    for (const chunk of chunks) {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          ...(expoToken ? { Authorization: `Bearer ${expoToken}` } : {}),
        },
        body: JSON.stringify(chunk),
      });
      const json = await res.json().catch(() => ({}));
      responses.push(json);

      // Garbage-collect tokens Expo flagged as invalid.
      const tickets = (json as { data?: Array<{ status: string; details?: { error?: string } }> })?.data ?? [];
      const toRemove: string[] = [];
      tickets.forEach((ticket, i) => {
        if (
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered"
        ) {
          toRemove.push(chunk[i].to);
        }
      });
      if (toRemove.length > 0) {
        await service.from("push_tokens").delete().in("token", toRemove);
      }
    }

    return jsonResponse({ ok: true, sent: messages.length, responses });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
