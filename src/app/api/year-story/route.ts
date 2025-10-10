import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = ["fra1", "cdg1"];

// ---- Tipos y utilidades mínimas ----
type Options = {
  length: "short" | "medium" | "long";
  tone: "auto" | "calido" | "neutro" | "poetico" | "directo";
  pov: "auto" | "primera" | "tercera";
  includeHighlights: boolean;
  onlyPinned: boolean;        // ignorado con tu schema actual
  pinnedWeight: 1 | 2 | 3;
  strict: boolean;
  userNotes?: string;
};

function toneText(t: Exclude<Options["tone"], "auto">) {
  return t === "poetico" ? "poético y visual (sin florituras)"
       : t === "directo" ? "directo y claro (sin sonar frío)"
       : t === "calido"  ? "cálido y cercano"
       :                   "neutral y limpio";
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
function ymd(d: string | Date) {
  const iso = typeof d === "string" ? d : new Date(d).toISOString();
  return iso.slice(0, 10); // YYYY-MM-DD
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
- Da ${opt.pinnedWeight}x de peso a las líneas marcadas con ★ (si hubiera).`.trim();

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

ENTRADAS (YYYY-MM-DD texto):
${feed}

SALIDA:
- SOLO Markdown.
- Párrafos coherentes y fieles al texto dado.
- ${opt.includeHighlights ? "Al final añade **Destellos del periodo (10 puntos)**." : "No añadas listas al final."}
- Cierra con **Si pudiera decirle algo a mi yo de enero…** (máx. 3–4 líneas).
`.trim();
}

async function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  return new GoogleGenerativeAI(apiKey);
}

async function getModel(genAI: any) {
  // Prueba varios nombres estables
  const names = [
    "gemini-2.5-flash",
  ];
  for (const name of names) {
    try {
      const m = genAI.getGenerativeModel({ model: name });
      // validación ultraligera
      await m.generateContent("ok");
      return m;
    } catch {}
  }
  throw new Error("No Gemini model available for generateContent()");
}

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

  // Datos de tu tabla journal
  const fromIso = `${from}T00:00:00.000Z`;
  const toIso   = `${to}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from("journal")
    .select("content, created_at")
    .eq("user_id", user.id)
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "No hay entradas en ese rango." }, { status: 400 });
  }

  const feed = data.map(e => `${ymd(e.created_at)} ${e.content}`).join("\n");
  const prompt = buildPrompt(feed, from, to, opt, feed.length);

  try {
    let story = "";
    const genAI = await getGemini();

    if (genAI) {
      const model = await getModel(genAI);
      const resp = await model.generateContent(prompt);
      story = (resp?.response?.text?.() ?? "").trim();
      if (!story) {
        story = feed.replace(/^(?=\S)/gm, "- ");
      }
    } else {
      // Fallback sin API key
      const joined = data.map(d => `[${ymd(d.created_at)}] ${d.content}`).join(" ");
      const brief = joined.length > 1500 ? joined.slice(0, 1500) + "…" : joined;
      story =
        "### Tu historia del periodo\n\n" +
        brief +
        "\n\n---\n*Nota: añade GEMINI_API_KEY para una historia más pulida.*";
    }

    return NextResponse.json({
      from, to, options: opt,
      words: story ? story.split(/\s+/).length : 0,
      story,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "generation failed" }, { status: 500 });
  }
}
