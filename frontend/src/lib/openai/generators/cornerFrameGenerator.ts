import { CertificateElement } from "../../../types/certificate";
import { SIZE_MAP } from "../utils/sizeUtils";
import { extractCornerFrameColors, detectCornerFrameStyle } from "../utils/cornerFrameColorUtils";
import { formatCornerFramePrompt } from "../utils/cornerFramePromptUtils";
import { generateImageWithDALLE, determineImageSize } from "../utils/dalleUtils";

type Corner = "tl" | "tr" | "bl" | "br";

export async function generateCornerFrame(
  userPrompt: string,
  selectedSize: string
): Promise<CertificateElement[]> {
  const canvasSize = SIZE_MAP[selectedSize];
  const elements: CertificateElement[] = [];

  // Extract colors & style from user prompt
  const colors = extractCornerFrameColors(userPrompt);
  const style = detectCornerFrameStyle(userPrompt);

  // Determine corner frame size & offset
  const cornerSize = Math.floor(Math.min(canvasSize.width, canvasSize.height) * 0.5);
  const offset = Math.floor(cornerSize * 0.55); // outward adjustment

  // Define positions for four corners
  const positions: { id: Corner; x: number; y: number }[] = [
    { id: "tl", x: -offset, y: -offset },
    { id: "tr", x: canvasSize.width - cornerSize + offset, y: -offset },
    { id: "bl", x: -offset, y: canvasSize.height - cornerSize + offset },
    { id: "br", x: canvasSize.width - cornerSize + offset, y: canvasSize.height - cornerSize + offset },
  ];

  // Rotation for each corner to make it face inward
  const rotationMap: Record<Corner, number> = {
  
    tl: 45,   // top-left
    tr: 135,  // top-right
    bl: 315,  // bottom-left
    br: 225,  // bottom-right
  };

  // Optionally generate a DALL·E image for the corner frame
  let imageUrl: string | null = null;
  if (style.useDallePattern) {
    try {
      const dallePrompt = formatCornerFramePrompt(userPrompt, colors, style);
      const imageSize = determineImageSize(cornerSize, cornerSize);
      imageUrl = await generateImageWithDALLE(dallePrompt, imageSize);
    } catch (err) {
      console.error("DALL·E error, fallback to CSS:", err);
      imageUrl = null;
    }
  }

  // Create the four corner frame elements
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
      backgroundColor: imageUrl ? undefined : colors[index % colors.length],
      imageUrl: imageUrl ?? undefined,
      rotate: rotationMap[pos.id],
      metadata: { corner: pos.id, isCornerFrame: true },
    });
  });

  return elements;
}
