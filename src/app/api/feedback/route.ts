// src/app/api/feedback/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const FeedbackPayload = z.object({
  type: z.enum(["bug", "suggestion", "other"]),
  message: z.string().trim().min(6, "Please share a bit more detail."),
  page: z.string().trim().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = FeedbackPayload.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "invalid_payload",
          message: "Choose a feedback type and add a few more details before sending.",
        },
        { status: 400 },
      );
    }

    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { type, message, page } = parsed.data;

    const { error } = await supabase.from("user_feedback").insert({
      user_id: user?.id ?? null,
      type,
      message: message.trim(),
      page: page?.trim() || null,
    });

    if (error) {
      return NextResponse.json(
        {
          error: "insert_failed",
          message: "We couldn’t save your feedback right now. Please try again.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "server_error",
        message: "Unable to submit feedback at the moment. Please try again.",
      },
      { status: 500 },
    );
  }
}
