// src/lib/openai/utils/borderPromptUtils.ts

// NOTE: import type { CertificateSize } from "./sizeUtils" is no longer needed
// NOTE: detectBorderType function removed
// NOTE: formatBorderPrompt function removed

/** Detects thickness keywords */
export function detectBorderThickness(prompt: string): number {
  const lower = prompt.toLowerCase();
  if (lower.includes("thin") || lower.includes("minimal")) return 2;
  if (lower.includes("medium") || lower.includes("regular")) return 5;
  if (lower.includes("thick") || lower.includes("bold")) return 10;
  if (lower.includes("double")) return 8;
  return 4; // default
}