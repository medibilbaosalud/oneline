import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, missingAuthEnv } from "@/lib/authOptions";

const nextAuthHandler = NextAuth(authOptions);

function missingEnvResponse() {
  return NextResponse.json(
    {
      error: "Missing GitHub OAuth configuration",
      missing: missingAuthEnv,
    },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  if (missingAuthEnv.length > 0) {
    return missingEnvResponse();
  }

  return nextAuthHandler(request);
}

export async function POST(request: Request) {
  if (missingAuthEnv.length > 0) {
    return missingEnvResponse();
  }

  return nextAuthHandler(request);
}
