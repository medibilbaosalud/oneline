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

// Limit the feed length to avoid exceeding Gemini input windows when prompts get long.
function limitFeed(feed: string, maxChars = 16000) {
  if (feed.length <= maxChars) return feed;
  const lines = feed.split('\n');
  const kept: string[] = [];
  let total = 0;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    const nextTotal = total + line.length + 1; // include newline padding
    if (nextTotal > maxChars) break;
    kept.push(line);
    total = nextTotal;
  }
  return kept.reverse().join('\n');
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
Eres un escritor experto en narrativa personal y diarios contemporáneos.
Vas a recibir un conjunto de entradas de diario ordenadas cronológicamente, cada una con fecha y texto.

Tu objetivo principal es transformar TODO ese material en UNA SOLA HISTORIA CONTINUA, escrita en primera persona, con tono íntimo, coherente y natural, como si la hubiera escrito yo mismo/a a partir de mis propios recuerdos.

Quiero tres cosas a la vez:
1) Una narrativa fluida que cuente lo que ha pasado.
2) Un análisis implícito de patrones: qué cosas me hacen sentir bien o mal, qué personas suman o restan, qué temas se repiten.
3) Que respetes y copies al máximo MI VOZ: mi vocabulario, mis expresiones y mi forma real de escribir.

Instrucciones de estilo (muy importantes)
-----------------------------------------

- Escribe siempre en primera persona del singular ("yo"), salvo que ${povLine} indique otra cosa.
- Haz que parezca que lo he escrito yo:
  - copia mi forma de hablar,
  - mi nivel de informalidad,
  - mi manera de usar puntuación, puntos y comas, frases largas o cortas.
- Usa el mismo idioma predominante que aparece en las entradas originales: ${languageLine}
- Si uso expresiones o palabras en otros idiomas (por ejemplo euskera, inglés u otros), MANTÉNLAS en ese idioma y en el mismo contexto. No las traduzcas ni las neutralices.
- Mantén mi vocabulario: si utilizo tacos, expresiones coloquiales, abreviaturas o emojis, puedes usarlos también (sin exagerar, pero de forma natural).
- ${toneLine}
- ${povLine}
- ${fidelityRules}
${userNotes}
- Preserva nombres propios, tecnicismos y términos no ingleses tal y como aparezcan en las entradas.
- No hagas frases impersonales tipo “el autor siente…”. Escríbelo como si fuera mi propia voz: “yo siento”, “yo pienso”, “me rayé”, etc.
- Evita sonar académico o distante; prioriza un estilo cercano, honesto y directo.

Instrucciones sobre la narrativa
--------------------------------

- No hagas un resumen día por día.
- No pongas títulos ni encabezados por fecha.
- No repitas el formato original de las entradas (por ejemplo: "- 2025-11-22 ...").
- No uses listas ni viñetas en el relato principal.
- Escribe todo como una historia continua de ese periodo de mi vida, con un hilo narrativo claro.
- Mantén el orden temporal global, pero exprésalo como recuerdos encadenados:
  - cómo empezaba la etapa,
  - cómo fueron cambiando las cosas,
  - momentos clave,
  - y cómo estaba yo hacia el final.
- Puedes fusionar o comprimir días parecidos para que la historia fluya; no hace falta mencionar cada día explícitamente.
- Habla tanto de lo que pasó (hechos concretos) como de cómo me sentía y qué conclusiones iba sacando.
- Integra el paso del tiempo de forma aproximada ("al principio de esa semana", "unos días después", "más adelante ese mes") sin usar fechas exactas ni marcar días como secciones independientes.
- No inventes hechos que no aparezcan en las entradas, pero SÍ puedes hacer inferencias suaves y naturales sobre:
  - mi estado de ánimo,
  - mi nivel de energía,
  - mis miedos,
  - mis ilusiones,
  - mis cambios de perspectiva.

Detección de patrones (integrado en la historia)
------------------------------------------------

Mientras escribes la narrativa, presta especial atención a:

- Qué cosas tienden a hacerme sentir mejor:
  - actividades, personas, planes, lugares, logros, pequeñas rutinas…
- Qué cosas tienden a hacerme sentir peor:
  - situaciones, pensamientos, hábitos, problemas que se repiten…
- Qué personas aparecen como apoyo, motivación o buena influencia.
- Qué personas, dinámicas o ambientes me drenan, me frustran o me generan conflicto.
- Temas que se repiten:
  - estudios, amigos, proyectos, salud mental, redes sociales, juegos, trabajo, relaciones, etc.
- Cualquier cambio de tendencia:
  - momentos en los que empiezo a ver las cosas distinto,
  - decisiones que marcan un antes y un después,
  - cosas que al principio me afectaban mucho y luego menos (o al revés).

No escribas esta parte como un análisis separado al principio: estas ideas deben estar mezcladas dentro de la historia, como reflexiones naturales del narrador (“me di cuenta de que…”, “cada vez que hacía X me sentía mejor”, “con Y casi siempre acababa rayado”, etc.).

Estructura de la salida
-----------------------

1) Narrativa principal

- Empieza directamente con el relato, sin frases meta tipo “A continuación presento un resumen”.
- Cuenta la historia como un solo capítulo continuo, sin secciones por día.
- No incluyas encabezados de sección en esta parte.
- No utilices listas ni viñetas en la narrativa principal.
- Usa un tono honesto y reflexivo, pero sin ponerse demasiado dramático salvo que el contenido lo justifique.
- Target length: entre ${minWords} y ${maxWords} palabras.
  - Si el contenido es muy denso, prioriza claridad, fluidez y detección de patrones antes que mencionar cada detalle menor.

