// src/lib/openai/utils/textLayoutUtils.ts 
//SIGNATURE TWEAKING

import { CertificateElement } from "../../../types/certificate";
import { SPACING_MAP } from "../utils/textFontAndSpacingUtils";



export function centerTextElement(
  element: CertificateElement,
  frameX: number,
  frameWidth: number,
  y: number
): CertificateElement {
  return {
    ...element,
    x: frameX + frameWidth / 2,
    y,
    align: "center",
    textAlign: "center",
  };
}

export function positionSignaturesAdvanced(
  signatures: CertificateElement[],
  frameX: number,
  frameY: number,
  frameWidth: number,
  frameHeight: number,
  isLandscape: boolean
): CertificateElement[] {
  const count = signatures.length;

  const bottomY = frameY + frameHeight * (isLandscape ? 0.83 : 0.86);
  const rowGap = frameHeight * SPACING_MAP.signatureRowGap;

  const leftX = frameX + frameWidth * (isLandscape ? 0.25 : 0.23); //up close down wide
  const rightX = frameX + frameWidth * (isLandscape ? 0.75 : 0.77); //down close up wide
  const centerX = frameX + frameWidth * 0.50;

  const indentLeft = frameX + frameWidth * (isLandscape ? 0.33 : 0.31);
  const indentRight = frameX + frameWidth * (isLandscape ? 0.67 : 0.69);

  if (count === 1) {
    signatures[0].x = centerX;
    signatures[0].y = bottomY;
  }

  else if (count === 2) {
    if (isLandscape) {
      // L, R on row 1
      signatures[0].x = leftX;
      signatures[0].y = bottomY;

      signatures[1].x = rightX;
      signatures[1].y = bottomY;

      //signatures[0].y = signatures[1].y = bottomY //- rowGap;
      
    } else {
      // Portrait: row 1 center, row 2 center
      signatures[0].x = centerX;
      signatures[1].x = centerX;
      signatures[0].y = bottomY - rowGap;
      signatures[1].y = bottomY;
    }
  }

  else if (count === 3) {
    if (isLandscape) {
      // row 1 center, row 1 center, row 2 center
      signatures[0].x = leftX;
      signatures[0].y = bottomY - rowGap;
      
      signatures[1].x = rightX;
      signatures[1].y = bottomY - rowGap;

      signatures[2].x = centerX;
      signatures[2].y = bottomY;


    } else {
      // Portrait
      signatures[0].x = leftX;
      signatures[0].y = bottomY - rowGap * 2;
      
      signatures[1].x = rightX;
      signatures[1].y = bottomY - rowGap * 2;

      signatures[2].x = centerX;
      signatures[2].y = bottomY;
    }
  }

  else if (count === 4) {
    if (isLandscape) {
      // L, R on row 1
      signatures[0].x = leftX * 1 - 20;
      signatures[1].x = rightX * 1 + 20;
      signatures[0].y = signatures[1].y = bottomY * 1.02 - rowGap * 2.2;

      // L, R on row 2 slightly indented
      signatures[2].x = indentLeft * 1 - 5;
      signatures[3].x = indentRight * 1 + 5;
      signatures[2].y = signatures[3].y = bottomY * 1.05;
    } else {
      // Portrait
      signatures[0].x = leftX;
      signatures[1].x = rightX;
      signatures[0].y = signatures[1].y = bottomY - rowGap * 2;

      signatures[2].x = indentLeft * 1 - 22;
      signatures[3].x = indentRight * 1 + 22;
      signatures[2].y = signatures[3].y = bottomY;
    }
  }

  return signatures;
}
