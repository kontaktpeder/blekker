/**
 * Band performance notes → natural Norwegian musician speak.
 * Global for every chart — not song-specific.
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
    re: /build(?:ing)?\s*tension/gi,
    to: "Bygg spenning — hold igjen",
  },
  {
    re: /light\s*acoustic\s*strumming/gi,
    to: "Lett akustisk strumming",
  },
  {
    re: /acoustic\s*guitar\s*start/gi,
    to: "Akustisk gitar starter",
  },
  {
    re: /full\s*band\s*entry/gi,
    to: "Fullt band inn",
  },
  {
    re: /full\s*band\b/gi,
    to: "Fullt band",
  },
  {
    re: /key\s*change\s*to\s+([A-G][#b]?m?)/gi,
    to: "Toneartsskifte til $1",
  },
  {
    re: /key\s*change\b/gi,
    to: "Toneartsskifte",
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
    re: /\bfade\s*in\b/gi,
    to: "fade inn",
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
  {
    re: /\bstay\s*quiet\b/gi,
    to: "hold lavt",
  },
  {
    re: /\bbreak\s*down\b/gi,
    to: "breakdown",
  },
  {
    re: /\bopen\s*hi-?hat\b/gi,
    to: "åpen hi-hat",
  },
  {
    re: /\bride\s*cymbal\b/gi,
    to: "ride",
  },
  {
    re: /\bwith\s*feeling\b/gi,
    to: "med feeling",
  },
  {
    re: /\bcount\s*in\b/gi,
    to: "opptakt / count-in",
  },
  {
    re: /\ba\s*cappella\b/gi,
    to: "a cappella",
  },
  {
    re: /\brubato\b/gi,
    to: "rubato",
  },
  {
    re: /\bslow\s*down\b/gi,
    to: "sakke ned",
  },
  {
    re: /\bspeed\s*up\b/gi,
    to: "øk tempo",
  },
  {
    re: /\bquiet\b/gi,
    to: "stille",
  },
  {
    re: /\bloud\b/gi,
    to: "sterkt",
  },
  // Swedish → Norwegian (band notes only — not lyrics)
  {
    re: /st[aä]m\s+ett?\s+halv(?:t)?\s*tonsteg\s+l[aä]gre(?:\s*\(([^)]+)\))?/gi,
    to: "Stem et halvtonetrinn ned ($1)",
  },
  {
    re: /st[aä]m\s+ned\s+ett?\s+halv(?:t)?\s*tonsteg/gi,
    to: "Stem et halvtonetrinn ned",
  },
  {
    re: /halv(?:t)?\s*tonsteg\s+l[aä]gre/gi,
    to: "halvtonetrinn ned",
  },
  {
    re: /halv(?:t)?\s*tonsteg/gi,
    to: "halvtonetrinn",
  },
  {
    re: /tonart(?:s)?\s*byte/gi,
    to: "toneartsskifte",
  },
  {
    re: /\bst[aä]m\s+ned\b/gi,
    to: "stem ned",
  },
];

/** Translate band notes to Norwegian musician vernacular (light irony, not literal). */
export function localizeBandNotes(notes: string | null | undefined): string {
  if (!notes?.trim()) return "";
  let out = notes.trim();
  for (const { re, to } of REPLACEMENTS) {
    out = out.replace(re, to);
  }
  out = out
    .replace(/\s+ned\s+\(\s*\)/gi, " ned")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/;\s*/g, " — ")
    .trim();
  return out;
}
