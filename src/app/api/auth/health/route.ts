import { NextResponse } from "next/server";

import { getAuthDiagnostics, getRuntimeHost } from "@/lib/authOptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const diagnostics = getAuthDiagnostics();

  return NextResponse.json({
    ok: diagnostics.missing.length === 0,
    missing: diagnostics.missing,
    runtimeHost: getRuntimeHost(req),
    redirectProxyUrl: diagnostics.redirectProxyUrl,
  });
}
