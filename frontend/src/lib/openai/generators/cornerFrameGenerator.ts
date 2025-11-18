// src/lib/openai/generators/cornerFrameGenerator.ts

import { CertificateElement } from "../../../types/certificate";
import { SIZE_MAP } from "../utils/sizeUtils";
import {
  extractCornerFrameColors,
  detectCornerFrameStyle
} from "../utils/cornerFrameColorUtils";
import { formatCornerFramePrompt } from "../utils/cornerFramePromptUtils";
import { generateImageWithDALLE, determineImageSize } from "../utils/dalleUtils";

export async function generateCornerFrame(
  userPrompt: string,
  selectedSize: string
): Promise<CertificateElement[]> {

  console.log("🟦 CornerFrameGenerator → Start");
  console.log("User Prompt:", userPrompt);
  console.log("Selected Size:", selectedSize);

  const canvasSize = SIZE_MAP[selectedSize];
  const elements: CertificateElement[] = [];

  const colors = extractCornerFrameColors(userPrompt);
  const style = detectCornerFrameStyle(userPrompt);

  console.log("Extracted Colors:", colors);
  console.log("Detected Style:", style);

  const cornerSize = Math.floor(Math.min(canvasSize.width, canvasSize.height) * 0.50);

  const offset = Math.floor(cornerSize * 0.55); // adjust outward amount

  const positions: { id: "tl" | "tr" | "bl" | "br"; x: number; y: number }[] = [
    { id: "tl", x: -offset, y: -offset },
    { id: "tr", x: canvasSize.width - cornerSize + offset, y: -offset },
    { id: "bl", x: -offset, y: canvasSize.height - cornerSize + offset },
    { id: "br", x: canvasSize.width - cornerSize + offset, y: canvasSize.height - cornerSize + offset }
  ];

  // ✅ FIX: Rotation mapping so SIDE A always faces inward
  const rotationMap: Record<"tl" | "tr" | "bl" | "br", number> = {
    tl: 45,     // top-left → inward
    tr: 135,    // top-right → inward
    bl: 315,    // bottom-left → inward
    br: 225     // bottom-right → inward
  };

  let imageUrl: string | null = null;

  // Decide: CSS fill OR DALL·E pattern
  console.log(
    "Decision →",
    style.useDallePattern ? "Use DALL·E for corner frame" : "Use CSS color fill"
  );

  if (style.useDallePattern) {
    try {
      console.log("🟧 Generating DALL·E pattern...");
      const dallePrompt = formatCornerFramePrompt(userPrompt, colors, style);

      console.log("DALL·E Prompt:", dallePrompt);

      const imageSize = determineImageSize(cornerSize, cornerSize);
      console.log("Requested Image Size:", imageSize);

      imageUrl = await generateImageWithDALLE(dallePrompt, imageSize);

      console.log("DALL·E Image URL:", imageUrl);
    } catch (err) {
      console.error("❌ DALL·E error — fallback to CSS fill:", err);
      imageUrl = null;
    }
  }

  // Create four corners
  positions.forEach((pos, index) => {
    elements.push({
      id: `cornerFrame-${pos.id}-${Date.now()}`,
      type: "cornerFrame",
      x: pos.x,
      y: pos.y,
      width: cornerSize,
      height: cornerSize,
      zIndex: 6,
      opacity: 1,

      // CSS fallback when no image
      backgroundColor: imageUrl ? undefined : colors[index % colors.length],
      imageUrl: imageUrl ?? undefined,

      // ✅ USE THE FIXED ROTATION HERE
      rotate: rotationMap[pos.id],

      metadata: {
        corner: pos.id,
        isCornerFrame: true
      }
    });
  });

  console.log("🟩 CornerFrame Elements Generated:", elements);

  console.log(
    "CornerFrame Generation Complete →",
    imageUrl ? "DALL·E pattern applied" : "CSS solid colors applied"
  );

  return elements;
}
