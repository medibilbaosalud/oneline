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

  const languageLine =
    'Detect the predominant language directly from the diary entries and write the entire output in that language. If most entries are in German, write fully in German; if most are in French, write fully in French. When entries mix languages, mirror that mix exactly as written. Do not default to Spanish or English—always honor the diarist\'s language choices.';

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
You are an expert writer of personal narrative and contemporary journals.
You will receive chronologically ordered diary entries, each with a date and text.

Your primary goal is to transform ALL of that material into ONE CONTINUOUS STORY, written in first person, with an intimate, coherent, and natural tone—as if I wrote it myself from my own memories.

I want three things at once:
1) A fluent narrative that tells what happened.
2) An implicit pattern analysis: what makes me feel good or bad, which people help or drain me, which themes repeat.
3) Maximum respect for MY VOICE: my vocabulary, expressions, and actual way of writing.

Style instructions (critical)
-----------------------------

- Write in first person singular ("I") unless ${povLine} says otherwise.
- Make it feel like I wrote it:
  - copy my way of speaking,
  - my level of informality,
  - my punctuation rhythm and sentence length.
- Use the predominant language found in the entries: ${languageLine}
- If I use expressions or words in other languages (e.g., Basque, English, German), KEEP them in that language and context. Do not translate or neutralize them.
- Keep my vocabulary: if I use slang, colloquialisms, abbreviations, or emojis, include them naturally (without overdoing it).
- ${toneLine}
- ${povLine}
- ${fidelityRules}
${userNotes}
- Preserve names, technical terms, and non-English words exactly as they appear in the entries.
- Avoid impersonal phrasing like “the author feels…”; write it as my own voice: “I feel”, “I think”, etc.
- Avoid academic distance; prefer a close, honest, direct style.

Narrative instructions
----------------------

- Do NOT summarize day by day.
- Do NOT add date headers or titles.
- Do NOT repeat the original entry format (e.g., "- 2025-11-22 ...").
- Do NOT use lists or bullets in the main narrative.
- Write everything as one continuous story of that period, with a clear narrative thread.
- Keep the overall time order, but express it like linked memories:
  - how the period began,
  - how things evolved,
  - key moments,
  - and how I was by the end.
- You may merge or compress similar days so the story flows; you do not need to mention every day explicitly.
- Talk about what happened (concrete events) and how I felt plus the conclusions I drew.
- Integrate the passage of time approximately ("early in that week", "a few days later", "later that month") without exact dates or daily sections.
- Do NOT invent facts that are not in the entries, but DO make gentle, natural inferences about:
  - my mood,
  - my energy,
  - my fears,
  - my hopes,
  - my shifts in perspective.

Pattern detection (woven into the story)
----------------------------------------

While writing the narrative, pay close attention to:

- What tends to make me feel better:
  - activities, people, plans, places, achievements, small routines…
- What tends to make me feel worse:
  - situations, thoughts, habits, recurring problems…
- People who appear as support, motivation, or good influence.
- People, dynamics, or environments that drain, frustrate, or generate conflict.
- Themes that repeat:
  - school, friends, projects, mental health, social media, games, work, relationships, etc.
- Any change in trend:
  - moments when I start seeing things differently,
  - decisions that mark a turning point,
  - things that bothered me a lot at first and later less (or the opposite).

Do NOT write this as a separate analysis upfront; these ideas should be woven into the story as natural reflections (“I realized that…”, “whenever I did X I felt better”, “with Y I usually ended up stressed”, etc.).

Output structure
----------------

1) Main narrative

- Start directly with the story, no meta phrases like “Here is a summary”.
- Tell it as one continuous chapter, no day-by-day sections.
- Do not include section headers here.
- Do not use lists or bullets in the main narrative.
- Keep an honest, reflective tone without unnecessary drama unless the content justifies it.
- Target length: between ${minWords} and ${maxWords} words.
  - If the content is dense, prioritize clarity, flow, and pattern detection over mentioning every minor detail.

2) Pattern section: **Patterns I can see** (translate this heading into the dominant diary language while keeping it bold)

