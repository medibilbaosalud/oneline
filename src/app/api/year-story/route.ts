import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Asegura Node (Gemini SDK no es Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // evitar caché en Vercel

// ------------------ Opciones ------------------
type Options = {
  length: "short" | "medium" | "long";
  tone: "auto" | "calido" | "neutro" | "poetico" | "directo";
  pov: "auto" | "primera" | "tercera";
  includeHighlights: boolean;
  userNotes?: string;
};

// ------------------ Helpers de prompt ------------------
function toneText(t: Exclude<Options["tone"], "auto">) {
  return t === "poetico" ? "poético y visual (sin florituras)" :
         t === "directo" ? "directo y claro (sin sonar frío)" :
         t === "calido"  ? "cálido y cercano" :
                           "neutral y limpio";
}
function povText(p: Exclude<Options["pov"], "auto">) {
  return p === "primera" ? "primera persona" : "tercera persona cercana";
}
function desiredWordRange(length: Options["length"]) {
  if (length === "short") return [400, 600] as const;
  if (length === "long")  return [1200, 1800] as const;
  return [700, 1000] as const;
}
function adaptRangeByData(base: readonly [number, number], feedChars: number) {
  if (feedChars < 400)  return [150, 300] as const;
  if (feedChars < 900)  return [250, 450] as const;
  if (feedChars < 1600) return [400, Math.min(700, base[1])] as const;
  return base;
}

function buildPrompt(
  feed: string,
  from: string,
  to: string,
  opt: Options,
  feedChars: number
) {
  const [minW, maxW] = adaptRangeByData(desiredWordRange(opt.length), feedChars);

  const toneLine =
    opt.tone === "auto"
      ? "Imita con moderación el tono predominante de las entradas."
      : `Tono: ${toneText(opt.tone)}`;

  const povLine =
    opt.pov === "auto"
      ? "Usa PRIMERA persona si las entradas lo sugieren; si no, TERCERA cercana."
      : `Voz: ${povText(opt.pov)}`;

  const notas = opt.userNotes?.trim()
    ? `\nNOTAS DEL USUARIO (si no contradicen las reglas):\n${opt.userNotes.trim()}\n`
    : "";

  return `
Rol: Biógrafo cuidadoso. Escribe en español.

Objetivo: redacta una HISTORIA continua del periodo ${from}–${to} basada SOLO en las entradas.

${toneLine}
${povLine}
Longitud: ${minW}–${maxW} palabras. Empieza directo al primer párrafo.

REGLAS:
- No inventes hechos, personas o lugares no presentes en las entradas.
- Evita suposiciones temporales salvo mención explícita.
- Si hay pocos datos, prima concisión y fidelidad.

${notas}

ENTRADAS (YYYY-MM-DD: texto):
${feed}

SALIDA:
- SOLO Markdown.
- Párrafos coherentes y fieles al texto dado.
- ${opt.includeHighlights ? "Al final añade **Destellos del periodo (10 puntos)**." : "No añadas listas al final."}
- Cierra con **Si pudiera decirle algo a mi yo de enero…** (máx. 3–4 líneas).
`.trim();
}

// ------------------ Handler ------------------
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const nowY = new Date().getFullYear();
    const from = url.searchParams.get("from") || `${nowY}-01-01`;
    const to   = url.searchParams.get("to")   || `${nowY}-12-31`;

    const opt: Options = {
      length: (url.searchParams.get("length") as Options["length"]) || "medium",
      tone: (url.searchParams.get("tone") as Options["tone"]) || "auto",
      pov: (url.searchParams.get("pov") as Options["pov"]) || "auto",
      includeHighlights: url.searchParams.get("highlights") !== "false",
      userNotes: url.searchParams.get("notes") || undefined,
    };

    // Auth
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    // Datos desde journal
    const { data, error } = await supabase
      .from("journal")
      .select("day, content")
      .eq("user_id", user.id)
      .gte("day", from)
      .lte("day", to)
      .order("day", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "No entries in that range." }, { status: 400 });
    }

    const feed = data
      .map((e) => `${e.day}: ${e.content ?? ""}`)
      .join("\n")
      .trim();

    const apiKey = process.env.GEMINI_API_KEY;

    // Si no hay API key, devolvemos un texto base para no romper el cliente
    if (!apiKey) {
      const fallback =
        (data ?? [])
          .map((d) => `• ${d.day}: ${d.content?.slice(0, 200) ?? ""}`)
          .join("\n") || "No entries found.";
      return NextResponse.json({ story: fallback });
    }

    // Gemini
    const prompt = buildPrompt(feed, from, to, opt, feed.length);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const resp = await model.generateContent(prompt);
    const story = (resp.response.text() ?? "").trim();

    if (!story) {
      // Respuesta vacía desde el modelo; no rompas al cliente.
      const fallback =
        (data ?? [])
          .map((d) => `• ${d.day}: ${d.content?.slice(0, 200) ?? ""}`)
          .join("\n") || "No entries found.";
      return NextResponse.json({ story: fallback, warn: "Empty model response, used fallback." });
    }

    return NextResponse.json({ story });
  } catch (e: any) {
    // Asegura SIEMPRE JSON
    return NextResponse.json(
      { error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}
