import { GoogleGenerativeAI } from '@google/generative-ai';

import type { SummaryMode } from './summaryUsageDaily';
import type { SummaryLanguage } from './summaryPreferences';

export type YearStoryOptions = {
  length: 'short' | 'medium' | 'long';
  tone: 'auto' | 'warm' | 'neutral' | 'poetic' | 'direct';
  pov: 'auto' | 'first' | 'third';
  includeHighlights: boolean;
  pinnedWeight: 1 | 2 | 3;
  strict: boolean;
  userNotes?: string;
  language: SummaryLanguage;
};

export type YearStoryEntry = {
  content: string;
  created_at?: string | null;
  day?: string | null;
  starred?: boolean | null;
};

function toneDescriptor(tone: Exclude<YearStoryOptions['tone'], 'auto'>) {
  switch (tone) {
    case 'warm':
      return 'warm and welcoming without sounding overly sentimental';
    case 'neutral':
      return 'neutral, composed and reader-friendly';
    case 'poetic':
      return 'poetic and visual while staying grounded';
    case 'direct':
      return 'direct, clear and confident';
    default:
      return tone satisfies never ? tone : 'neutral';
  }
}

function povDescriptor(pov: Exclude<YearStoryOptions['pov'], 'auto'>) {
  return pov === 'first' ? 'first person' : 'close third person';
}

function desiredWordRange(length: YearStoryOptions['length']) {
  if (length === 'short') return [400, 600] as const;
  if (length === 'long') return [1200, 1800] as const;
  return [700, 1000] as const;
}

function inferPeriodFromRange(from: string, to: string): 'weekly' | 'monthly' | 'yearly' {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 'yearly';
  const diffDays = Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)));
  if (diffDays <= 10) return 'weekly';
  if (diffDays <= 62) return 'monthly';
  return 'yearly';
}

function adaptRangeByPeriod(base: readonly [number, number], period: 'weekly' | 'monthly' | 'yearly') {
  if (period === 'weekly') {
    return [Math.max(150, Math.round(base[0] * 0.35)), Math.round(base[1] * 0.55)] as const;
  }
  if (period === 'monthly') {
    return [Math.max(250, Math.round(base[0] * 0.6)), Math.round(base[1] * 0.8)] as const;
  }
  return base;
}

function adaptRangeByData(base: readonly [number, number], feedChars: number) {
  if (feedChars < 400) return [150, 300] as const;
  if (feedChars < 900) return [250, 450] as const;
  if (feedChars < 1600) return [400, Math.min(700, base[1])] as const;
  return base;
}

export function ymd(date: string | Date) {
  const iso = typeof date === 'string' ? date : new Date(date).toISOString();
  return iso.slice(0, 10);
}

export function entriesToFeed(entries: YearStoryEntry[]) {
  return entries
    .map((entry) => {
      const date = ymd(entry.day ?? entry.created_at ?? new Date().toISOString());
      const star = entry.starred ? '★ ' : '';
      return `${date} ${star}${entry.content}`;
    })
    .join('\n');
}