After the narrative, add a section titled with the dominant language equivalent of **Patterns I can see** and keep it bold.

In this section use bullets. Organize (if possible) into subsections like:

- *What tends to make me feel better:*
  - 3–6 bullets about activities, people, habits, or contexts that improve my mood.
- *What tends to make me feel worse:*
  - 3–6 bullets about things that usually lower my mood, cause stress, or overthinking.
- *People and relationships:*
  - 3–6 bullets summarizing which people seem to be a good influence and which are not, always based on the entries.

Keep the same dominant language (and mixed words) in these bullets as in the narrative.

3) Brief recap section: **Highlights** (translate this heading into the dominant diary language while keeping it bold)

After the patterns, add a section titled with the dominant language equivalent of **Highlights**, bolded.

- Include 5–8 bullets.
- Each bullet should capture a key achievement, challenge, or moment from the period, concise and concrete.

4) Message to my future self

Finally, add a section titled with the dominant language equivalent of **If I could tell my future self one thing…**, keeping the meaning and bold formatting.

- Write 3–4 lines in the same language as the narrative.
- It should sound like a sincere note I would leave to my future self:
  - combining what I lived,
  - the patterns you detected,
  - and the most important advice that repeats through the story.

Input
-----

Here are my diary entries. Convert ALL of the content into one continuous narrative following the instructions above:

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
};

async function loadGenerativeModel(config: StoryModelConfig) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelNames = config.mode === 'advanced'
    ? ['gemini-2.0-pro-exp-02-05', 'gemini-1.5-pro']
    : ['gemini-2.0-flash', 'gemini-1.5-flash'];

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

    const response = await generateWithRetry(model, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {},
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


async function generateWithRetry(model: any, prompt: any, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('Resource exhausted')) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        continue;
      }
      throw error;
    }
  }
}

type InlineMediaPart = {
  inlineData?: { mimeType?: string; data?: string };
};

type MediaRequest = {
  model: string;
  prompt: string;
  responseMimeType: string;
};

async function requestMediaFromGemini({ model, prompt, responseMimeType }: MediaRequest): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Gemini media generation skipped: GEMINI_API_KEY is missing');
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: prompt }],
    }],
    generationConfig: {
      responseMimeType,
    },
  } satisfies Record<string, unknown>;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    cache: 'no-store',
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  if (!response.ok) {
    console.error('Gemini media request failed', response.status, responseText.slice(0, 800));
    return null;
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch (error) {
    console.error('Gemini media JSON parse failed', error, responseText.slice(0, 300));
    return null;
  }

  const parts: InlineMediaPart[] | undefined = data?.candidates?.[0]?.content?.parts;
  const mediaPart = Array.isArray(parts)
    ? parts.find((part) => part?.inlineData?.mimeType?.startsWith(responseMimeType.split('/')[0]))
    : undefined;

  if (mediaPart?.inlineData?.data) {
    return mediaPart.inlineData.data;
  }

  console.error('Gemini media response missing inlineData', JSON.stringify(data).slice(0, 800));
  return null;
}

export async function generateStoryAudio(text: string): Promise<string | null> {
  const trimmed = text.slice(0, 4000).trim();
  if (!trimmed) return null;

  return requestMediaFromGemini({
    model: 'gemini-2.5-flash-tts',
    responseMimeType: 'audio/mp3',
    prompt: `Read this story aloud. Return ONLY the audio data, no text.\n\n${trimmed}`,
  });
}

export async function generateStoryImage(summary: string): Promise<string | null> {
  const trimmed = summary.slice(0, 500).trim();
  if (!trimmed) return null;

  const prompt =
    'Generate a cinematic, abstract, and emotional cover image for this story. Return ONLY the image.\n\nStory Summary: ' +
    trimmed;

  const primary = await requestMediaFromGemini({
    model: 'gemini-2.0-flash',
    responseMimeType: 'image/png',
    prompt,
  });

  if (primary) return primary;

  // Retry with the LCM image-tuned variant if the primary model does not return inline data.
  return requestMediaFromGemini({
    model: 'gemini-2.0-flash-lcm',
    responseMimeType: 'image/png',
    prompt,
  });
}











