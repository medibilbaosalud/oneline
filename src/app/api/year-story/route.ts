import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { GoogleGenAI } from "@google/genai";



export const runtime = "nodejs";
export const preferredRegion = ["fra1", "cdg1"];

/** Opciones del generador */
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
  return t === "poetico"
    ? "poético, sensible y visual (sin florituras excesivas)"
    : t === "directo"
    ? "directo y claro (sin sonar frío)"
    : t === "calido"
    ? "cálido y cercano"
    : "neutral y limpio";
}

function povText(p: Exclude<Options["pov"], "auto">) {
  return p === "primera" ? "primera persona" : "tercera persona cercana";
}

function desiredWordRange(length: Options["length"]) {
  switch (length) {
    case "short":
      return [400, 600] as const;
    case "long":
      return [1200, 1800] as const;
    default:
      return [700, 1000] as const;
  }
}

function adaptRangeByData(base: readonly [number, number], feedChars: number) {
  if (feedChars < 400) return [150, 300] as const;
  if (feedChars < 900) return [250, 450] as const;
  if (feedChars < 1600) return [400, Math.min(700, base[1])] as const;
  return base;
}

function maxTokensForRange([, maxW]: readonly [number, number]) {
  // 1 palabra ~ 1.25 tokens aprox. + margen
  return Math.round(maxW * 1.35);
}

function buildPrompt(
  feed: string,
  from: string,
  to: string,
  opt: Options,
  feedChars: number
) {
  const baseRange = desiredWordRange(opt.length);
  const finalRange = adaptRangeByData(baseRange, feedChars);
  const [minW, maxW] = finalRange;

  const toneLine =
    opt.tone === "auto"
      ? "Imita con moderación el TONO predominante de las entradas (registro, energía, vocabulario, coloquialismos, emojis). Si varía entre días, elige un término medio natural."
      : `Tono: ${toneText(opt.tone)}`;

  const povLine =
    opt.pov === "auto"
      ? "Escribe en PRIMERA persona si las entradas mayoritariamente están en primera; en caso contrario usa TERCERA cercana."
      : `Voz: ${povText(opt.pov)}`;

  const reglasEstrictas = `
REGLAS DE FIDELIDAD (obligatorias):
- NO inventes hechos, motivaciones, personas o lugares no presentes en las entradas.
- Evita inferencias temporales/estacionales (“rutina”, “otoño”, etc.) salvo que se mencionen explícitas.
- Si los datos son escasos, prioriza concisión y fidelidad sobre longitud.
- Usa *micro-citas* en cursiva con fragmentos EXACTOS cuando aporten color.
- Da ${opt.pinnedWeight}x de peso a las líneas marcadas con ★.
- Cada párrafo debe apoyarse en uno o varios hechos del feed (evita afirmaciones sin base).`.trim();

  const notasUsuario = opt.userNotes?.trim()
    ? `\nNOTAS DEL USUARIO (si no contradicen las reglas):\n${opt.userNotes.trim()}\n`
    : "";

  return `
Rol: Eres un biógrafo cuidadoso. Escribe en español.

Objetivo: Redacta una HISTORIA continua del periodo ${from}–${to} basada SOLO en las entradas.

${toneLine}
${povLine}
Longitud objetivo: ${minW}–${maxW} palabras.
Comienzo: entra directo al primer párrafo (sin “Aquí tienes…”, ni meta-comentarios).

${reglasEstrictas}
${notasUsuario}

ENTRADAS (orden cronológico, YYYY-MM-DD [slot][★ si pinned] texto):
${feed}

SALIDA:
- SOLO Markdown (sin encabezados genéricos).
- Cuerpo: párrafos coherentes y FIELES al texto dado.
- ${opt.includeHighlights ? "Al final añade **Destellos del periodo (10 puntos)** con puntos muy breves, fieles al feed." : "No añadas listas al final."}
- Cierra con **Si pudiera decirle algo a mi yo de enero…** (máx. 3–4 líneas).`.trim();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const nowY = new Date().getFullYear();
  const from = url.searchParams.get("from") || `${nowY}-01-01`;
  const to = url.searchParams.get("to") || `${nowY}-12-31`;

  const opt: Options = {
    length: (url.searchParams.get("length") as Options["length"]) || "medium",
    tone: (url.searchParams.get("tone") as Options["tone"]) || "auto",
    pov: (url.searchParams.get("pov") as Options["pov"]) || "auto",
    includeHighlights: url.searchParams.get("highlights") !== "false",
    onlyPinned: url.searchParams.get("onlyPinned") === "true",
    pinnedWeight:
      (Number(url.searchParams.get("pinnedWeight")) as 1 | 2 | 3) || 2,
    strict: url.searchParams.get("strict") !== "false",
    userNotes: url.searchParams.get("notes") || undefined,
  };

  // Auth
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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
    return NextResponse.json(
      { error: "No hay entradas en ese rango." },
      { status: 400 }
    );
  }

  const feed = data
    .map(
      (e) =>
        `${e.entry_date} [${e.slot}]${e.is_pinned ? "★" : ""} ${e.content}`
    )
    .join("\n");
  const feedChars = feed.length;

  const prompt = buildPrompt(feed, from, to, opt, feedChars);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY" },
      { status: 500 }
    );

  // IA (SDK @google/genai)
  const ai = new GoogleGenAI({ apiKey });

  const baseRange = desiredWordRange(opt.length);
  const finalRange = adaptRangeByData(baseRange, feedChars);
  const maxOutputTokens = maxTokensForRange(finalRange);

  const temperature = opt.strict
    ? 0.25
    : opt.tone === "poetico"
    ? 0.9
    : opt.tone === "directo"
    ? 0.5
    : 0.65;

const resp = await ai.responses.generate({
  model: "gemini-2.5-flash-lite",
  input: prompt,
  config: { temperature, maxOutputTokens }, // 👈 no 'generationConfig'
});
const story = (resp.output_text ?? "").trim();

  return NextResponse.json({
    from,
    to,
    options: opt,
    words: story ? story.split(/\s+/).length : 0,
    story,
  });
}
