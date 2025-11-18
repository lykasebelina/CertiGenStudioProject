// src/lib/openai/generators/backgroundGenerator.ts


import { CertificateElement } from "../../../types/certificate";
import { SIZE_MAP } from "../utils/sizeUtils";
import {
 detectBackgroundType,
 detectGradientDirection,
 detectGradientIntensity,
 formatBackgroundPrompt,
} from "../utils/backgroundPromptUtils";
import { extractColors, adjustBaseColor, adjustColor } from "../utils/backgroundColorUtils";
import { generateImageWithDALLE, determineImageSize } from "../utils/dalleUtils";


export async function generateBackground(
 userPrompt: string,
 selectedSize: string
): Promise<CertificateElement[]> {
 const canvasSize = SIZE_MAP[selectedSize] || SIZE_MAP["a4-landscape"];
 const elements: CertificateElement[] = [];


 const lower = userPrompt.toLowerCase();


 // -------------------------------------------------
 // 1) NO BACKGROUND REQUEST
 // -------------------------------------------------
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
     backgroundColor: "#ffffff",
   });
   return elements;
 }


 // -------------------------------------------------
 // 2) CLASSIFICATION KEYWORDS
 // -------------------------------------------------


 const patternKeywords = [
   "pattern", "patterned", "ornamental", "decorative", "motif", "seamless",
   "geometric pattern", "panel", "blocks", "squares", "geometric blocks",
   "modern pattern", "certificate background", "premium background",
   "abstract pattern", "striped pattern"
 ];


 const textureKeywords = [
   "texture", "textured", "grain", "grunge", "rough", "paper texture",
   "vintage texture", "linen", "brushed", "matte", "smooth grain",
   "digital texture", "fabric texture"
 ];


 const gradientKeywords = ["gradient", "ombre", "fade"];


 const plainKeywords = [
   "plain", "solid", "flat", "simple", "clean", "minimal", "minimalist",
   "single color", "white background", "blank background", "solid color"
 ];


 const colorKeywords = [
   "white", "black", "cream", "peach", "navy", "gold", "blue", "red",
   "gray", "grey", "beige", "pastel", "light", "pale", "olive"
 ];


 const mentionsPattern = patternKeywords.some(k => lower.includes(k));
 const mentionsTexture = textureKeywords.some(k => lower.includes(k));
 const mentionsGradient = gradientKeywords.some(k => lower.includes(k));
 const mentionsPlain =
   plainKeywords.some(k => lower.includes(k)) ||
   colorKeywords.some(k => lower.includes(k));


 // Extract colors (for MC-3 multi-color logic)
 const extractedColors = extractColors(userPrompt);
 const isMultiColor = extractedColors.length >= 2;


 // Multi-color + NO “gradient” → DALL·E (Option C + MC-3)
 const isMultiColorNonGradient = isMultiColor && !mentionsGradient;


 // Handle textured gradients
 const mentionsTexturedGradient = mentionsGradient && (mentionsPattern || mentionsTexture);


 // -------------------------------------------------
 // 3) GRADIENT (PURE) → CSS
 // -------------------------------------------------
 if (mentionsGradient && !mentionsTexturedGradient && !isMultiColorNonGradient) {
   const backgroundType = detectBackgroundType(userPrompt);
   void backgroundType;


   const baseColors = extractedColors.map(c => adjustBaseColor(c, userPrompt));
   const direction = detectGradientDirection(userPrompt);
   const intensity = detectGradientIntensity(userPrompt);


   let gradientColors = [...baseColors];


   if (gradientColors.length === 1) {
     gradientColors = [
       adjustColor(gradientColors[0], -0.1),
       adjustColor(gradientColors[0], 0.3),
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
     opacity: 1,
     imageUrl: style,
   });


   return elements;
 }


 // -------------------------------------------------
 // 4) MULTI-COLOR (NO “gradient”) → FORCE DALLE
 // -------------------------------------------------
 if (isMultiColorNonGradient) {
   try {
     const augmentedPrompt = `${userPrompt}. Background style: textured or patterned background.`;


     const backgroundPrompt = formatBackgroundPrompt(augmentedPrompt, canvasSize);
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
     elements.push({
       id: `background-${Date.now()}`,
       type: "background",
       x: 0,
       y: 0,
       width: canvasSize.width,
       height: canvasSize.height,
       zIndex: 1,
       backgroundColor: "#ffffff",
       opacity: 1,
     });
     return elements;
   }
 }


 // -------------------------------------------------
 // 5) PLAIN (single color, no pattern/texture)
 // -------------------------------------------------
 if (mentionsPlain && !mentionsTexture && !mentionsPattern) {
   const backgroundType = detectBackgroundType(userPrompt);
   void backgroundType;


   const baseColors = extractedColors.map(c => adjustBaseColor(c, userPrompt));


   elements.push({
     id: `background-${Date.now()}`,
     type: "background",
     x: 0,
     y: 0,
     width: canvasSize.width,
     height: canvasSize.height,
     zIndex: 1,
     opacity: 1,
     backgroundColor: baseColors[0] || "#ffffff",
   });


   return elements;
 }


 // -------------------------------------------------
 // 6) DEFAULT TO DALLE (texture/pattern or ambiguous)
 // -------------------------------------------------


 const detected = detectBackgroundType(userPrompt);
 void detected;


 let dalleMode: "patterned" | "textured" = "textured";
 if (mentionsPattern) dalleMode = "patterned";
 if (mentionsTexture) dalleMode = "textured";
 if (!mentionsPattern && !mentionsTexture && !mentionsGradient && !mentionsPlain) {
   dalleMode = Math.random() > 0.5 ? "patterned" : "textured";
 }


 try {
   const augmentedPrompt = `${userPrompt}. Background style: ${dalleMode} background.`;
   const backgroundPrompt = formatBackgroundPrompt(augmentedPrompt, canvasSize);
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


 } catch (error) {
   elements.push({
     id: `background-${Date.now()}`,
     type: "background",
     x: 0,
     y: 0,
     width: canvasSize.width,
     height: canvasSize.height,
     zIndex: 1,
     backgroundColor: "#ffffff",
     opacity: 1,
   });
 }


 return elements;
}


