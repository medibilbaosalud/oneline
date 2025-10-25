import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  DEFAULT_SUMMARY_PREFERENCES,
  coerceSummaryPreferences,
  computeSummaryReminder,
  isSummaryFrequency,
  withSummaryLength,
  type SummaryFrequency,
  type SummaryPreferences,
} from "@/lib/summaryPreferences";
import type { JournalDigestFreq, JournalStoryLength } from "@/types/journal";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const TABLE = "user_vaults";

type RawSettingsRow = {
  frequency: JournalDigestFreq | null;
  digest_frequency: JournalDigestFreq | null;
  story_length: JournalStoryLength | null;
  summary_preferences: unknown;
  last_summary_at: string | null;
};

type GenericClient = SupabaseClient<any>;

function trySupabaseAdmin(): GenericClient | null {
  try {
    return supabaseAdmin() as GenericClient;
  } catch (err) {
    console.error("[settings] admin client unavailable", err);
    return null;
  }
}

async function resolveSettings(client: GenericClient, userId: string) {
  const { data, error } = await client
    .from(TABLE)
    .select("frequency, digest_frequency, story_length, summary_preferences, last_summary_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "settings_fetch_failed");
  }

  const row = (data ?? null) as RawSettingsRow | null;
  const hasRow = !!row;

  const frequencySource = row?.digest_frequency ?? row?.frequency;
  const frequency: SummaryFrequency = isSummaryFrequency(frequencySource)
    ? frequencySource
    : "weekly";

  const basePreferences = row?.summary_preferences
    ? coerceSummaryPreferences(row.summary_preferences)
    : { ...DEFAULT_SUMMARY_PREFERENCES };

  const summaryPreferences = withSummaryLength(
    basePreferences,
    row?.story_length ?? basePreferences.length,
  );

  return {
    frequency,
    summaryPreferences,
    lastSummaryAt: row?.last_summary_at ?? null,
    hasRow,
  };
}

function extractBearer(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim() || null;
  }
  return authHeader.trim() || null;
}

function extractRefresh(headerValue: string | null): string | null {
  if (!headerValue) return null;
  return headerValue.trim() || null;
}

async function getClientAndUser(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  const bearer = extractBearer(req.headers.get("authorization"));
  const refresh = extractRefresh(req.headers.get("x-supabase-refresh"));
  const adminClient = bearer ? trySupabaseAdmin() : null;

  if (bearer && refresh) {
    try {
      await supabase.auth.setSession({ access_token: bearer, refresh_token: refresh });
    } catch (err) {
      console.error("[settings] setSession fallback failed", err);
    }
  }

  const {
    data: { user },
    error,
  } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();

  if (error) {
    console.error("[settings] getUser error", error);
  }

  if (user) {
    const client = adminClient ?? (supabase as GenericClient);
    return { client, user } as const;
  }

  if (bearer) {
    try {
      const admin = adminClient ?? trySupabaseAdmin();
      if (!admin) {
        return { client: supabase as GenericClient, user: null } as const;
      }
      const { data, error: adminError } = await admin.auth.getUser(bearer);
      if (adminError) {
        console.error("[settings] admin auth error", adminError);
      } else if (data?.user) {
        return { client: admin as GenericClient, user: data.user } as const;
      }
    } catch (err) {
      console.error("[settings] admin auth thrown", err);
    }
  }

  return { client: supabase as GenericClient, user: null } as const;
}

export async function GET(req: Request) {
  const { client, user } = await getClientAndUser(req);

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  try {
    const settings = await resolveSettings(client, user.id);
    const reminder = computeSummaryReminder(settings.frequency, settings.lastSummaryAt);

    return NextResponse.json({
      ok: true,
      settings: {
        frequency: settings.frequency,
        storyPreferences: settings.summaryPreferences,
        lastSummaryAt: settings.lastSummaryAt,
        reminder,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "settings_fetch_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

type UpdatePayload = {
  frequency?: SummaryFrequency;
  storyPreferences?: Partial<SummaryPreferences> | null;
};

export async function PUT(req: Request) {
  const body = (await req.json().catch(() => null)) as UpdatePayload | null;

  if (!body || (!body.frequency && !body.storyPreferences)) {
    return NextResponse.json({ ok: false, error: "no_changes" }, { status: 400 });
  }

  if (body.frequency && !isSummaryFrequency(body.frequency)) {
    return NextResponse.json({ ok: false, error: "invalid_frequency" }, { status: 400 });
  }

  const { client, user } = await getClientAndUser(req);

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  try {
    const current = await resolveSettings(client, user.id);

    if (!current.hasRow) {
      return NextResponse.json({ ok: false, error: "vault_missing" }, { status: 404 });
    }

    const nextFrequency = body.frequency ?? current.frequency;
    const nextPreferences = body.storyPreferences
      ? coerceSummaryPreferences(body.storyPreferences)
      : current.summaryPreferences;
    const nextStoryLength: JournalStoryLength = nextPreferences.length;

    const { data, error } = await client
      .from(TABLE)
      .update({
        frequency: nextFrequency,
        digest_frequency: nextFrequency,
        story_length: nextStoryLength,
        summary_preferences: nextPreferences,
      })
      .eq("user_id", user.id)
      .select("frequency, digest_frequency, story_length, summary_preferences, last_summary_at")
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "settings_update_failed");
    }

    if (!data) {
      throw new Error("settings_update_missing_row");
    }

    const row = data as RawSettingsRow;

    const frequencySource = row.digest_frequency ?? row.frequency;
    const savedFrequency = isSummaryFrequency(frequencySource) ? frequencySource : nextFrequency;
    const savedPreferencesBase = row.summary_preferences
      ? coerceSummaryPreferences(row.summary_preferences)
      : nextPreferences;
    const savedPreferences = withSummaryLength(
      savedPreferencesBase,
      row.story_length ?? nextStoryLength,
    );

    const reminder = computeSummaryReminder(
      savedFrequency,
      row.last_summary_at ?? current.lastSummaryAt,
    );

    return NextResponse.json({
      ok: true,
      settings: {
        frequency: savedFrequency,
        storyPreferences: savedPreferences,
        lastSummaryAt: row.last_summary_at ?? current.lastSummaryAt,
        reminder,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "settings_update_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
