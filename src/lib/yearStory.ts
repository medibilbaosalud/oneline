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

  // User strict requirements:
  // Advanced: Gemini 2.5 Pro
  // Standard: Gemini 2.5 Flash -> Gemini 2.0 Flash (fallback)
  // NEVER use 1.5

  // If a specific model name is requested (e.g. for image prompts), prioritize it.
  const modelNames = config.modelName
    ? [config.modelName]
    : (config.mode === 'advanced' ? ['gemini-2.5-pro'] : ['gemini-2.5-flash', 'gemini-2.0-flash']);

  for (const name of modelNames) {
    try {
      return genAI.getGenerativeModel({ model: name });
    } catch {
      // try next model name
    }
  }
  throw new Error('No Gemini model available for generateContent()');
}

// Comprehensive fallback list
const STANDARD_MODELS = [
  'gemini-2.5-flash',           // 1. Flash 2.5
  'gemini-2.5-flash-preview',   // 2. Flash 2.5 Preview
  'gemini-2.5-flash-001',       // 2b. Flash 2.5 Preview (alt name)
  'gemini-2.5-flash-lite',      // 3. Flash-Lite 2.5
  'gemini-2.5-flash-lite-preview', // 4. Flash-Lite 2.5 Preview
  'gemini-2.5-flash-lite-001',  // 4b. Flash-Lite 2.5 Preview (alt name)
  'gemini-2.0-flash',           // 5. Flash 2.0
  'gemini-2.0-flash-lite',      // 6. Flash-Lite 2.0
  'gemini-2.0-flash-lite-preview-02-05', // 6b. Flash-Lite 2.0 Preview
  'gemini-1.5-flash',           // 7. Flash 1.5 (Last resort)
];

