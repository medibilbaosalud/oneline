import { NextResponse } from "next/server";
// importa tus helpers reales para generar weekly/monthly/yearly
// import { generateWeekly, generateMonthly, generateYearly } from "@/lib/summaries";

export async function GET() {
  const now = new Date();
  const day = now.getUTCDay();      // 1 = lunes
  const date = now.getUTCDate();    // 1..31
  const month = now.getUTCMonth();  // 0..11  (0 = enero)

  // Lógica de ejemplo:
  const jobs: string[] = [];

  // Lunes: weekly
  if (day === 1) {
    // await generateWeekly();
    jobs.push("weekly");
  }

  // Día 1: monthly
  if (date === 1) {
    // await generateMonthly();
    jobs.push("monthly");
  }

  // 1 de enero: yearly
  if (date === 1 && month === 0) {
    // await generateYearly();
    jobs.push("yearly");
  }

  return NextResponse.json({ ok: true, ran: jobs });
}
