// src/lib/openai/openai.ts


import { generateBackground } from "./generators/backgroundGenerator";
import { generateBorder } from "./generators/borderGenerator";
import { generateCertificateDetails } from "./generators/textGenerator";
import { CertificateElement } from "../../types/certificate";
import { generateInnerFrame } from "./generators/innerFrameGenerator";
import { SIZE_MAP, INCH_TO_PX } from "./utils/sizeUtils";
import { generateCornerFrame } from "./generators/cornerFrameGenerator";


export async function generateCertificateElements(
 userPrompt: string,
 selectedSize: string = "a4-landscape"
): Promise<CertificateElement[]> {
 const elements: CertificateElement[] = [];


 console.log("🧩 Starting certificate element generation...");
 const canvasSize = SIZE_MAP[selectedSize] || SIZE_MAP["a4-landscape"];






 // 🔥 FIXED: margin must exist here for border + text layouts
 const margin = INCH_TO_PX * 0.7;


 try {
   // -----------------------------------------------------
   // 1️⃣ BACKGROUND
   // -----------------------------------------------------
   console.log("🎨 Step 1: Generating background...");
   const backgroundElements = await generateBackground(userPrompt, selectedSize);
   elements.push(...backgroundElements);
   console.log("✅ Background added.");


   // -----------------------------------------------------
   // 2️⃣ INNER FRAME (White rectangle)
   // -----------------------------------------------------
  // -----------------------------




console.log("⬜ Step 2: Adding inner white frame...");
const innerFrameElements = await generateInnerFrame(selectedSize);
elements.push(...innerFrameElements);
console.log("✅ Inner white frame added.");




   // -----------------------------------------------------
   // 3️⃣ BORDER
   // -----------------------------------------------------
   console.log("🖋️ Step 3: Generating border...");
   const borderElements = await generateBorder(userPrompt, selectedSize);


   borderElements.forEach((b) => {
     b.x = margin;
     b.y = margin;
     b.width = canvasSize.width - margin * 2;
     b.height = canvasSize.height - margin * 2;
     b.zIndex = 2;
   });


   elements.push(...borderElements);
   console.log("✅ Border added.");


// -----------------------------------------------------
// 3.5️⃣ CORNER FRAMES  (THIS WAS MISSING)
// -----------------------------------------------------
console.log("🟪 Step 3.5: Generating corner frames...");

try {
  const cornerFrames = await generateCornerFrame(userPrompt, selectedSize);
  elements.push(...cornerFrames);
  console.log("✅ Corner frames added.");
} catch (err) {
  console.error("❌ Failed to generate corner frames:", err);
}



   // -----------------------------------------------------
   // 4️⃣ TEXT DETAILS
   // -----------------------------------------------------
   console.log("📝 Step 4: Generating certificate details...");


   // -----------------------------
   // Portrait-specific overrides
   // -----------------------------
   const portraitOverrides = {
     // Header
     inst:      { portraitOffset: { } },
     dept:      { portraitOffset: { } },
     loc:       { portraitOffset: { } },


     // Body
     opening:   { portraitOffset: { } },
     title:     { portraitOffset: { y: -10 } },
     preRec:    { portraitOffset: { y: -40 } },
     recName:   { portraitOffset: { y: -70 } },
     purpose:   { portraitOffset: { y: -110 } },
     role:      { portraitOffset: { y: -100 } },
     event:     { portraitOffset: { y: -110 } },
     date:      { portraitOffset: { y: -160 } },


     // Signatures
     "sig-0":   { portraitOffset: { } },
     "sig-1":   { portraitOffset: { } },
     "sig-2":   { portraitOffset: { } },
     "sig-3":   { portraitOffset: { } },
   };


   const detailElements = await generateCertificateDetails(
     userPrompt,
     selectedSize,
     {
       x: margin,
       y: margin,
       width: canvasSize.width - margin * 2,
       height: canvasSize.height - margin * 2,
     },
     portraitOverrides // ← pass overrides here
   );


   elements.push(...detailElements);
   console.log("✅ Certificate text details added.");


 } catch (error) {
   console.error("❌ Error while generating certificate elements:", error);
 }


 console.log(`🎉 Finished generating ${elements.length} total elements.`);
 return elements;
}


