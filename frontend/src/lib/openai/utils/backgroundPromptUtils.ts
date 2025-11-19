// ================================
// src/lib/openai/utils/backgroundPromptUtils.ts
// Strict Hybrid Prompt Utils — full file replacement
// ================================

import type { CertificateSize } from "./sizeUtils";

/**
 * detectBackgroundType
 *
 * Returns:
 *  - "plain"     -> plain / solid color
 *  - "gradient"  -> gradient requested
 *  - "textured"  -> soft texture OR default for style/theme-only prompts
 *  - "patterned" -> explicit pattern / motif / seamless
 *
 * Note: for ambiguous style words (modern/classy/corporate/halloween/kids),
 * we treat them as "textured" (safe default) unless pattern/gradient/plain are explicit.
 */
export function detectBackgroundType(prompt: string): "plain" | "textured" | "gradient" | "patterned" {
  const lower = (prompt || "").toLowerCase();

  // explicit gradient
  if (/\b(gradient|ombre|fade|blended)\b/.test(lower)) return "gradient";

  // explicit pattern keywords (strong)
  const patternHints = [
    "pattern", "patterned", "motif", "seamless", "tile", "repeat", "micro pattern",
    "micro-pattern", "tiny pattern", "small pattern", "repeating pattern",
  ];
  if (patternHints.some((w) => lower.includes(w))) return "patterned";

  // explicit texture keywords
  const textureHints = [
    "texture", "textured", "grain", "paper", "linen", "fabric", "matte", "parchment",
    "soft texture", "subtle texture", "smooth grain", "natural texture",
  ];
  if (textureHints.some((w) => lower.includes(w))) return "textured";

  // plain/solid
  const plainHints = ["plain", "solid", "flat", "single color", "monotone", "clean"];
  if (plainHints.some((w) => lower.includes(w))) return "plain";

  // color-only prompts (e.g., "navy", "cream", "pastel blue")
  if (/\b(white|black|cream|ivory|beige|navy|blue|red|green|gray|grey|pastel|peach|gold)\b/i.test(lower)) {
    // if also contains "pattern" or "texture" it would have matched earlier
    return "textured"; // safe default: soft texture with color
  }

  // THEME / STYLE keywords (modern, classy, corporate, halloween, kids, etc.)
  // Default to "textured" (safe abstract texture)
  const styleHints = [
    "modern", "classy", "professional", "elegant", "corporate", "academic",
    "women's month", "womens month", "womensmonth", "womens", "kids", "children",
    "boyish", "girlish", "halloween", "birthday", "festive", "floral", "vintage",
    "minimal", "premium", "luxury", "cute", "playful", "sport", "competition",
    "retro", "futuristic", "tech", "office",
  ];
  if (styleHints.some((w) => lower.includes(w))) return "textured";

  // last-resort default
  return "textured";
}

/**
 * detectGradientDirection
 * maps friendly words to CSS-like linear-gradient directions
 */
export function detectGradientDirection(prompt: string): string {
  const lower = (prompt || "").toLowerCase();
  if (lower.includes("vertical") || lower.includes("top to bottom")) return "to bottom";
  if (lower.includes("horizontal") || lower.includes("left to right")) return "to right";
  if (lower.includes("diagonal") || lower.includes("corner")) return "to bottom right";
  if (lower.includes("radial") || lower.includes("circle")) return "circle";
  if (lower.includes("top")) return "to bottom";
  if (lower.includes("bottom")) return "to top";
  if (lower.includes("left")) return "to right";
  if (lower.includes("right")) return "to left";
  return "to right";
}

/**
 * detectGradientIntensity
 */
export function detectGradientIntensity(prompt: string): number {
  const lower = (prompt || "").toLowerCase();
  if (lower.includes("subtle") || lower.includes("soft")) return 0.12;
  if (lower.includes("moderate") || lower.includes("medium")) return 0.35;
  if (lower.includes("strong") || lower.includes("intense") || lower.includes("deep")) return 0.6;
  return 0.28;
}

/**
 * formatBackgroundPrompt
 *
 * Builds a DALLE-safe prompt for either:
 *  - "patterned" -> strict seamless micro-pattern
 *  - "textured"  -> soft abstract texture (default for styles/themes)
 *
 * The prompt enforces negative rules to prevent:
 *  - any text / letters / numbers
 *  - logos, emblems, or icons
 *  - borders, frames, or heavy decorations
 *  - big shapes or illustrations
 *  - shadows, folds, wrinkles (photo artifacts)
 *
 * Include Canvas size so DALLE generates the correct aspect.
 */
export function formatBackgroundPrompt(
  userPrompt: string,
  canvasSize: CertificateSize,
  mode: "patterned" | "textured"
): string {
  // sanitize: remove words that encourage frames or certificates too specifically
  const safePrompt = (userPrompt || "")
    .replace(/certificate|border|frame|award|design/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // COMMON NEGATIVES (applied to both modes)
  const commonNegatives = [
    "no text",
    "no letters",
    "no words",
    "no numbers",
    "no logos",
    "no trademarks",
    "no symbols",
    "no icons",
    "no borders",
    "no frames",
    "no edges",
    "no signatures",
    "no stamps",
    "no big graphics",
    "no illustrations",
    "no photos of objects",
    "no people",
    "no faces",
    "no shadows",
    "no folds",
    "no wrinkles",
    "no creases",
    "no harsh lighting",
  ];

  if (mode === "patterned") {
    // strict seamless micro-pattern
    // micro-patterns must be tileable, small-scale, low-contrast, decorative-only
    const prompt = `
High-quality seamless micro-pattern background inspired by: ${safePrompt}
Rules:
- Tiny repeating decorative elements only (micro-scale)
- Tileable / seamless (no visible seams)
- Low contrast, subtle density suitable for a certificate background
- Abstract or geometric micro motifs (very small)
- Do NOT include any large shapes, icons, illustrations, or figurative elements
- Do NOT include gradients, text, numbers, logos, borders, or frames
- No metallic or shiny objects that look like stickers or logos
- Even, neutral lighting; no dramatic shadows or photographic artifacts
Negative prompt: ${commonNegatives.join(", ")}
Canvas: ${canvasSize.width}x${canvasSize.height} px
Return: single seamless texture image suitable for tiling or full-bleed background.
    `.trim();

    return prompt;
  }

  // TEXTURED MODE (soft abstract texture; default for style/theme-only prompts)
  const texturedPrompt = `
High-quality soft subtle background texture inspired by: ${safePrompt}
Rules:
- Soft, natural texture only (paper grain, linen, light fiber, soft brushed or matte finish)
- No repeating motifs or obvious tiling patterns
- No sharp geometry, no ornaments, no decorative motifs
- No illustrations, no photos, no figures, no animals, no faces
- No text, letters, numbers, logos, icons, or emblems
- No borders, frames, lines, or heavy decorations
- No harsh shadows, no folds, no creases, no reflections
- Low-contrast, non-distracting, even lighting; suitable behind text
Negative prompt: ${commonNegatives.join(", ")}
Canvas: ${canvasSize.width}x${canvasSize.height} px
Return: single seamless-ish soft texture image that looks natural and unobtrusive as a certificate background.
  `.trim();

  return texturedPrompt;
}
