// src/app/api/feedback/route.ts
import { NextResponse } from "next/server";
import { Buffer } from "buffer";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const FeedbackPayload = z.object({
  type: z.enum(["bug", "suggestion", "other"]),
  message: z.string().trim().min(6, "Please share a bit more detail."),
  page: z.string().trim().optional(),
});

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5MB per file

type Attachment = {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
};

async function buildAttachments(files: File[]): Promise<Attachment[]> {
  if (files.length > MAX_ATTACHMENTS) {
    throw new Error(`Up to ${MAX_ATTACHMENTS} attachments are allowed.`);
  }

  const attachments: Attachment[] = [];
  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      throw new Error(`Each attachment must be ${Math.floor(MAX_ATTACHMENT_SIZE / (1024 * 1024))}MB or smaller.`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const contentType = file.type || "application/octet-stream";

    attachments.push({
      name: file.name || "attachment",
      size: file.size,
      type: contentType,
      dataUrl: `data:${contentType};base64,${base64}`,
    });
  }

  return attachments;
}

type ParsedPayload =
  | { status: "ok"; data: z.infer<typeof FeedbackPayload>; attachments: Attachment[] }
  | { status: "validation_error"; error: z.ZodError }
  | { status: "attachment_error"; attachmentError: string };

async function parsePayload(req: Request): Promise<ParsedPayload> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const type = formData.get("type");
    const message = formData.get("message");
    const page = formData.get("page");
    const attachments = formData
      .getAll("attachments")
      .filter((item): item is File => item instanceof File && item.size > 0);

    const parsed = FeedbackPayload.safeParse({ type, message, page });
    if (!parsed.success) {
      return { status: "validation_error", error: parsed.error } as const;
    }

    try {
      const builtAttachments = await buildAttachments(attachments);
      return { status: "ok", data: parsed.data, attachments: builtAttachments } as const;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid attachment.";
      return { status: "attachment_error", attachmentError: message } as const;
    }
  }

  const body = await req.json().catch(() => null);
  const parsed = FeedbackPayload.safeParse(body);
  if (!parsed.success) {
    return { status: "validation_error", error: parsed.error } as const;
  }

  return { status: "ok", data: parsed.data, attachments: [] } as const;
}

export async function POST(req: Request) {
  try {
    const parsed = await parsePayload(req);

    if (parsed.status === "attachment_error") {
      return NextResponse.json(
        {
          error: "invalid_attachment",
          message: parsed.attachmentError,
        },
        { status: 400 },
      );
    }

    if (parsed.status === "validation_error") {
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

    const { data, attachments } = parsed;
    const { type, message, page } = data;

    const metadata = attachments.length > 0 ? { attachments } : null;

    const { error } = await supabase.from("user_feedback").insert({
      user_id: user?.id ?? null,
      type,
      message: message.trim(),
      page: page?.trim() || null,
      metadata,
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

export async function OPTIONS() {
  // Allow preflight requests to succeed for authenticated and anonymous users.
  return NextResponse.json({}, { status: 200 });
}
