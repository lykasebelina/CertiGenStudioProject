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
Generate a **seamless decorative corner-frame tile** for a certificate.  
The design must COPY the style of premium certificate corner decorations.

STYLE RULES (very strict):
- Structure must be made ONLY of **lines**, **strokes**, **angled strips**, **layered bars**, or **thin filigree curls**
- Patterns must resemble:
  • angled metallic ribbon accents  
  • layered geometric strips  
  • thin decorative filigree corner curls  
  • multi-line repeated abstract patterns  
- NO objects, NO symbols, NO icons, NO flowers, NO leaves, NO illustrations
- NO text, NO borders, NO shadows, NO fake 3D  
- Flat digital art only
- NO gradients unless created purely by **line density**
- Should feel like a **premium certificate corner decoration**, NOT a wallpaper

GEOMETRY RULES:
- The tile must be **perfectly seamless**
- Must look good when rotated 45° for corner placement
- Use mostly **diagonal / angled strokes**, **thin outlines**, **layered bands**
- Avoid center-focused or circular mandala-type layouts

COLOR RULES:
- Use ONLY this palette: ${colors.join(", ")}
- Metallic style allowed as long as it remains flat-digital (no photo textures)

INTENSITY:
- Apply ${intensity} visual weight

USER THEME / INTENT:
"${userPrompt}"

This artwork will be rotated and placed at 4 certificate corners.
`;
}
