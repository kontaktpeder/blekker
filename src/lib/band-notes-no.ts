/**
 * Band performance notes → natural Norwegian musician speak.
 * Not literal word-for-word; established terms + a dry wink.
 */

const REPLACEMENTS: Array<{ re: RegExp; to: string }> = [
  // Specific full phrases first
  {
    re: /fade\s*out\s*or\s*hard\s*stop\s*on\s*final\s+([A-G][#b]?m?(?:aj|in|aj7|7|9|11|13|sus\d?)?(?:\/[A-G][#b]?)?)/gi,
    to: "Fade ut — eller hard stopp på siste $1. Du velger stemning.",
  },
  {
    re: /fade\s*out\s*or\s*hard\s*stop[^.]*/gi,
    to: "Fade ut — eller hard stopp. Stemning eller full stopp.",
  },
  {
    re: /classic\s*disco\s*feel[;,]?\s*tight\s*hi-?hat/gi,
    to: "Disco-feel, men stramt — hi-haten skal sitte",
  },
  {
    re: /four[- ]?on[- ]?the[- ]?floor(?:\s*beat)?/gi,
    to: "Kick på alle fire",
  },
  {
    re: /building\s*energy/gi,
    to: "Det bygger — hold igjen",
  },
  {
    re: /solid\s*backbeat/gi,
    to: "Stødig backbeat",
  },
  {
    re: /drop\s*to\s*half[- ]?time/gi,
    to: "Halvtempo",
  },
  {
    re: /half[- ]?time/gi,
    to: "halvtempo",
  },
  {
    re: /tight\s*hi-?hat/gi,
    to: "stram hi-hat",
  },
  {
    re: /disco\s*feel/gi,
    to: "disco-feel",
  },
  {
    re: /\bbass\s*run\s*:/gi,
    to: "Bassløp:",
  },
  {
    re: /\bbefore\s*bridge\s*to\s*pre-?chorus\b/gi,
    to: "før bridge inn i pre-chorus",
  },
  {
    re: /\bbefore\s+the\s+bridge\b/gi,
    to: "før bridgen",
  },
  {
    re: /\bhard\s*stop\b/gi,
    to: "hard stopp",
  },
  {
    re: /\bfade\s*out\b/gi,
    to: "fade ut",
  },
  {
    re: /\bno\s*improv(ise|isation)?\b/gi,
    to: "ikke improvisér",
  },
  {
    re: /\bkeep\s*it\s*tight\b/gi,
    to: "hold det stramt",
  },
  {
    re: /\bbig\s*ending\b/gi,
    to: "stor avslutning",
  },
  {
    re: /\bsoft\s*entry\b/gi,
    to: "myk inngang",
  },
  {
    re: /\bin\s*the\s*pocket\b/gi,
    to: "i lomma",
  },
];

/** Translate band notes to Norwegian musician vernacular (light irony, not literal). */
export function localizeBandNotes(notes: string | null | undefined): string {
  if (!notes?.trim()) return "";
  let out = notes.trim();
  for (const { re, to } of REPLACEMENTS) {
    out = out.replace(re, to);
  }
  // Cleanup leftover English glue
  out = out
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/;\s*/g, " — ")
    .trim();
  return out;
}
