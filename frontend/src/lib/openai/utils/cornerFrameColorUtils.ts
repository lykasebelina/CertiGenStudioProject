// src/lib/openai/utils/cornerFrameColorUtils.ts

/** Extract color scheme for corner frame */
export function extractCornerFrameColors(prompt: string): string[] {
  const lower = prompt.toLowerCase();

  const paletteMap: Record<string, string[]> = {
    gold: ["#d4af37", "#b8952c"],
    silver: ["#c0c0c0", "#a9a9a9"],
    bronze: ["#cd7f32", "#a5692f"],
    pink: ["#ff75c8", "#ff4fbf"],
    purple: ["#b57cff", "#9a5ce4"],
    blue: ["#6ecbff", "#53b4ff"],
    pastel: ["#ffd1dc", "#d8eefe"]
  };

  for (const key in paletteMap) {
    if (lower.includes(key)) return paletteMap[key];
  }

  return ["#fecdd3", "#fecdd3"]; // neutral fallback
}

/** Detect whether to use DALL·E, + intensity */
export function detectCornerFrameStyle(prompt: string) {
  const lower = prompt.toLowerCase();

  const plainKeywords = [
    "plain", "simple", "solid", "flat", "one color", "minimal",
    "clean", "no pattern", "solid color", "flat color"
  ];

  const patternKeywords = [
    "pattern", "line art", "elegant", "professional", "ornate", "luxury",
    "filigree", "geometric", "themed", "abstract", "decorative", "premium",
    "intricate", "designed", "lined", "artistic"
  ];

  const isPlain = plainKeywords.some(k => lower.includes(k));
  const isPattern = patternKeywords.some(k => lower.includes(k));

  return {
    subtle: /\b(subtle|light|pastel|soft)\b/.test(lower),
    bold: /\b(bold|strong|deep|intense)\b/.test(lower),
    useDallePattern: isPattern && !isPlain
  };
}
