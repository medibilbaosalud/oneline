import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { GoogleGenerativeAI } from "@google/generative-ai";

// asegura Node en funciones (Gemini SDK no va en edge)
export const runtime = "nodejs";
export const preferredRegion = ["fra1", "cdg1"];

// ---- Tipos y utilidades mínimas ----
type Options = {
  length: "short" | "medium" | "long";
  tone: "auto" | "calido" | "neutro" | "poetico" | "directo";
  pov: "auto" | "primera" | "tercera";
  includeHighlights: boolean;
  onlyPinned: boolean;
  pinnedWeight: 1 | 2 | 3;
  strict: boolean;
  userNotes?: string;
};

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
  if (feedChars < 400) return [150, 300] as const;
  if (feedChars < 900) return [250, 450] as const;
  if (feedChars < 1600) return [400, Math.min(700, base[1])] as const;
  return base;
}

function buildPrompt(feed: string, from: string, to: string, opt: Options, feedChars: number) {
  const [minW, maxW] = adaptRangeByData(desiredWordRange(opt.length), feedChars);

  const toneLine =
    opt.tone === "auto"
      ? "Imita con moderación el tono predominante de las entradas."
      : `Tono: ${toneText(opt.tone)}`;

  const povLine =
    opt.pov === "auto"
      ? "Usa PRIMERA persona si las entradas lo sugieren; si no, TERCERA cercana."
      : `Voz: ${povText(opt.pov)}`;

  const reglas = `
REGLAS DE FIDELIDAD:
- No inventes hechos, personas o lugares no presentes en las entradas.
- Evita inferencias estacionales/temporales salvo mención explícita.
- Si hay pocos datos, prima concisión y fidelidad.
- Da ${opt.pinnedWeight}x de peso a las líneas marcadas con ★.`.trim();

  const notas = opt.userNotes?.trim()
    ? `\nNOTAS DEL USUARIO (si no contradicen las reglas):\n${opt.userNotes.trim()}\n`
    : "";

  return `
Rol: Biógrafo cuidadoso. Escribe en español.

Objetivo: redacta una HISTORIA continua del periodo ${from}–${to} basada SOLO en las entradas.

${toneLine}
${povLine}
Longitud: ${minW}–${maxW} palabras. Empieza directo al primer párrafo.

${reglas}
${notas}

ENTRADAS (YYYY-MM-DD [slot][★ si pinned] texto):
${feed}

SALIDA:
- SOLO Markdown.
- Párrafos coherentes y fieles al texto dado.
- ${opt.includeHighlights ? "Al final añade **Destellos del periodo (10 puntos)**." : "No añadas listas al final."}
- Cierra con **Si pudiera decirle algo a mi yo de enero…** (máx. 3–4 líneas).
`.trim();
}

// ---- Handler principal ----
export async function GET(req: Request) {
  const url = new URL(req.url);
  const nowY = new Date().getFullYear();
  const from = url.searchParams.get("from") || `${nowY}-01-01`;
  const to   = url.searchParams.get("to")   || `${nowY}-12-31`;

  const opt: Options = {
    length: (url.searchParams.get("length") as Options["length"]) || "medium",
    tone: (url.searchParams.get("tone") as Options["tone"]) || "auto",
    pov: (url.searchParams.get("pov") as Options["pov"]) || "auto",
    includeHighlights: url.searchParams.get("highlights") !== "false",
    onlyPinned: url.searchParams.get("onlyPinned") === "true",
    pinnedWeight: (Number(url.searchParams.get("pinnedWeight")) as 1|2|3) || 2,
    strict: url.searchParams.get("strict") !== "false",
    userNotes: url.searchParams.get("notes") || undefined,
  };

  // Auth
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Datos
  let q = supabase
    .from("entries")
    .select("entry_date,slot,content,is_pinned")
    .eq("user_id", user.id)
    .gte("entry_date", from)
    .lte("entry_date", to)
    .order("entry_date", { ascending: true })
    .order("slot", { ascending: true });
  if (opt.onlyPinned) q = q.eq("is_pinned", true);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No hay entradas en ese rango." }, { status: 400 });
  }

  const feed = data.map(e => `${e.entry_date} [${e.slot}]${e.is_pinned ? "★" : ""} ${e.content}`).join("\n");
  const prompt = buildPrompt(feed, from, to, opt, feed.length);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const resp = await model.generateContent(prompt);
  const story = (resp.response.text() ?? "").trim();

  return NextResponse.json({
    from, to, options: opt,
    words: story ? story.split(/\s+/).length : 0,
    story,
  });
}
