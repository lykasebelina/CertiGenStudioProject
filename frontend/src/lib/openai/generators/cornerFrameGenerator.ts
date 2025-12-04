// src/utils/cornerFrameGenerator.ts

import { CertificateElement } from "../../../types/certificate";
import { SIZE_MAP } from "../utils/sizeUtils";
import { extractCornerFrameColors, detectCornerFrameStyle } from "../utils/cornerFrameColorUtils";
import { formatCornerFramePrompt } from "../utils/cornerFramePromptUtils";
import { generateImageWithDALLE, determineImageSize } from "../utils/dalleUtils";

// ✅ Import storage utils
import { uploadDalleImageToSupabase } from "../../storageUtils";
import { supabase } from "../../supabaseClient";

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

  const baseSize = Math.max(canvasSize.width, canvasSize.height);
  const cornerSize = Math.floor(baseSize * 0.3); 
  const offset = Math.floor(cornerSize * 0.5); 

  // Define positions for four corners
  const positions: { id: Corner; x: number; y: number }[] = [
    { id: "tl", x: -offset, y: -offset },
    { id: "tr", x: canvasSize.width - cornerSize + offset, y: -offset },
    { id: "bl", x: -offset, y: canvasSize.height - cornerSize + offset },
    { id: "br", x: canvasSize.width - cornerSize + offset, y: canvasSize.height - cornerSize + offset },
  ];

  const rotationMap: Record<Corner, number> = {
    tl: 45,   // top-left
    tr: 135,  // top-right
    bl: 315,  // bottom-left
    br: 225,  // bottom-right
  };

  // Always attempt to generate a DALL·E image for the corner frame (PRIORITIZED)
  let finalImageUrl: string | null = null;
  
  try {
    const dallePrompt = formatCornerFramePrompt(userPrompt, colors, style);
    const imageSize = determineImageSize(cornerSize, cornerSize);
    
    // 🟢 STEP A: Get Base64
    const base64Data = await generateImageWithDALLE(dallePrompt, imageSize);

    if (base64Data) {
      // 🟢 STEP B: Upload to Supabase
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || "guest";

      const permanentUrl = await uploadDalleImageToSupabase(base64Data, userId);
      
      if (permanentUrl) {
          finalImageUrl = permanentUrl; // ✅ Success: Use the short URL
      }
    }
  } catch (err) {
    console.error("DALL·E Corner Frame error, fallback to CSS:", err);
    finalImageUrl = null; // Fallback to CSS color if DALL-E fails
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
      zIndex: 4,
      opacity: 1,
      // If we have a final image URL, use it. Otherwise fall back to color.
      backgroundColor: finalImageUrl ? undefined : colors[index % colors.length],
      imageUrl: finalImageUrl ?? undefined,
      rotate: rotationMap[pos.id],
      metadata: { corner: pos.id, isCornerFrame: true },
    });
  });

  return elements;
}