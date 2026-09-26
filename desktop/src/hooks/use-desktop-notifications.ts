import { useEffect, useRef } from "react";

import type { AppNotification } from "@/lib/api-types";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function canNotify(): Promise<boolean> {
  const { isPermissionGranted, requestPermission } = await import("@tauri-apps/plugin-notification");
  if (await isPermissionGranted()) return true;
  return (await requestPermission()) === "granted";
}

/** Shows one Windows notification now; resolves with what went wrong, if anything. */
export async function testSystemNotification(): Promise<"ok" | "browser" | "denied" | string> {
  if (!isTauri) return "browser";
  try {
    if (!(await canNotify())) return "denied";
    const { sendNotification } = await import("@tauri-apps/plugin-notification");
    sendNotification({ title: "Test ComptaFlow", body: "Si vous voyez ceci, les notifications Windows marchent." });
    return "ok";
  } catch (e) {
    return String(e);
  }
}

/**
 * Shows a system (Windows) notification for every unread notification that
 * appears after the first load, while the desktop app is running — even
 * minimized or in the background. No-op in a plain browser.
 */
export function useDesktopNotifications(items: AppNotification[] | undefined) {
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!isTauri || !items) return;

    // First load: what is already there is not "new".
    if (seen.current === null) {
      seen.current = new Set(items.map((n) => n.id));
      return;
    }

    const fresh = items.filter((n) => !n.is_read && !seen.current!.has(n.id));
    items.forEach((n) => seen.current!.add(n.id));
    if (fresh.length === 0) return;

    void (async () => {
      try {
        if (!(await canNotify())) return;
        const { sendNotification } = await import("@tauri-apps/plugin-notification");
        // Oldest first, so the most recent ends up on top of the stack.
        for (const n of [...fresh].reverse()) {
          sendNotification({ title: n.title, body: n.message });
        }
      } catch (e) {
        console.warn("[notifications] system notification failed", e);
      }
    })();
  }, [items]);
}