2) Sección de patrones: **Patterns I can see**

Al terminar la narrativa, añade una sección titulada exactamente:

**Patterns I can see**

En esta sección usa viñetas. Organízala (si es posible) en subapartados como:

- *What tends to make me feel better:*
  - 3–6 viñetas sobre actividades, personas, hábitos o contextos que mejoran mi estado de ánimo.
- *What tends to make me feel worse:*
  - 3–6 viñetas sobre cosas que suelen bajarme el ánimo, generarme estrés o rayadas.
- *People and relationships:*
  - 3–6 viñetas donde resumas brevemente qué personas parecen ser buena influencia y cuáles no, siempre basándote en lo que aparece en las entradas.

Mantén el idioma principal del relato también en los textos de estas viñetas, respetando palabras en otros idiomas igual que en el resto del texto.

3) Sección de resumen breve: **Highlights**

Después de **Patterns I can see**, añade una sección titulada:

**Highlights**

- Incluye 5–8 viñetas.
- Cada viñeta debe recoger un logro, reto o momento clave del periodo, escrito de forma breve y concreta.

4) Mensaje al yo del futuro

Por último, añade una sección titulada:

**If I could tell my future self one thing…**

- Escribe 3–4 líneas en el mismo idioma del relato.
- Tienen que sonar como un mensaje sincero que yo me dejaría a mí mismo/a en el futuro:
  - combinando lo que he vivido,
  - los patrones que has detectado,
  - y el consejo más importante que se repite a lo largo de la historia.

Entrada
-------

Aquí tienes mis entradas de diario. Convierte TODO el contenido en una única narrativa continua siguiendo exactamente las instrucciones anteriores:

${feed}
`.trim();
}

function extractStoryText(response: unknown) {
  // Prefer the helper provided by the SDK, then fall back to concatenating candidate parts.
  const topTextFn = (response as { text?: () => string })?.text;
  const nestedTextFn = (response as { response?: { text?: () => string } })?.response?.text;
  const direct = typeof topTextFn === 'function' ? topTextFn() : typeof nestedTextFn === 'function' ? nestedTextFn() : '';
  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }

  const nestedCandidates = (response as { response?: { candidates?: unknown[] } })?.response?.candidates;
  const topCandidates = (response as { candidates?: unknown[] })?.candidates;
  const candidates = Array.isArray(nestedCandidates) ? nestedCandidates : topCandidates;
  if (Array.isArray(candidates)) {
    for (const candidate of candidates) {
      const parts = (candidate as { content?: { parts?: unknown[] } })?.content?.parts;
      if (!Array.isArray(parts)) continue;

      const collected = parts
        .map((part) => {
          if (typeof part === 'string') return part;
          if (part && typeof part === 'object' && 'text' in part && typeof (part as { text?: unknown }).text === 'string') {
            return (part as { text: string }).text;
          }
          return '';
        })
        .filter((chunk) => typeof chunk === 'string' && chunk.trim().length > 0)
        .join('\n')
        .trim();

      if (collected) return collected;
    }
  }

  return '';
}

function describeBlockedResponse(response: unknown): string | null {
  const promptFeedback = (response as {
    response?: { promptFeedback?: { blockReason?: string; safetyRatings?: { category?: string; probability?: string }[] } };
  })?.response?.promptFeedback;

  const blockReason = promptFeedback?.blockReason;
  if (typeof blockReason === 'string' && blockReason.trim()) {
    const ratings = promptFeedback?.safetyRatings?.filter((rating) => rating?.category && rating?.probability);
    const ratingLine = ratings?.length
      ? ` (${ratings
          .map((r) => `${String(r.category)}=${String(r.probability)}`)
          .join(', ')})`
      : '';
    return `The model blocked this request for safety reasons${ratingLine}. Try removing sensitive content or shortening the range.`;
  }

  const candidates = (response as { response?: { candidates?: { finishReason?: string; finishMessage?: string }[] } })?.response
    ?.candidates;
  if (Array.isArray(candidates) && candidates.length > 0) {
    const finishReason = candidates[0]?.finishReason;
    const finishMessage = candidates[0]?.finishMessage;
    if (typeof finishReason === 'string' && finishReason.trim()) {
      const base = finishMessage && typeof finishMessage === 'string' ? finishMessage : finishReason;
      return `The model could not return a story (${base}). Please adjust the entries and try again.`;
    }
  }

  return null;
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
  attempt: 0 | 1 = 0,
) {
  const feed = entriesToFeed(entries);
  const feedLimit = attempt === 0 ? 16000 : 9000;
  const trimmedFeed = limitFeed(feed, feedLimit);
  const prompt = buildYearStoryPrompt(trimmedFeed, from, to, options, trimmedFeed.length);

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
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: modelConfig?.maxOutputTokens ?? 1024,
      },
    });

    const story = extractStoryText(response);
    if (!story) {
      const blockMessage = describeBlockedResponse(response);
      throw new Error(blockMessage ?? 'Model returned an empty story. Please try a shorter range or tweak the content.');
    }

    return {
      story,
      wordCount: story.split(/\s+/).length,
      tokenUsage: response?.response?.usageMetadata ?? { totalTokenCount: 0 },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate year story';
    const lowered = message.toLowerCase();
    const hitTokenLimit = lowered.includes('max_tokens') || lowered.includes('empty story');

    // Retry once with a tighter feed window when Gemini signals token limits.
    if (attempt === 0 && hitTokenLimit) {
      return generateYearStory(entries, from, to, options, modelConfig, 1);
    }

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

