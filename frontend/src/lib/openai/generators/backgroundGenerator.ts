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

// ✅ Import the new storage utility
import { uploadDalleImageToSupabase } from "../../storageUtils";
import { supabase } from "../../supabaseClient"; 

/**
* generateBackground
*
* - Hybrid Smart Mode:
* * pattern -> patterned (strict micro-pattern)
* * texture -> textured (soft paper/linen)
* * gradient -> css-only
* * plain -> solid color
* * NOTHING specific (style/theme words only) -> default to soft abstract texture (DALLE)
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
 const detected = detectBackgroundType(userPrompt);


 // 2) Extract colors from prompt (if present)
 const extractedColors = extractColors(userPrompt);
 const isMultiColor = extractedColors.length >= 2;


 // 3) Gradient -> CSS only (no DALLE)
 if (detected === "gradient") {
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


 // 5) For "textured" or "patterned" -> DALLE Generation
 let dalleMode: "patterned" | "textured" = "textured";
 if (detected === "patterned") dalleMode = "patterned";
 else if (detected === "textured") dalleMode = "textured";
 else dalleMode = "textured"; 


 const forceTextured =
   dalleMode === "textured" || (isMultiColor && dalleMode === "patterned" === false);


 try {
   const augmentedPrompt = `${userPrompt}. Mode: ${
     forceTextured ? "textured" : "patterned"
   } (strict certificate-safe rules)`;
   
   const backgroundPrompt = formatBackgroundPrompt(
     augmentedPrompt,
     canvasSize,
     forceTextured ? "textured" : "patterned"
   );


   const imageSize = determineImageSize(canvasSize.width, canvasSize.height);
   
   // 🟢 STEP A: Get Base64 from DALL-E (Updated Utils)
   const base64Data = await generateImageWithDALLE(backgroundPrompt, imageSize);
   
   if (!base64Data) throw new Error("No image data returned from DALL-E");

   // 🟢 STEP B: Upload to Supabase to get a short URL
   // Using a default ID or guest since this runs in a generator context
   const { data: userData } = await supabase.auth.getUser();
   const userId = userData.user?.id || "guest";
   
   const permanentUrl = await uploadDalleImageToSupabase(base64Data, userId);

   if (!permanentUrl) throw new Error("Failed to upload background to permanent storage");

   elements.push({
     id: `background-${Date.now()}`,
     type: "background",
     x: 0,
     y: 0,
     width: canvasSize.width,
     height: canvasSize.height,
     zIndex: 1,
     imageUrl: permanentUrl, // ✅ Assign the clean URL, NOT the Base64 string
     opacity: 1,
   });


   return elements;
 } catch (err) {
   console.error("Background Generation Error:", err);
   // fallback to a neutral soft color
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