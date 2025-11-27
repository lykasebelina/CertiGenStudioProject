// src/lib/openai/generators/innerFrameGenerator.ts

import { CertificateElement } from "../../../types/certificate";
import { SIZE_MAP, INCH_TO_PX } from "../utils/sizeUtils";

export async function generateInnerFrame(
  selectedSize: string = "a4-landscape"
): Promise<CertificateElement[]> {
  const canvasSize = SIZE_MAP[selectedSize] || SIZE_MAP["a4-landscape"];
  const elements: CertificateElement[] = [];

  const margin = INCH_TO_PX * 0.7;

  const innerFrame: CertificateElement = {
    id: `inner-frame-${Date.now()}`,
    type: "innerFrame",
    x: margin,
    y: margin,
    width: canvasSize.width - margin * 2,
    height: canvasSize.height - margin * 2,
    zIndex: 3,
    backgroundColor: "#ffffff",
    opacity: 1,

    // ⭐ Make the inner frame selectable
    selectable: true,
    draggable: false, // usually inner frame should not move, but selectable for click events
  };

  elements.push(innerFrame);
  return elements;
}