export function buildYearStoryPrompt(
  feed: string,
  from: string,
  to: string,
  options: YearStoryOptions,
  feedChars: number,
) {
  const period = inferPeriodFromRange(from, to);
  const [minWords, maxWords] = adaptRangeByData(
    adaptRangeByPeriod(desiredWordRange(options.length), period),
    feedChars,
  );

  const toneLine =
    options.tone === 'auto'
      ? 'Mirror the dominant tone in the entries without exaggerating it.'
      : `Tone: ${toneDescriptor(options.tone)}.`;

  const povLine =
    options.pov === 'auto'
      ? 'Default to FIRST person if the entries are written that way; otherwise use a close THIRD person.'
      : `Point of view: ${povDescriptor(options.pov)}.`;

  const languageName = (() => {
    switch (options.language) {
      case 'es':
        return 'Spanish';
      case 'de':
        return 'German';
      case 'fr':
        return 'French';
      default:
        return 'English';
    }
  })();

  const languageLine = `Write the entire story in ${languageName}, matching the author's language. If the entries use a different language or mix languages, mirror that exact wording and keep multilingual phrases exactly as written. Never translate or normalize the user's words into another language.`;

  const fidelityRules = `
FIDELITY RULES:
- Do not invent events, people or places that are not explicitly present in the entries.
- Avoid seasonal assumptions unless the entries make them explicit.
- If the data is sparse, keep the story concise and faithful.
- Give ${options.pinnedWeight}x weight to lines marked with ★ (if any).
${options.strict ? '- Treat every detail literally; no embellishments beyond clarity.' : ''}
`.trim();

  const userNotes = options.userNotes?.trim()
    ? `\nNOTES FROM THE USER (only if they do not violate the rules):\n${options.userNotes.trim()}\n`
    : '';

  // Prompt designed for a continuous narrative that keeps chronology but reads like one story.
  return `
Eres un escritor experto en narrativa personal y diarios.
Recibirás una lista de entradas de diario ordenadas cronológicamente, cada una con fecha y texto.
Tu tarea es transformarlas en UNA SOLA HISTORIA CONTINUA, escrita en primera persona, con tono íntimo y natural.

Instrucciones clave:
- No hagas un resumen día por día.
- No pongas títulos ni encabezados por fecha.
- No uses listas ni viñetas en el relato principal.
- Escribe todo como si fuera un relato continuo de mi vida durante ese período, siguiendo un hilo narrativo claro.
- Mantén el orden temporal de los acontecimientos, pero exprésalos como recuerdos encadenados: inicio del periodo, desarrollo, momentos clave y cierre.
- Integra las fechas solo de forma aproximada si es necesario (por ejemplo, "unos días después", "al principio del trimestre", "más adelante ese mes"), pero no como formato de diario con "- 2025-11-22".
- No inventes hechos que no aparezcan en las entradas, pero sí puedes hacer inferencias suaves sobre emociones, aprendizajes o cambios (por ejemplo, cómo ha ido evolucionando mi estado de ánimo o mis relaciones).
- Usa el mismo idioma predominante que aparece en las entradas originales: ${languageLine}
- ${toneLine}
- ${povLine}
- ${fidelityRules}
${userNotes}

Narrativa:
- Cuenta la historia como un solo capítulo sin saltos bruscos ni secciones por día.
- Target length: ${minWords}–${maxWords} words. Comienza directo con el relato.
- Preserva términos no ingleses tal cual aparezcan.

Finaliza el resultado con:
- Una sección breve **Highlights** con 5–8 viñetas que recojan logros, retos o momentos clave.
- Un cierre titulado **If I could tell my future self one thing…** con 3–4 líneas en el mismo idioma del relato.

Aquí tienes mis entradas de diario. Convierte TODO el contenido en una única narrativa continua:

${feed}
`.trim();
}

type StoryModelConfig = {
  mode: SummaryMode;
  modelName: string;
  maxOutputTokens: number;
};

async function loadGenerativeModel(config: StoryModelConfig) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelNames = config.mode === 'advanced'
    ? ['gemini-2.5-pro']
    : ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

  for (const name of modelNames) {
    try {
      return genAI.getGenerativeModel({ model: name });
    } catch {
      // try next model name
    }
  }
  throw new Error('No Gemini model available for generateContent()');
}

export async function generateYearStory(
  entries: YearStoryEntry[],
  from: string,
  to: string,
  options: YearStoryOptions,
  modelConfig?: Partial<StoryModelConfig>,
) {
  const feed = entriesToFeed(entries);
  const prompt = buildYearStoryPrompt(feed, from, to, options, feed.length);

  try {
    const model = await loadGenerativeModel({
      mode: modelConfig?.mode ?? 'standard',
      modelName: modelConfig?.modelName ?? 'gemini-2.5-flash',
      maxOutputTokens: modelConfig?.maxOutputTokens ?? 1024,
    });
    if (!model) {
      const combined = entries
        .map((entry) => `[${ymd(entry.day ?? entry.created_at ?? new Date())}] ${entry.content}`)
        .join(' ');
      const excerpt = combined.length > 1500 ? `${combined.slice(0, 1500)}…` : combined;
      return {
        story: `### Your ${from.slice(0, 4)} in review\n\n${excerpt}\n\n---\n*Add GEMINI_API_KEY to unlock rich narratives.*`,
        wordCount: excerpt.split(/\s+/).length,
        tokenUsage: { totalTokenCount: 0 },
      };
    }

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }], }],
      generationConfig: {
        maxOutputTokens: modelConfig?.maxOutputTokens ?? 1024,
      },
    });
    const story = (response?.response?.text?.() ?? '').trim();
    if (!story) {
      return {
        story: feed.replace(/^(?=\S)/gm, '- '),
        wordCount: feed.split(/\s+/).length,
        tokenUsage: { totalTokenCount: 0 },
      };
    }

    return {
      story,
      wordCount: story.split(/\s+/).length,
      tokenUsage: response?.response?.usageMetadata ?? { totalTokenCount: 0 },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate year story';
    throw new Error(message);
  }
}

export function coerceTone(value: string | null): YearStoryOptions['tone'] {
  if (!value) return 'auto';
  if (value === 'calido') return 'warm';
  if (value === 'neutro') return 'neutral';
  if (value === 'poetico') return 'poetic';
  if (value === 'directo') return 'direct';
  if (['warm', 'neutral', 'poetic', 'direct'].includes(value)) return value as YearStoryOptions['tone'];
  return 'auto';
}

export function coercePov(value: string | null): YearStoryOptions['pov'] {
  if (!value) return 'auto';
  if (value === 'primera') return 'first';
  if (value === 'tercera') return 'third';
  if (['first', 'third'].includes(value)) return value as YearStoryOptions['pov'];
  return 'auto';
}

