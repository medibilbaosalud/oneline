// src/lib/quotes.ts
export type Quote = { text: string; author?: string };

export const QUOTES: Quote[] = [
  // ——— Steve Jobs ———
  { text: "The people who are crazy enough to think they can change the world are the ones who do.", author: "Steve Jobs" },
  { text: "Stay hungry. Stay foolish.", author: "Steve Jobs" },
  { text: "Your time is limited, so don’t waste it living someone else’s life.", author: "Steve Jobs" },
  { text: "Have the courage to follow your heart and intuition.", author: "Steve Jobs" },

  // ——— Otras muy inspiradoras ———
  { text: "The smallest step in the right direction ends up being the biggest step of your life.", author: "Unknown" },
  { text: "What you do every day matters more than what you do once in a while.", author: "Gretchen Rubin" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Discipline equals freedom.", author: "Jocko Willink" },
];

export function quoteOfToday(date = new Date()): Quote {
  // Deterministic per day: YYYY-MM-DD -> index
  const key = date.toISOString().slice(0, 10);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % QUOTES.length;
  return QUOTES[idx];
}