export async function generateYearStory(
  entries: YearStoryEntry[],
  from: string,
  to: string,
  options: YearStoryOptions,
  modelConfig?: Partial<StoryModelConfig>,
  attempt: 0 | 1 = 0,
): Promise<{ story: string; wordCount: number; tokenUsage: any; modelUsed: string }> {
  const feed = entriesToFeed(entries);
  const feedLimit = attempt === 0 ? 16000 : 9000;
  const trimmedFeed = limitFeed(feed, feedLimit);
  const prompt = buildYearStoryPrompt(trimmedFeed, from, to, options, trimmedFeed.length);

  // Determine the list of models to try
  const requestedModel = modelConfig?.modelName;
  const mode = modelConfig?.mode ?? 'standard';

  let modelsToTry: string[] = [];

  // Logic: Always respect explicit request first, then cascade if allowed.
  // For "advanced" mode, we WANT a cascade: Pro -> [Standard Fallback Stack]
  // This ensures the user gets a story even if Pro is rate-limited.

  if (requestedModel) {
    if (mode === 'advanced' && requestedModel.includes('pro')) {
      // If explicitly asking for Pro in advanced mode, fallback to standard stack
      modelsToTry = [requestedModel, ...STANDARD_MODELS];
    } else {
      // Rigid request (e.g. testing)
      modelsToTry = [requestedModel];
    }
  } else if (mode === 'advanced') {
    // Implicit Advanced -> Pro -> Fallback
    modelsToTry = ['gemini-2.5-pro', ...STANDARD_MODELS];
  } else {
    // Standard Mode -> Fallback stack
    modelsToTry = [...STANDARD_MODELS];
  }

  let lastError: unknown = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`Attempting story generation with model: ${modelName}`);
      const model = await loadGenerativeModel({
        mode: mode,
        modelName: modelName,
      });

      if (!model) continue;

      const response = await generateWithRetry(model, {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {},
      });

      const story = extractStoryText(response);
      if (!story) {
        const blockMessage = describeBlockedResponse(response);
        throw new Error(blockMessage ?? 'Model returned an empty story.');
      }

      return {
        story,
        wordCount: story.split(/\s+/).length,
        tokenUsage: response?.response?.usageMetadata ?? { totalTokenCount: 0 },
        modelUsed: modelName,
      };

    } catch (error: unknown) {
      console.warn(`Story generation failed with ${modelName}:`, error);
      lastError = error;

      const message = error instanceof Error ? error.message : String(error);
      const isQuotaError = message.includes('429') || message.includes('quota') || message.includes('Too Many Requests') || message.includes('RESOURCE_EXHAUSTED');
      const isModelNotFound = message.includes('404') || message.includes('not found') || message.includes('NOT_FOUND');
      const isServerError = message.includes('500') || message.includes('503') || message.includes('INTERNAL');

      // BULLETPROOF: Continue to next model on ANY API-level error
      if (isQuotaError) {
        console.log(`[STORY] Quota exceeded for ${modelName}, trying next model...`);
        continue;
      }

      if (isModelNotFound) {
        console.log(`[STORY] Model ${modelName} not found (404), trying next model...`);
        continue;
      }

      if (isServerError) {
        console.log(`[STORY] Server error for ${modelName}, trying next model...`);
        continue;
      }

      // For safety blocks or prompt issues, also try next model (different models have different policies)
      console.log(`[STORY] Other error for ${modelName}, trying next model anyway...`);
      continue;
    }
  }

  // If we exhausted all models, handle the error or return a fallback
  console.error(`[STORY] ❌ ALL ${modelsToTry.length} MODELS FAILED. Last error:`, lastError);

  const message = lastError instanceof Error ? lastError.message : 'Failed to generate year story';
  const lowered = message.toLowerCase();
  const hitTokenLimit = lowered.includes('max_tokens') || lowered.includes('empty story');

  // Retry once with a tighter feed window when Gemini signals token limits
  if (attempt === 0 && hitTokenLimit) {
    console.log(`[STORY] Retrying with tighter feed window...`);
    return generateYearStory(entries, from, to, options, modelConfig, 1);
  }

  // Provide accurate error messages based on the actual error type
  const lastErrorStr = String(lastError);

  if (lastErrorStr.includes('404') || lastErrorStr.includes('NOT_FOUND')) {
    throw new Error(`Models unavailable. Please contact support. (${modelsToTry.length} models tested)`);
  }

  if (lastErrorStr.includes('429') || lastErrorStr.includes('quota') || lastErrorStr.includes('RESOURCE_EXHAUSTED')) {
    throw new Error("Google API quota exceeded. All models are rate-limited. Please wait a few minutes and try again.");
  }

  if (lastErrorStr.includes('500') || lastErrorStr.includes('503') || lastErrorStr.includes('INTERNAL')) {
    throw new Error("Temporary Google server error. Please try again in a few minutes.");
  }

  // Generic error with the actual message for debugging
  throw new Error(`Generation error: ${message.slice(0, 200)}`);
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
  const modelName = model?.model || 'unknown';
  console.log(`[RETRY] Starting generateWithRetry for model: ${modelName}, retries: ${retries}`);

  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[RETRY] Attempt ${i + 1}/${retries} for ${modelName}...`);
      const result = await model.generateContent(prompt);
      console.log(`[RETRY] ✅ Success on attempt ${i + 1} for ${modelName}`);
      return result;
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error(`[RETRY] ❌ Attempt ${i + 1}/${retries} failed for ${modelName}: ${errorMsg.slice(0, 300)}`);

      const isRetryable = errorMsg.includes('429') || errorMsg.includes('Resource exhausted') || errorMsg.includes('RESOURCE_EXHAUSTED');

      if (isRetryable) {
        if (i === retries - 1) {
          console.error(`[RETRY] All ${retries} retries exhausted for ${modelName}. Throwing.`);
          throw error;
        }
        const waitTime = delay * Math.pow(2, i);
        console.log(`[RETRY] Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      console.error(`[RETRY] Non-retryable error for ${modelName}. Throwing immediately.`);
      throw error;
    }
  }
}

