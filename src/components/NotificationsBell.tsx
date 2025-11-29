"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useVault } from "@/hooks/useVault";

export type NotificationRecord = {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  body: string | null;
  data: Record<string, any> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

function formatDate(input: string) {
  const date = new Date(input);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function NotificationsBell() {
  const supabase = useMemo(() => supabaseBrowser() as SupabaseClient<any, "public", any>, []);
  const { dataKey } = useVault();
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlayMessage, setOverlayMessage] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [lastAlertSet, setLastAlertSet] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const mountedRef = useRef(true);
  const realtimeCleanup = useRef<(() => void) | null>(null);
  const overlayTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const alertsAllowed = useMemo(() => !!dataKey && pathname?.startsWith("/today"), [dataKey, pathname]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const triggerUnreadAlerts = (count: number) => {
    if (count <= 0 || !alertsAllowed) return;
    const message = buildUnreadMessage(count);
    setOverlayMessage(message);
    setOverlayVisible(true);
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
    overlayTimer.current = setTimeout(() => {
      if (mountedRef.current) setOverlayVisible(false);
    }, 5200);
  };

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      if (!active) return;
      setUserId(uid);
      if (uid) {
        await loadNotifications(uid);
        realtimeCleanup.current?.();
        realtimeCleanup.current = subscribeToRealtime(uid);
      }
    })();

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        loadNotifications(uid);
        realtimeCleanup.current?.();
        realtimeCleanup.current = subscribeToRealtime(uid);
      } else {
        realtimeCleanup.current?.();
        realtimeCleanup.current = null;
        setNotifications([]);
      }
    });

    return () => {
      active = false;
      authSubscription?.subscription.unsubscribe();
      realtimeCleanup.current?.();
      if (overlayTimer.current) clearTimeout(overlayTimer.current);
    };
  }, [supabase]);

  const loadNotifications = async (uid: string) => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!mountedRef.current) return;
    if (fetchError) {
      setError("Unable to load notifications");
      setLoading(false);
      return;
    }

    setNotifications(data ?? []);
    setLoading(false);

    const unread = (data ?? []).filter((n) => !n.is_read).length;
    const unreadIds = (data ?? []).filter((n) => !n.is_read).map((n) => n.id).sort();
    const nextKey = unreadIds.join("|");
    if (unreadIds.length === 0) {
      setLastAlertSet(null);
    } else if (alertsAllowed && nextKey !== lastAlertSet) {
      setLastAlertSet(nextKey);
      triggerUnreadAlerts(unreadIds.length);
    }

    // Housekeep: delete read notifications older than 24 hours to keep the list lean.
    void cleanupOldRead(uid);
  };

  const persistReadState = async (ids: string[]) => {
    if (!userId || ids.length === 0) return true;

    // First try to write both is_read and read_at; if the column is missing (older schema), fall back to is_read only.
    const payload: Partial<NotificationRecord> = { is_read: true, read_at: new Date().toISOString() };
    const { error } = await supabase
      .from("notifications")
      .update(payload)
      .in("id", ids)
      .eq("user_id", userId);

    if (!error) return true;

    const fallback = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", ids)
      .eq("user_id", userId);

    if (fallback.error) {
      setError("Unable to update notifications");
      return false;
    }

    return true;
  };

  const subscribeToRealtime = (uid: string) => {
    const channel = supabase
      .channel(`notifications-${uid}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${uid}`,
        },
        (payload) => {
          const fresh = payload.new as NotificationRecord;
          setNotifications((prev) => {
            const next = [fresh, ...prev].slice(0, 20);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAllRead = async () => {
    if (!userId) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!unreadIds.length) return;

    setNotifications((prev) => prev.map((n) => (unreadIds.includes(n.id) ? { ...n, is_read: true } : n)));
    setLastAlertSet(null);
    setOverlayVisible(false);
    setOverlayMessage(null);

    const persisted = await persistReadState(unreadIds);
    if (!persisted) return;
    await loadNotifications(userId);
    void cleanupOldRead(userId);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const openAndMarkUnread = () => {
    setOpen(true);
    if (unreadCount > 0) {
      void markAllRead();
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      void markAllRead();
    }
  };

  const handleNavigate = (url: string | undefined | null, id: string) => {
    if (url) {
      router.push(url);
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setLastAlertSet(null);
    setOverlayVisible(false);
    setOverlayMessage(null);
    void (async () => {
      await persistReadState([id]);
      if (userId) {
        await loadNotifications(userId);
        void cleanupOldRead(userId);
      }
    })();
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (!userId) return;
    await supabase.from("notifications").delete().eq("id", id).eq("user_id", userId);
  };

  const cleanupOldRead = async (uid: string) => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("notifications")
      .delete()
      .eq("user_id", uid)
      .eq("is_read", true)
      .not("read_at", "is", null)
      .lte("read_at", cutoff);
  };

  useEffect(() => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id).sort();
    if (!unreadIds.length) {
      setLastAlertSet(null);
      if (overlayTimer.current) clearTimeout(overlayTimer.current);
      setOverlayVisible(false);
      return;
    }

    const nextKey = unreadIds.join("|");
    if (alertsAllowed && nextKey !== lastAlertSet) {
      setLastAlertSet(nextKey);
      triggerUnreadAlerts(unreadIds.length);
    }
  }, [alertsAllowed, notifications, lastAlertSet]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current) return;
      const target = event.target as Node;
      if (containerRef.current.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  if (!userId) return null;

  const renderTitle = (note: NotificationRecord) => {
    if (note.title && note.title.trim().length > 0) return note.title;
    if (note.body && note.body.trim().length > 0) {
      return note.body.slice(0, 80) + (note.body.length > 80 ? "…" : "");
    }
    return "Untitled";
  };

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        type="button"
        onClick={toggle}
        className="relative rounded-full p-2 text-neutral-200 transition hover:bg-neutral-800"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3c-3.312 0-6 2.688-6 6v2.7c0 .26-.105.51-.293.693L4 14.8V16h16v-1.2l-1.707-2.407A.99.99 0 0 1 18 11.7V9c0-3.312-2.688-6-6-6Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 18a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-semibold text-white shadow-md">
            {unreadCount}
          </span>
        )}
      </button>
      <span className="ml-2 flex items-center gap-2 text-xs font-semibold text-neutral-50">
        Notifications
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={openAndMarkUnread}
            className="rounded-full bg-indigo-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
          >
            {unreadCount} unread
          </button>
        )}
      </span>

      {open && (
        <div
          className="absolute left-1/2 top-12 w-[30rem] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 transform rounded-2xl border border-white/10 bg-neutral-950/95 p-4 shadow-2xl ring-1 ring-black/60 backdrop-blur md:left-auto md:right-0 md:top-10 md:translate-x-0 md:max-w-3xl"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Notifications</div>
              <p className="text-xs text-neutral-400">Stay in sync with updates tailored to you.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold text-white transition hover:border-indigo-400/60 hover:text-indigo-100"
              >
                Mark all as read
              </button>
              {loading && <div className="text-[11px] text-neutral-400">Loading…</div>}
            </div>
          </div>
          {error && <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-100">{error}</div>}
          {!error && notifications.length === 0 && !loading && (
            <div className="rounded-lg border border-white/5 bg-white/5 px-3 py-4 text-sm text-neutral-200">You have no notifications yet.</div>
          )}
          <div className="max-h-[30rem] space-y-3 overflow-y-auto overflow-x-hidden pr-1">
            {notifications.map((note) => {
              const targetUrl = typeof note.data?.url === "string" ? note.data.url : undefined;
              return (
                <div
                  key={note.id}
                  className={`group w-full rounded-2xl border px-4 py-3 text-left transition ${
                    note.is_read
                      ? "border-white/5 bg-neutral-900/80"
                      : "border-indigo-400/30 bg-indigo-950/30 shadow-[0_14px_40px_-22px_rgba(99,102,241,0.9)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-neutral-300">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90">{note.type}</span>
                      {!note.is_read && <span className="h-2 w-2 rounded-full bg-indigo-400" aria-hidden />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <span>{formatDate(note.created_at)}</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        className="rounded px-2 py-1 text-[11px] font-medium text-neutral-200 transition hover:bg-white/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNavigate(targetUrl, note.id)}
                    className="mt-2 block w-full text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/60"
                  >
                    <div className="text-sm font-semibold text-white">{renderTitle(note)}</div>
                    {note.body && (
                      <div className="mt-1 max-h-44 whitespace-pre-line break-words rounded-xl bg-white/5 px-3 py-2 text-sm leading-relaxed text-neutral-100 shadow-inner shadow-black/20">
                        {note.body}
                      </div>
                    )}
                    {targetUrl && <div className="mt-2 text-xs font-semibold text-indigo-300">Open</div>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {overlayVisible && overlayMessage && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[95%] max-w-xl rounded-3xl border border-indigo-500/50 bg-neutral-950/95 px-6 py-5 text-center shadow-[0_30px_120px_-40px_rgba(99,102,241,0.7)] ring-1 ring-indigo-400/40">
            <div className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-200">Notifications</div>
            <div className="mt-2 text-2xl font-bold text-white">{overlayMessage}</div>
            <p className="mt-3 text-sm leading-relaxed text-neutral-200">Open the bell to read them now. Unread messages stay highlighted.</p>
            <button
              type="button"
              onClick={() => setOverlayVisible(false)}
              className="mt-5 inline-flex items-center justify-center rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-400"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function buildUnreadMessage(count: number) {
  return `You have ${count} unread notification${count === 1 ? "" : "s"}.`;
}
