import type { CertificateSize } from "./sizeUtils";


/** Detects background type from prompt */
export function detectBackgroundType(prompt: string): "plain" | "textured" | "gradient" {
 const lower = prompt.toLowerCase();


 if (lower.includes("gradient")) return "gradient";


 const textureHints = [
   "texture", "paper", "grain", "fabric", "canvas", "pattern",
   "linen", "rough", "material", "vintage", "old", "aged",
   "fibers", "weave", "cotton", "texture background", "parchment", "texture bg",
 ];


 const plainHints = [
   "plain", "solid", "flat", "simple", "minimal", "no texture",
   "clean", "single color", "monotone",
 ];


 // ✅ If user says anything like “pastel”, “peach”, “cream”, “navy”, etc.
 // and doesn’t mention texture — treat it as plain color background
 const colorHint = /\b(pastel|cream|navy|blue|peach|gold|white|black|gray|red|green|beige|ivory)\b/i.test(lower);


 if (textureHints.some((w) => lower.includes(w))) return "textured";
 if (plainHints.some((w) => lower.includes(w)) || colorHint) return "plain";
  return "plain"; // ✅ safe default (was "textured" before)
}




/** Detects gradient direction keywords */
export function detectGradientDirection(prompt: string): string {
 const lower = prompt.toLowerCase();
 if (lower.includes("vertical")) return "to bottom";
 if (lower.includes("horizontal")) return "to right";
 if (lower.includes("diagonal")) return "to bottom right";
 if (lower.includes("radial")) return "circle";
 if (lower.includes("top")) return "to bottom";
 if (lower.includes("bottom")) return "to top";
 if (lower.includes("left")) return "to right";
 if (lower.includes("right")) return "to left";
 return "to right";
}


/** Detects intensity level from descriptive words */
export function detectGradientIntensity(prompt: string): number {
 const lower = prompt.toLowerCase();
 if (lower.includes("subtle") || lower.includes("soft")) return 0.15;
 if (lower.includes("moderate") || lower.includes("medium")) return 0.35;
 if (lower.includes("strong") || lower.includes("intense") || lower.includes("deep")) return 0.6;
 return 0.3;
}


/** Cleans and formats the prompt for texture generation (DALL·E) */
export function formatBackgroundPrompt(userPrompt: string, canvasSize: CertificateSize): string {
 const safePrompt = userPrompt
   .replace(/certificate|border|frame|award|design/gi, "")
   .trim();


 return `
A high-quality digital certificate background in ${safePrompt} style.
Design characteristics:
- Modern geometric layout with subtle rectangular or square panel sections
- Soft digital texture (fabric, linen, brushed, matte, or smooth grain)
- Balanced professional color palette (navy, royal blue, pastel, cream, etc.)
- Optional metallic gold accent lines or streaks
- Even studio lighting (no hard shadows)
- No borders or frames
- No text, words, or letters anywhere
- No realistic paper folds or wrinkles
- No highly detailed ornaments


Visual style:
- Clean, elegant, premium certificate background
- Minimal but modern and decorative
- Fully abstract, pattern-based design


Negative prompt:
- photo of real paper, crumpled paper
- shadows, corners, edges
- logos, symbols, letters, numbers


Canvas size: ${canvasSize.width}x${canvasSize.height}px
 `;
}