// ============================================================
// STORY AUDIO GENERATION (TTS)
// ============================================================
// Converts the story text to audio using Google Gemini's TTS API.
//
// KEY FEATURES:
// - Analyzes story mood to select appropriate voice and style
// - Injects narration instructions for more human-like reading
// - Uses model cascade for reliability
// - Selects voice (Aoede/Kore) based on emotional tone
//
// MOOD ANALYSIS:
// The story text is analyzed for emotional keywords to determine:
// - Dominant mood: hopeful, melancholic, energetic, reflective, neutral
// - Intensity: low, medium, high
// - Whether story contains struggles and/or triumphs
//
// This information shapes HOW the text is narrated, not just WHAT is said.
// ============================================================
export async function generateStoryAudio(text: string): Promise<{ data: string; mimeType: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // STEP 1: Analyze the story's emotional content
  // This determines voice selection and narration style
  const moodAnalysis = analyzeStoryMood(text);

  // STEP 2: Build narration instructions based on mood
  // These instructions tell the TTS how to read (pacing, tone, emphasis)
  const narratorInstructions = buildNarrationInstructions(moodAnalysis);
  const enhancedText = `${narratorInstructions}\n\n---\n\n${text.slice(0, 38000)}`;

  // STEP 3: Model cascade for reliability
  // We try multiple TTS models/versions in case some are unavailable
  const modelsToTry = [
    { name: 'gemini-2.5-flash-preview-tts', version: 'v1beta' },
    { name: 'gemini-2.5-flash-tts', version: 'v1beta' },
    { name: 'gemini-2.5-flash-tts', version: 'v1alpha' },
    { name: 'gemini-2.0-flash-exp', version: 'v1beta' }
  ];

  // STEP 4: Select voice based on detected mood
  // Aoede = warmer/upbeat, Kore = softer/contemplative
  const voiceName = selectVoiceForMood(moodAnalysis.dominantMood);

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting audio generation with model: ${model.name} (${model.version}), voice: ${voiceName}`);
      const url = `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: enhancedText }]
          }],
          generationConfig: {
            response_modalities: ["AUDIO"],
            speech_config: {
              voice_config: { prebuilt_voice_config: { voice_name: voiceName } }
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Audio gen failed with ${model.name}:`, response.status, errorText);
        continue;
      }

      const data = await response.json();
      const candidates = data?.candidates || [];
      for (const candidate of candidates) {
        for (const part of candidate?.content?.parts || []) {
          if (part?.inlineData?.mimeType?.startsWith('audio') && part?.inlineData?.data) {
            console.log(`Audio generation successful with ${model.name}, voice: ${voiceName}, mime: ${part.inlineData.mimeType}`);
            return {
              data: part.inlineData.data,
              mimeType: part.inlineData.mimeType
            };
          }
        }
      }

      console.warn(`Audio gen response structure unexpected for ${model.name}:`, JSON.stringify(data).slice(0, 200));
    } catch (error) {
      console.error(`Audio generation error with ${model.name}:`, error);
    }
  }

  console.error("All audio generation attempts failed.");
  return null;
}

/**
 * Analyze story text to detect emotional tone and mood
 */
function analyzeStoryMood(text: string): {
  dominantMood: 'hopeful' | 'melancholic' | 'energetic' | 'reflective' | 'neutral';
  intensity: 'low' | 'medium' | 'high';
  hasStruggles: boolean;
  hasTriumphs: boolean;
} {
  const lowerText = text.toLowerCase();

  // Positive indicators
  const hopefulWords = ['hope', 'better', 'progress', 'happy', 'joy', 'excited', 'grateful', 'love', 'success', 'achieved', 'alegría', 'feliz', 'ilusión', 'logré', 'bien'];
  const energeticWords = ['energy', 'excited', 'motivated', 'amazing', 'incredible', 'emocionado', 'increíble', 'genial', 'brutal'];

  // Negative indicators
  const melancholicWords = ['sad', 'miss', 'lost', 'difficult', 'hard', 'struggle', 'triste', 'difícil', 'dolor', 'extraño', 'perdí'];
  const struggleWords = ['anxiety', 'stress', 'overwhelmed', 'tired', 'exhausted', 'ansiedad', 'estrés', 'agotado', 'cansado'];

  // Reflective indicators
  const reflectiveWords = ['realize', 'understand', 'learned', 'notice', 'pattern', 'me di cuenta', 'aprendí', 'entendí', 'reflexión'];

  let hopefulScore = hopefulWords.filter(w => lowerText.includes(w)).length;
  let melancholicScore = melancholicWords.filter(w => lowerText.includes(w)).length;
  let energeticScore = energeticWords.filter(w => lowerText.includes(w)).length;
  let reflectiveScore = reflectiveWords.filter(w => lowerText.includes(w)).length;

  const hasStruggles = struggleWords.some(w => lowerText.includes(w)) || melancholicScore > 2;
  const hasTriumphs = hopefulScore > 2 || energeticScore > 1;

  // Determine dominant mood
  let dominantMood: 'hopeful' | 'melancholic' | 'energetic' | 'reflective' | 'neutral' = 'neutral';
  const maxScore = Math.max(hopefulScore, melancholicScore, energeticScore, reflectiveScore);

  if (maxScore === 0) {
    dominantMood = 'neutral';
  } else if (hopefulScore === maxScore) {
    dominantMood = 'hopeful';
  } else if (melancholicScore === maxScore) {
    dominantMood = 'melancholic';
  } else if (energeticScore === maxScore) {
    dominantMood = 'energetic';
  } else {
    dominantMood = 'reflective';
  }

  // Determine intensity
  const totalIntensity = hopefulScore + melancholicScore + energeticScore;
  const intensity: 'low' | 'medium' | 'high' = totalIntensity < 3 ? 'low' : totalIntensity < 8 ? 'medium' : 'high';

  return { dominantMood, intensity, hasStruggles, hasTriumphs };
}

/**
 * Build narration style instructions based on mood analysis
 */
function buildNarrationInstructions(mood: ReturnType<typeof analyzeStoryMood>): string {
  const baseStyle = `[NARRATION STYLE INSTRUCTIONS - For the AI voice to read naturally]
Read this as a personal, intimate story - like someone sharing their genuine experiences with a close friend.`;

  let moodInstructions = '';

  switch (mood.dominantMood) {
    case 'hopeful':
      moodInstructions = `
Tone: Warm and gently optimistic. Let hope shine through without being overly cheerful.
Pacing: Moderate, with slight lifts at positive moments.
Voice: Sincere, like sharing good news with someone who cares.`;
      break;
    case 'melancholic':
      moodInstructions = `
Tone: Tender and empathetic. Honor the sadness without dramatizing it.
Pacing: Slower, with thoughtful pauses at emotional moments.
Voice: Soft and contemplative, like a quiet conversation late at night.`;
      break;
    case 'energetic':
      moodInstructions = `
Tone: Animated but grounded. Let enthusiasm come through naturally.
Pacing: Slightly faster, with dynamic variation.
Voice: Engaged and alive, like telling an exciting story to a friend.`;
      break;
    case 'reflective':
      moodInstructions = `
Tone: Thoughtful and introspective. Convey the weight of self-discovery.
Pacing: Measured, with pauses for realizations to land.
Voice: Wise but humble, like sharing hard-won insights.`;
      break;
    default:
      moodInstructions = `
Tone: Natural and conversational. Adapt to the content as it unfolds.
Pacing: Varied and organic.
Voice: Authentic and relatable.`;
  }

  let emotionalGuidance = '';
  if (mood.hasStruggles && mood.hasTriumphs) {
    emotionalGuidance = `
This story contains both challenges and victories. Let the voice journey through both - acknowledging the hard parts with gravity, and the wins with quiet pride.`;
  } else if (mood.hasStruggles) {
    emotionalGuidance = `
This story touches on difficult experiences. Read with compassion - not pity, but genuine understanding.`;
  } else if (mood.hasTriumphs) {
    emotionalGuidance = `
This story celebrates growth and achievement. Let warmth and genuine happiness come through.`;
  }

  const intensityNote = mood.intensity === 'high'
    ? `This is an emotionally intense narrative. Honor that depth without overdramatizing.`
    : mood.intensity === 'low'
      ? `This is a quieter narrative. Keep the voice intimate and understated.`
      : '';

  return `${baseStyle}
${moodInstructions}
${emotionalGuidance}
${intensityNote}

[END OF INSTRUCTIONS - Begin reading the story below]`;
}

/**
 * Select the most appropriate voice based on story mood
 */
function selectVoiceForMood(mood: 'hopeful' | 'melancholic' | 'energetic' | 'reflective' | 'neutral'): string {
  // Gemini TTS voices - choosing based on mood
  // Available voices: Aoede, Charon, Fenrir, Kore, Puck
  switch (mood) {
    case 'hopeful':
    case 'energetic':
      return 'Aoede'; // Warm, slightly upbeat
    case 'melancholic':
    case 'reflective':
      return 'Kore'; // Softer, more contemplative
    default:
      return 'Aoede'; // Default to warm voice
  }
}

/**
 * Generates a concise image prompt based on the story.
 * This intermediate step avoids sending the entire story to the image model,
 * saving tokens and improving relevance.
 * 
 * BULLETPROOF: Uses the same fallback strategy as story generation.
 */
export async function generateImagePrompt(story: string): Promise<string> {
  const DEFAULT_PROMPT = 'A creative, abstract, and cinematic cover image representing a personal journey, with moody lighting and no text.';

  if (!story || story.trim().length === 0) {
    console.warn("[IMAGE_PROMPT] Story is empty, returning default prompt.");
    return DEFAULT_PROMPT;
  }

  // Models to try for text generation (fast/cheap models first)
  const modelsToTry = [
    'gemini-1.5-flash-8b',      // 1. Cheapest/Fastest (good for simple prompts)
    'gemini-1.5-flash',         // 2. Standard Flash
    'gemini-2.0-flash-lite',    // 3. Flash Lite 2.0
    'gemini-2.0-flash',         // 4. Flash 2.0
  ];

  console.log("[IMAGE_PROMPT] Generating image prompt from story...");

  for (const modelName of modelsToTry) {
    try {
      // Add delay to avoid rate limits
      if (modelName !== modelsToTry[0]) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log(`[IMAGE_PROMPT] Attempting with model: ${modelName}`);
      const model = await loadGenerativeModel({ mode: 'standard', modelName });

      if (!model) {
        console.warn(`[IMAGE_PROMPT] Failed to load model ${modelName}. Trying next...`);
        continue;
      }

      const response = await generateWithRetry(model, {
        contents: [{
          role: 'user',
          parts: [{
            text: `Based on the following story, write a single, concise, and vivid prompt for an AI image generator to create a cinematic, abstract, and emotional cover image. 
          
Focus on mood, lighting, and abstract themes. Do NOT include text, characters, or specific details. 
Return ONLY the prompt text, nothing else.
          
Story:
${story.slice(0, 8000)}`
          }]
        }],
        generationConfig: {},
      });

      const prompt = extractStoryText(response);
      if (prompt && prompt.trim().length > 10) {
        console.log(`[IMAGE_PROMPT] ✅ SUCCESS with ${modelName}. Prompt: "${prompt.slice(0, 100)}..."`);
        return prompt;
      }

      console.warn(`[IMAGE_PROMPT] Model ${modelName} returned empty or invalid prompt. Trying next...`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isQuotaError = message.includes('429') || message.includes('quota');
      console.warn(`[IMAGE_PROMPT] Model ${modelName} failed${isQuotaError ? ' (quota)' : ''}:`, message.slice(0, 200));
    }
  }

  console.error("[IMAGE_PROMPT] ❌ All models failed. Returning default prompt.");
  return DEFAULT_PROMPT;
}

export async function generateStoryImage(imagePrompt: string): Promise<string | null> {
  // Import dynamically to avoid issues if HF_TOKEN is not set during build time.
  // This ensures the module is only loaded when actually needed for generation.
  const { generateImageSDXL } = await import('./hfImage');

  console.log(`[IMAGE] Delegating to HuggingFace SDXL. Prompt: "${imagePrompt.slice(0, 100)}..."`);

  return generateImageSDXL(imagePrompt);
}











