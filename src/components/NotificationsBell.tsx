"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

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
  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newAlert, setNewAlert] = useState<string | null>(null);
  const router = useRouter();
  const mountedRef = useRef(true);
  const realtimeCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

    // Housekeep: delete read notifications older than 24 hours to keep the list lean.
    void cleanupOldRead(uid);
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
            const next = [fresh, ...prev];
            return next.slice(0, 20);
          });
          setNewAlert(fresh.title || "You have a new notification");
          setTimeout(() => {
            if (mountedRef.current) {
              setNewAlert(null);
            }
          }, 5000);
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
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .eq("user_id", userId);
    void cleanupOldRead(userId);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      void markAllRead();
    }
  };

  const handleNavigate = (url: string | undefined | null, id: string) => {
    if (url) {
      router.push(url);
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    void supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId ?? "");
    if (userId) {
      void cleanupOldRead(userId);
    }
    setOpen(false);
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

  if (!userId) return null;

  return (
    <div className="relative flex items-center">
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
      <span className="ml-2 text-xs font-medium text-neutral-200">{`${unreadCount} unread`}</span>

      {open && (
        <div className="absolute right-0 top-10 w-80 max-w-sm rounded-xl border border-white/10 bg-neutral-950/95 p-3 shadow-2xl ring-1 ring-black/60 backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-white">Notifications</div>
            {loading && <div className="text-xs text-neutral-400">Loading…</div>}
          </div>
          {error && <div className="rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-100">{error}</div>}
          {!error && notifications.length === 0 && !loading && (
            <div className="text-sm text-neutral-400">You have no notifications yet.</div>
          )}
          <div className="max-h-80 space-y-2 overflow-auto">
            {notifications.map((note) => {
              const targetUrl = typeof note.data?.url === "string" ? note.data.url : undefined;
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => handleNavigate(targetUrl, note.id)}
                  className={`w-full rounded-lg border border-white/5 px-3 py-2 text-left transition hover:border-white/15 hover:bg-neutral-900 ${
                    note.is_read ? "opacity-75" : ""
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] uppercase tracking-wide text-neutral-200">
                      {note.type}
                    </span>
                    <span>{formatDate(note.created_at)}</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">{note.title ?? "Notification"}</div>
                  {note.body && <div className="mt-0.5 text-sm text-neutral-300 line-clamp-2">{note.body}</div>}
                  {targetUrl && <div className="mt-1 text-xs text-indigo-300">Open</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {newAlert && (
        <div className="absolute right-0 top-12 w-72 rounded-lg border border-indigo-400/40 bg-indigo-950/80 px-3 py-2 text-sm text-indigo-50 shadow-xl ring-1 ring-indigo-500/40">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">New notification</span>
            <button
              type="button"
              onClick={() => setNewAlert(null)}
              className="rounded px-1 text-xs text-indigo-100 hover:bg-white/10"
              aria-label="Dismiss notification alert"
            >
              Close
            </button>
          </div>
          <div className="mt-1 text-indigo-100/90">{newAlert}</div>
        </div>
      )}
    </div>
  );
}
