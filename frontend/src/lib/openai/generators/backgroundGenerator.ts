// ================================
// src/lib/openai/generators/backgroundGenerator.ts
// Hybrid Smart Mode — full file replacement
// ================================


import { CertificateElement } from "../../../types/certificate";
import { SIZE_MAP } from "../utils/sizeUtils";
import {
 detectBackgroundType,
 detectGradientDirection,
 detectGradientIntensity,
 formatBackgroundPrompt,
} from "../utils/backgroundPromptUtils";
import {
 extractColors,
 adjustBaseColor,
 adjustColor,
} from "../utils/backgroundColorUtils";
import { generateImageWithDALLE, determineImageSize } from "../utils/dalleUtils";


/**
* generateBackground
*
* - Hybrid Smart Mode:
*   * pattern -> patterned (strict micro-pattern)
*   * texture -> textured (soft paper/linen)
*   * gradient -> css-only
*   * plain -> solid color
*   * NOTHING specific (style/theme words only) -> default to soft abstract texture (DALLE)
*/
export async function generateBackground(
 userPrompt: string,
 selectedSize: string
): Promise<CertificateElement[]> {
 const canvasSize = SIZE_MAP[selectedSize] || SIZE_MAP["a4-landscape"];
 const elements: CertificateElement[] = [];


 const lower = (userPrompt || "").toLowerCase();


 // 0) explicit NO background requests
 const noBgRegex =
   /\b(no background|without background|no bg|transparent background|border only|no fill behind text)\b/i;
 if (noBgRegex.test(userPrompt)) {
   elements.push({
     id: `background-${Date.now()}`,
     type: "background",
     x: 0,
     y: 0,
     width: canvasSize.width,
     height: canvasSize.height,
     zIndex: 1,
     opacity: 1,
     backgroundColor: "transparent",
   });
   return elements;
 }


 // 1) Detect background type via utility
 // detectBackgroundType now understands explicit keywords and style/theme fallbacks
 const detected = detectBackgroundType(userPrompt);


 // 2) Extract colors from prompt (if present)
 const extractedColors = extractColors(userPrompt);
 const isMultiColor = extractedColors.length >= 2;


 // 3) Gradient -> CSS only (no DALLE)
 if (detected === "gradient") {
   // If user supplied colors, use them. Otherwise fallback to neutral gradient.
   const baseColors = extractedColors.length
     ? extractedColors.map((c) => adjustBaseColor(c, userPrompt))
     : ["#f8f8f8", "#efefef"];


   const direction = detectGradientDirection(userPrompt);
   const intensity = detectGradientIntensity(userPrompt);


   let gradientColors = [...baseColors];


   if (gradientColors.length === 1) {
     gradientColors = [
       adjustColor(gradientColors[0], -0.08),
       adjustColor(gradientColors[0], 0.22),
     ];
   } else if (gradientColors.length > 1) {
     gradientColors = [
       adjustColor(gradientColors[0], intensity / 2),
       adjustColor(gradientColors[1], -intensity / 2),
     ];
   }


   const style =
     direction === "circle"
       ? `radial-gradient(${gradientColors[0]}, ${gradientColors[1]})`
       : `linear-gradient(${direction}, ${gradientColors[0]}, ${gradientColors[1]})`;


   elements.push({
     id: `background-${Date.now()}`,
     type: "background",
     x: 0,
     y: 0,
     width: canvasSize.width,
     height: canvasSize.height,
     zIndex: 1,
     imageUrl: style,
     opacity: 1,
   });


   return elements;
 }


 // 4) Plain solid color -> CSS only
 if (detected === "plain") {
   const baseColor = extractedColors.length
     ? adjustBaseColor(extractedColors[0], userPrompt)
     : "#ffffff";


   elements.push({
     id: `background-${Date.now()}`,
     type: "background",
     x: 0,
     y: 0,
     width: canvasSize.width,
     height: canvasSize.height,
     zIndex: 1,
     backgroundColor: baseColor,
     opacity: 1,
   });


   return elements;
 }


 // 5) For "textured" or "patterned" or DEFAULT (style-only) -> use DALLE but with strict mode
 // determine mode: patterned (micro-pattern) vs textured (soft texture)
 // detectBackgroundType returns "textured" for texture, "patterned" if pattern keywords present,
 // otherwise for style-only it returns "textured" (safe default).
 let dalleMode: "patterned" | "textured" = "textured";
 if (detected === "patterned") dalleMode = "patterned";
 else if (detected === "textured") dalleMode = "textured";
 else dalleMode = "textured"; // safe fallback for style-only/theme-only prompts


 // If user asked multi-color without gradient, prefer "textured" DALLE for soft blending
 const forceTextured =
   dalleMode === "textured" || (isMultiColor && dalleMode === "patterned" === false);


 try {
   // Build a clear augmented prompt describing mode and strict negative rules
   // formatBackgroundPrompt will create a DALLE-safe prompt based on mode
   const augmentedPrompt = `${userPrompt}. Mode: ${
     forceTextured ? "textured" : "patterned"
   } (strict certificate-safe rules)`;
   const backgroundPrompt = formatBackgroundPrompt(
     augmentedPrompt,
     canvasSize,
     forceTextured ? "textured" : "patterned"
   );


   const imageSize = determineImageSize(canvasSize.width, canvasSize.height);
   const imageUrl = await generateImageWithDALLE(backgroundPrompt, imageSize);


   elements.push({
     id: `background-${Date.now()}`,
     type: "background",
     x: 0,
     y: 0,
     width: canvasSize.width,
     height: canvasSize.height,
     zIndex: 1,
     imageUrl,
     opacity: 1,
   });


   return elements;
 } catch (err) {
   // fallback to a neutral soft color fill to avoid throwing
   elements.push({
     id: `background-${Date.now()}`,
     type: "background",
     x: 0,
     y: 0,
     width: canvasSize.width,
     height: canvasSize.height,
     zIndex: 1,
     backgroundColor: "#fafafa",
     opacity: 1,
   });
   return elements;
 }
}




