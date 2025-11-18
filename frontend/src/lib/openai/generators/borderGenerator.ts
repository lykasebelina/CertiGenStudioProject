// src/lib/openai/generators/borderGenerator.ts

import { CertificateElement } from "../../../types/certificate";
import { SIZE_MAP } from "../utils/sizeUtils";
import {
  detectBorderThickness,
} from "../utils/borderPromptUtils"; // NOTE: detectBorderType removed from import
import {
  extractBorderColor,
  ensureContrast,
  shadeColor,
} from "../utils/borderColorUtils";
// NOTE: Imports for dalleUtils removed

export async function generateBorder(
  userPrompt: string,
  selectedSize: string = "a4-landscape"
): Promise<CertificateElement[]> {
  const canvasSize = SIZE_MAP[selectedSize] || SIZE_MAP["a4-landscape"];
  const elements: CertificateElement[] = [];

  // 🧭 Step 0: Skip if user requested no border
  if (/\b(no border|without border|remove border|borderless)\b/i.test(userPrompt)) {
    console.log("🚫 Border skipped as per user prompt.");
    return [];
  }

  // NOTE: detectBorderType check removed, as we only support 'simple' CSS border now.
  const thickness = detectBorderThickness(userPrompt);
  const rawColor = extractBorderColor(userPrompt) || "#000000";

  // Default background is white; if background element exists, use that
  // NOTE: Since this function only generates border, it can't reliably find a previously generated 'background'
  // It's safer to use the background color from the prompt or default to white, but maintaining existing contrast logic:
  const backgroundElement = elements.find((e) => e.type === "background");
  const bgColor = backgroundElement?.backgroundColor || "#FFFFFF";
  const color = ensureContrast(rawColor, bgColor);

  console.log("🖋️ Generating simple CSS border...");

  const inset = thickness * 2;
  let style = "solid";
  const lower = userPrompt.toLowerCase();

  // Determine border style
  if (lower.includes("double")) style = "double";
  else if (lower.includes("dotted")) style = "dotted";
  else if (lower.includes("dashed")) style = "dashed";

  // For "double" style, use outer/inner color shading
  const adjustedColor =
    style === "double" ? shadeColor(color, -30) : color;

  elements.push({
    id: `border-${Date.now()}`,
    type: "border",
    x: inset,
    y: inset,
    width: canvasSize.width - inset * 2,
    height: canvasSize.height - inset * 2,
    zIndex: 2,
    opacity: 1,
    content: `${thickness}px ${style} ${adjustedColor}`, // CSS content format
  });

  console.log(`✅ ${thickness}px ${style} ${adjustedColor} border generated`);

  return elements;
}