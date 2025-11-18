
// ================================
// src/lib/openai/utils/backgroundPromptUtils.ts (PATCHED)
// ================================
import type { CertificateSize } from "./sizeUtils";


export function detectBackgroundType(prompt: string): "plain" | "textured" | "gradient" {
 const lower = prompt.toLowerCase();


 if (lower.includes("gradient")) return "gradient";


 const textureHints = [
   "texture", "paper", "grain", "fabric", "canvas", "linen", "rough", "parchment",
 ];


 const plainHints = [
   "plain", "solid", "flat", "simple", "minimal", "no texture", "clean", "monotone",
 ];


 const colorHint = /\b(pastel|cream|navy|blue|peach|gold|white|black|gray|red|green|beige|ivory)\b/i.test(lower);


 if (textureHints.some(w => lower.includes(w))) return "textured";
 if (plainHints.some(w => lower.includes(w)) || colorHint) return "plain";


 return "plain";
}


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


export function detectGradientIntensity(prompt: string): number {
 const lower = prompt.toLowerCase();
 if (lower.includes("subtle") || lower.includes("soft")) return 0.15;
 if (lower.includes("moderate") || lower.includes("medium")) return 0.35;
 if (lower.includes("strong") || lower.includes("intense") || lower.includes("deep")) return 0.6;
 return 0.3;
}


/** MODE-AWARE PROMPT GENERATOR */
export function formatBackgroundPrompt(
 userPrompt: string,
 canvasSize: CertificateSize,
 mode: "patterned" | "textured"
): string {
 const safePrompt = userPrompt
   .replace(/certificate|border|frame|award|design/gi, "")
   .trim();


 if (mode === "textured") {
   return `
A high-quality softly textured background in ${safePrompt} style.
Design characteristics:
- Subtle natural texture (paper grain, linen, matte, soft fibers)
- No geometric patterns
- No repeated shapes
- No ornaments or motifs
- No borders or frames
- No logos, text, or numbers
Visual style:
- Clean, elegant, premium
- Smooth, subtle, softly lit
Negative prompt:
- geometric patterns, tiles, squares, rectangles
- ornaments, motifs
Canvas size: ${canvasSize.width}x${canvasSize.height}px
   `;
 }


 return `
A high-quality digital certificate background in ${safePrompt} style.
Design characteristics:
- Modern geometric layout with subtle rectangular or square panel sections
- Soft digital texture (fabric, linen, brushed, matte, or smooth grain)
- Balanced professional color palette (navy, royal blue, pastel, cream)
- Optional metallic gold accent lines
- Even studio lighting
- No borders, text, letters, folds, or wrinkles
Visual style:
- Clean, elegant, premium
- Minimal but modern
- Fully abstract, pattern-based design
Negative prompt:
- photo of real paper
- shadows, folds, corners, edges
Canvas size: ${canvasSize.width}x${canvasSize.height}px
 `;
}
