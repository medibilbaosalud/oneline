import { NextResponse } from "next/server";
import { supabaseRouteHandler } from "@/lib/supabaseRouteHandler";

import {
  ENTRY_LIMIT_BASE,
  GUIDANCE_NOTES_LIMIT_BASE,
  coerceSummaryPreferences,
  entryLimitFor,
  guidanceLimitFor,
} from "@/lib/summaryPreferences";

type LimitsPayload = {
  entryLimit: number;
  guidanceLimit: number;
  extendedGuidance: boolean;
};

function defaults(): LimitsPayload {
  return {
    entryLimit: ENTRY_LIMIT_BASE,
    guidanceLimit: GUIDANCE_NOTES_LIMIT_BASE,
    extendedGuidance: false,
  };
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await supabaseRouteHandler();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[profile-limits] auth_error", authError);
    }

    if (!user) {
      return NextResponse.json(defaults(), { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_vaults")
      .select("summary_preferences")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[profile-limits] fetch_error", error);
      return NextResponse.json(defaults(), { status: 500 });
    }

    if (!data?.summary_preferences) {
      return NextResponse.json(defaults());
    }

    const preferences = coerceSummaryPreferences(data.summary_preferences);
    const extended = !!preferences.extendedGuidance;

    return NextResponse.json({
      entryLimit: entryLimitFor(extended),
      guidanceLimit: guidanceLimitFor(extended),
      extendedGuidance: extended,
    });
  } catch (error) {
    console.error("[profile-limits] unexpected", error);
    return NextResponse.json(defaults(), { status: 500 });
  }
}
