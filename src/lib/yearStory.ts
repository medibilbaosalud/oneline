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

  // Determine the list of models to try
  const requestedModel = modelConfig?.modelName;
  const mode = modelConfig?.mode ?? 'standard';

  let modelsToTry: string[] = [];
  if (requestedModel) {
    modelsToTry = [requestedModel];
  } else if (mode === 'advanced') {
    modelsToTry = ['gemini-2.5-pro'];
  } else {
    // Comprehensive fallback list as requested by user to avoid 429 errors
    modelsToTry = [
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
      };

    } catch (error: unknown) {
      console.warn(`Story generation failed with ${modelName}:`, error);
      lastError = error;

      const message = error instanceof Error ? error.message : String(error);
      const isQuotaError = message.includes('429') || message.includes('quota') || message.includes('Too Many Requests');

      // If it's NOT a quota error and NOT a model loading error, it might be a prompt issue, so maybe don't retry?
      // But for safety, we'll try the next model if it's a system/API error.
      // If it's a safety block, switching models might not help, but worth a shot if policies differ.

      if (isQuotaError) {
        console.log(`Quota exceeded for ${modelName}, failing over to next model...`);
        continue;
      }

      // For other errors, we might also want to continue, but let's be careful not to loop forever on bad prompts.
      // For now, we treat most errors as "try next model" to be robust.
    }
  }

  // If we exhausted all models, handle the error or return a fallback
  const message = lastError instanceof Error ? lastError.message : 'Failed to generate year story';
  const lowered = message.toLowerCase();
  const hitTokenLimit = lowered.includes('max_tokens') || lowered.includes('empty story');

  // Retry once with a tighter feed window when Gemini signals token limits (using the primary model strategy again? or just failing)
  // Since we already tried multiple models, maybe we just fail here unless we want to recurse with a smaller feed.
  if (attempt === 0 && hitTokenLimit) {
    return generateYearStory(entries, from, to, options, modelConfig, 1);
  }

  // If we really failed everything, return a stub so the UI doesn't crash, or throw.
  // The original code returned a stub if !model.
  const combined = entries
    .map((entry) => `[${ymd(entry.day ?? entry.created_at ?? new Date())}] ${entry.content}`)
    .join(' ');
  const excerpt = combined.length > 1500 ? `${combined.slice(0, 1500)}…` : combined;

  // If it was a quota error specifically that killed all attempts
  if (String(lastError).includes('429')) {
    throw new Error("Daily quota exceeded for all available models. Please try again tomorrow.");
  }

  throw new Error(message);
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

