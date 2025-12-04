// src/lib/openai/utils/cornerFramePromptUtils.ts

export function formatCornerFramePrompt(
  userPrompt: string,
  colors: string[],
  style: { subtle: boolean; bold: boolean }
): string {

  const intensity = style.subtle
    ? "soft, thin, low-contrast"
    : style.bold
      ? "bold, high-contrast, crisp"
      : "moderate-weight clean";

  return `
Create a **seamless, rich, high-quality surface texture pattern** based on: "${userPrompt}".

STYLE RULES (CRITICAL):
- OUTPUT: Pure, consistent, tactile surface texture.
- Structure must be made ONLY of **rich, layered textures**.
- Textures must resemble **vintage paper**, **grained wood**, **intricate textile**, **fine etched metal**, or similar thematic organic material finish.
- The image must integrate perfectly with the certificate theme.
- Should feel like a **premium textured decoration**.

GEOMETRY RULES:
- The tile must be **perfectly seamless**
- Must look good when rotated 45° for corner placement
- Use mostly **textured layering**.
- Avoid center-focused or circular mandala-type layouts

NEGATIVE CONSTRAINTS (STRICTLY FORBIDDEN):
- **STRICTLY NO GRADIENTS, NO FADES, NO COLOR BLENDING.**
- **NO BORDERS, NO LINES, NO OUTLINES.**
- **NO FRAMES, NO VIGNETTES.**
- **NO DRAWN GRAPHICS, NO ILLUSTRATIONS.**
- **NO GEOMETRIC SHAPES, NO ABSTRACT FORMS.**
- **NO TEXT, NO NUMBERS, NO GARBLED TEXT.**
- NO big graphics, NO objects, NO symbols, NO icons, NO flowers, NO leaves, NO real certificates.

COLOR RULES:
- Use ONLY this palette: ${colors.join(", ")}
- **Textured metallic styles are allowed** to match the theme.

INTENSITY:
- Apply ${intensity} visual weight

USER THEME / INTENT (MANDATORY ALIGNMENT):
"${userPrompt}"

This artwork will be rotated and placed at 4 certificate corners.
`;
}