export async function generateStoryAudio(text: string): Promise<{ data: string; mimeType: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // FALLBACK MECHANISM:
  // The user reported issues with specific model names and API versions.
  // We iterate through a list of likely candidates, including "Preview" versions and both v1beta/v1alpha endpoints.
  // This ensures we find a working configuration without manual intervention.
  const modelsToTry = [
    { name: 'gemini-2.5-flash-preview-tts', version: 'v1beta' }, // Primary choice from user screenshot
    { name: 'gemini-2.5-flash-tts', version: 'v1beta' },         // Standard v1beta
    { name: 'gemini-2.5-flash-tts', version: 'v1alpha' },        // Legacy/Experimental v1alpha
    { name: 'gemini-2.0-flash-exp', version: 'v1beta' }          // Fallback to 2.0 exp (v1beta)
  ];

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting audio generation with model: ${model.name} (${model.version})`);
      const url = `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: text.slice(0, 40000) }]
          }],
          generationConfig: {
            response_modalities: ["AUDIO"],
            speech_config: {
              voice_config: { prebuilt_voice_config: { voice_name: "Aoede" } }
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Audio gen failed with ${model.name}:`, response.status, errorText);
        continue; // Try next model in the list
      }

      const data = await response.json();
      // Robustly check for audio data in candidates
      const candidates = data?.candidates || [];
      for (const candidate of candidates) {
        for (const part of candidate?.content?.parts || []) {
          if (part?.inlineData?.mimeType?.startsWith('audio') && part?.inlineData?.data) {
            console.log(`Audio generation successful with ${model.name}, mime: ${part.inlineData.mimeType}, length: ${part.inlineData.data.length}`);
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
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
  ];

  console.log("[IMAGE_PROMPT] Generating image prompt from story...");

  for (const modelName of modelsToTry) {
    try {
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[IMAGE] CRITICAL: GEMINI_API_KEY is not set.");
    return null;
  }
  if (!imagePrompt || imagePrompt.trim().length === 0) {
    console.error("[IMAGE] CRITICAL: imagePrompt is empty.");
    return null;
  }

  // BULLETPROOF FALLBACK MECHANISM:
  // We try multiple models in order of preference. Based on Google documentation (Dec 2024):
  // - gemini-2.5-flash-image: The recommended model for image generation (replaces deprecated previews)
  // - gemini-2.5-flash-image-preview: Preview version of the above
  // - gemini-2.0-flash-preview-image-generation: Older but still functional
  // - gemini-2.0-flash-exp: Experimental model with image capabilities
  // All use v1beta endpoint and require responseModalities: ["IMAGE"]

  const modelsToTry = [
    'gemini-2.5-flash-image',           // 1. Recommended stable model
    'gemini-2.5-flash-image-preview',   // 2. Preview version
    'gemini-2.0-flash-preview-image-generation', // 3. Legacy preview
    'gemini-2.0-flash-exp',             // 4. Experimental
    'gemini-2.0-flash',                 // 5. Standard fallback (may not support images)
  ];

  console.log(`[IMAGE] Starting image generation. Prompt: "${imagePrompt.slice(0, 100)}..."`);
  console.log(`[IMAGE] Will try ${modelsToTry.length} models in order.`);

  for (const modelName of modelsToTry) {
    try {
      console.log(`[IMAGE] Attempting with model: ${modelName}`);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const requestBody = {
        contents: [{
          parts: [{ text: imagePrompt }]
        }],
        generationConfig: {
          responseModalities: ["IMAGE"], // CamelCase as per Google documentation
        }
      };

      console.log(`[IMAGE] Request URL: ${url.replace(apiKey, 'API_KEY_HIDDEN')}`);
      console.log(`[IMAGE] Request body: ${JSON.stringify(requestBody).slice(0, 200)}...`);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      console.log(`[IMAGE] Response status: ${response.status}`);
      console.log(`[IMAGE] Response body (first 500 chars): ${responseText.slice(0, 500)}`);

      if (!response.ok) {
        const isQuotaError = responseText.includes('429') || responseText.includes('quota') || responseText.includes('RESOURCE_EXHAUSTED');
        const isNotFound = responseText.includes('404') || responseText.includes('not found') || responseText.includes('NOT_FOUND');

        if (isQuotaError) {
          console.warn(`[IMAGE] Model ${modelName} hit quota limit. Trying next...`);
          continue;
        }
        if (isNotFound) {
          console.warn(`[IMAGE] Model ${modelName} not found. Trying next...`);
          continue;
        }

        console.warn(`[IMAGE] Model ${modelName} failed with status ${response.status}. Trying next...`);
        continue;
      }

      // Parse the response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[IMAGE] Failed to parse response JSON from ${modelName}:`, parseError);
        continue;
      }

      // Extract image data from candidates
      const candidates = data?.candidates || [];
      console.log(`[IMAGE] Found ${candidates.length} candidates in response.`);

      for (const candidate of candidates) {
        const parts = candidate?.content?.parts || [];
        console.log(`[IMAGE] Candidate has ${parts.length} parts.`);

        for (const part of parts) {
          if (part?.inlineData?.mimeType?.startsWith('image') && part?.inlineData?.data) {
            const imageDataLength = part.inlineData.data.length;
            console.log(`[IMAGE] ✅ SUCCESS! Model: ${modelName}, MIME: ${part.inlineData.mimeType}, Data length: ${imageDataLength}`);
            return part.inlineData.data;
          }

          // Log what we found if it's not image data
          if (part?.text) {
            console.log(`[IMAGE] Part contains text (not image): "${part.text.slice(0, 100)}..."`);
          }
        }
      }

      // If we got here, the response was OK but didn't contain image data
      console.warn(`[IMAGE] Model ${modelName} returned OK but no image data found. Response structure:`, JSON.stringify(data).slice(0, 300));

    } catch (error) {
      console.error(`[IMAGE] Exception with model ${modelName}:`, error);
    }
  }

  console.error(`[IMAGE] ❌ ALL ${modelsToTry.length} MODELS FAILED. Image generation unsuccessful.`);
  return null;
}











