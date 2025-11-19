// src/lib/openai/generators/textGenerator.ts


// -------------------------------------------------------
// FULLY PATCHED FILE — READY TO PASTE
// -------------------------------------------------------

import { CertificateElement } from "../../../types/certificate";
import { SIZE_MAP } from "../utils/sizeUtils";
import { centerTextElement, positionSignaturesAdvanced } from "../utils/textLayoutUtils";
import { DetectedDetails } from "../utils/textPromptUtils";
import { extractCertificateDetailsAI } from "./aiExtractor";

import { SPACING_MAP, FONT_SIZE_MAP,  } from "../utils/textFontAndSpacingUtils";

interface FrameArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// -------------------------------------------------------
// AUTO-REPHRASE (AI fallback if detected phrase is too long)
// -------------------------------------------------------
function autoRephraseIfNeeded(
  detected: string | undefined,
  fallback: string,
  maxChars: number
): string {
  if (!detected) return fallback;

  // Too long → fallback
  if (detected.length > maxChars) return fallback;

  // Too short or generic → fallback
  const short = detected.trim().split(" ").length <= 1;
  if (short) return fallback;

  return detected;
}

// -------------------------------------------------------
// PER-ELEMENT FRAME CONFIG
// -------------------------------------------------------
export type ElementOverride = {
  x?: number;
  y?: number;
  fontSize?: number;
  portraitOffset?: { x?: number; y?: number; fontSize?: number };
};
export type OverridesMap = Record<string, ElementOverride>;

const TEXT_FRAME_CONFIG: Record<
  string,
  {
    portrait: { width: number; height: number };
    landscape: { width: number; height: number };
    maxChars: number;
  }
> = {
  inst: { portrait: { width: 550, height: 20 }, landscape: { width: 700, height: 20 }, maxChars: 120 },
  dept: { portrait: { width: 550, height: 20 }, landscape: { width: 700, height: 20 }, maxChars: 120 },
  loc:  { portrait: { width: 550, height: 20 }, landscape: { width: 700, height: 20 }, maxChars: 120 },

  opening: { portrait: { width: 550, height: 20 }, landscape: { width: 500, height: 20 }, maxChars: 50 },
  title:   { portrait: { width: 600, height: 100 }, landscape: { width: 850, height: 60 }, maxChars: 80 },

  preRec:  { portrait: { width: 550, height: 20 }, landscape: { width: 650, height: 20 }, maxChars: 80 },

  recName: { portrait: { width: 600, height: 50 }, landscape: { width: 850, height: 50 }, maxChars: 40 },
  purpose: { portrait: { width: 600, height: 20 }, landscape: { width: 850, height: 20 }, maxChars: 120 },
  role:    { portrait: { width: 550, height: 25 }, landscape: { width: 500, height: 25 }, maxChars: 60 },
  event:   { portrait: { width: 600, height: 120 }, landscape: { width: 850, height: 80 }, maxChars: 350 },
  date:    { portrait: { width: 550, height: 50 }, landscape: { width: 650, height: 50 }, maxChars: 160 },

  "sig-0": { portrait: { width: 260, height: 60 }, landscape: { width: 300, height: 60 }, maxChars: 90 },
  "sig-1": { portrait: { width: 260, height: 60 }, landscape: { width: 300, height: 60 }, maxChars: 90 },
  "sig-2": { portrait: { width: 260, height: 60 }, landscape: { width: 300, height: 60 }, maxChars: 90 },
  "sig-3": { portrait: { width: 260, height: 60 }, landscape: { width: 300, height: 60 }, maxChars: 90 },
};


// -------------------------------------------------------
// CLAMP TEXT
// -------------------------------------------------------
function clampText(content: string | undefined, maxChars?: number): string {
  const c = content ?? "";
  if (!maxChars || maxChars <= 0) return c;
  if (c.length <= maxChars) return c;
  if (maxChars === 1) return c.slice(0, 1);
  return c.slice(0, maxChars - 1) + "…";
}

// -------------------------------------------------------
// APPLY FRAME + CLAMP
// -------------------------------------------------------
function applyFrameAndClamp(el: CertificateElement, elementKey: string, isLandscape: boolean) {
  const cfg = TEXT_FRAME_CONFIG[elementKey];
  if (!cfg) return;

  const frame = isLandscape ? cfg.landscape : cfg.portrait;

  el.textFrameWidth = frame.width;
  el.textFrameHeight = frame.height;
  el.maxChars = cfg.maxChars;

  if (el.width == null) el.width = frame.width;
  if (el.height == null) el.height = frame.height;

  el.content = clampText(el.content, cfg.maxChars);
}

// -------------------------------------------------------
// MAIN GENERATOR
// -------------------------------------------------------
export async function generateCertificateDetails(
  userPrompt: string,
  selectedSize: string = "a4-landscape",
  frame?: FrameArea,
  overrides: OverridesMap = {}
): Promise<CertificateElement[]> {

  const elements: CertificateElement[] = [];
  const canvas = SIZE_MAP[selectedSize];

  // AI DETECTION
  const detected = await extractCertificateDetailsAI(userPrompt || "");

  // DEFAULT PROMPT VALUES
  const DEFAULT_MAIN = {
    institution: "INSTITUTION NAME",
    department: "DEPARTMENT/OFFICE NAME",
    location: "ADDRESS",
    openingPhrase: "This",
    certificateTitle: "CERTIFICATE TITLE",
    preRecipientPhrase: "is hereby given to",
    recipientName: "RECIPIENT NAME",
    purposePhrase: "in grateful acknowledgement of her engagement and insightful academic contribution as",
    role: "ROLE",
    eventDetails:
      'imparting unparalleled knowledge and expertise during the [Type of Event], with the theme ["Title or Theme of the Activity"] held on [Date] at [Venue].',
    datePlace: "Given this [Date] at [Venue].",
  };

  // FINAL (with auto-rephrase except opening & preRec)
  const F = {
    institution: autoRephraseIfNeeded(detected.institution, DEFAULT_MAIN.institution, 120),
    department: autoRephraseIfNeeded(detected.department, DEFAULT_MAIN.department, 120),
    location: autoRephraseIfNeeded(detected.location, DEFAULT_MAIN.location, 120),

    openingPhrase: "This", // ALWAYS only "This"

    certificateTitle: autoRephraseIfNeeded(detected.certificateTitle, DEFAULT_MAIN.certificateTitle, 80),

    preRecipientPhrase: DEFAULT_MAIN.preRecipientPhrase, // ALWAYS default, no AI detection

    recipientName: autoRephraseIfNeeded(detected.recipientName, DEFAULT_MAIN.recipientName, 40),
    purposePhrase: autoRephraseIfNeeded(detected.purposePhrase, DEFAULT_MAIN.purposePhrase, 120),
    role: autoRephraseIfNeeded(detected.role, DEFAULT_MAIN.role, 60),
    eventDetails: autoRephraseIfNeeded(detected.eventDetails, DEFAULT_MAIN.eventDetails, 350),
    datePlace: autoRephraseIfNeeded(detected.datePlace, DEFAULT_MAIN.datePlace, 160),

    signatures: buildSignaturesFallback(detected),
  };

  // -------------------------------------------------------
  // LAYOUT CALCULATIONS
  // -------------------------------------------------------
  const frameX = frame?.x ?? 0;
  const frameY = frame?.y ?? 0;
  const frameWidth = frame?.width ?? canvas.width;
  const frameHeight = frame?.height ?? canvas.height;
  const isLandscape = selectedSize.includes("landscape");
const portraitOffsets: Record<string, number> = isLandscape ? {} : SPACING_MAP.portraitOffsets || {};

  const fontBase = Math.min(frameWidth, frameHeight) / 40;

  let hTop, hGap, bTop, bGap;
  if (isLandscape) {
    hTop = frameY + frameHeight * SPACING_MAP.headerTop;
    hGap = frameHeight * SPACING_MAP.headerGap;
    bTop = hTop + hGap * SPACING_MAP.bodyStart;
    bGap = frameHeight * SPACING_MAP.bodyGap;
  } else { //portrait
     hTop = frameY + frameHeight * SPACING_MAP.portraitHeaderTop;
  hGap = frameHeight * SPACING_MAP.portraitHeaderGap;
  bTop = hTop + hGap * SPACING_MAP.portraitBodyStart;
  bGap = frameHeight * SPACING_MAP.portraitBodyGap;
  }

  const add = (e: CertificateElement) => elements.push(e);

  function withOverrides(el: CertificateElement, overrideKey: string): CertificateElement {
    const ov = overrides[overrideKey];
    const newEl = { ...el };
    if (ov) {
      if (typeof ov.x === "number") newEl.x = (newEl.x ?? 0) + ov.x;
      if (typeof ov.y === "number") newEl.y = (newEl.y ?? 0) + ov.y;
      if (typeof ov.fontSize === "number") newEl.fontSize = ov.fontSize;

      if (!isLandscape && ov.portraitOffset) {
        if (typeof ov.portraitOffset.x === "number") newEl.x += ov.portraitOffset.x;
        if (typeof ov.portraitOffset.y === "number") newEl.y += ov.portraitOffset.y;
        if (typeof ov.portraitOffset.fontSize === "number")
          newEl.fontSize = ov.portraitOffset.fontSize;
      }
    }
    return newEl;
  }

  // -------------------------------------------------------
  // HEADER ELEMENTS
  // -------------------------------------------------------
  const instEl = centerTextElement(
    { id: "inst", type: "text", x: 0, y: 0, fontSize: fontBase * FONT_SIZE_MAP.institution, content: F.institution, color: "#222", zIndex: 10 },
    frameX, frameWidth, hTop
  );
  applyFrameAndClamp(instEl, "inst", isLandscape);
  add(withOverrides(instEl, "inst"));

  const deptEl = centerTextElement(
    { id: "dept", type: "text", x: 0, y: 0, fontSize: fontBase * FONT_SIZE_MAP.department, content: F.department, color: "#222", zIndex: 10 },
    frameX, frameWidth, hTop + hGap
  );
  applyFrameAndClamp(deptEl, "dept", isLandscape);
  add(withOverrides(deptEl, "dept"));

  const locEl = centerTextElement(
    { id: "loc", type: "text", x: 0, y: 0, fontSize: fontBase * FONT_SIZE_MAP.location, content: F.location, color: "#222", zIndex: 10 },
    frameX, frameWidth, hTop + hGap * 2
  );
  applyFrameAndClamp(locEl, "loc", isLandscape);
  add(withOverrides(locEl, "loc"));

  // -------------------------------------------------------
  // BODY ELEMENTS
  // -------------------------------------------------------
const openingEl = centerTextElement(
    { id: "opening", type: "text", x: 0, y: 0, italic: true, fontSize: fontBase * FONT_SIZE_MAP.openingPhrase, content: F.openingPhrase, color: "#222", zIndex: 10 },
    frameX, frameWidth, isLandscape ? bTop : bTop + (portraitOffsets["opening"] ?? 0) * bGap
  );
  applyFrameAndClamp(openingEl, "opening", isLandscape);
  add(withOverrides(openingEl, "opening"));

  const titleEl = centerTextElement(
    { id: "title", type: "text", x: 0, y: 0, bold: true, fontFamily: "Times New Roman", fontSize: fontBase * FONT_SIZE_MAP.certificateTitle, content: (F.certificateTitle || "").toUpperCase(), color: "#222", zIndex: 10 },
    frameX, frameWidth, isLandscape ? bTop + bGap  : bTop + (portraitOffsets["title"] ?? 0) * bGap
  );
  applyFrameAndClamp(titleEl, "title", isLandscape);
  add(withOverrides(titleEl, "title"));

  const preRecEl = centerTextElement(
    { id: "preRec", type: "text", x: 0, y: 0, italic: true, fontSize: fontBase * FONT_SIZE_MAP.preRecipientPhrase, content: F.preRecipientPhrase, color: "#222", zIndex: 10 },
    frameX, frameWidth, isLandscape ? bTop + bGap * 4.5 : bTop + (portraitOffsets["preRec"] ?? 0) * bGap
  );
  applyFrameAndClamp(preRecEl, "preRec", isLandscape);
  add(withOverrides(preRecEl, "preRec"));

  const recNameEl = centerTextElement(
    { id: "recName", type: "text", x: 0, y: 0, bold: true, fontSize: fontBase * FONT_SIZE_MAP.recipientName, content: F.recipientName, color: "#222", zIndex: 10 },
    frameX, frameWidth, isLandscape ? bTop + bGap * 6.2 : bTop + (portraitOffsets["recName"] ?? 0) * bGap
  );
  applyFrameAndClamp(recNameEl, "recName", isLandscape);
  add(withOverrides(recNameEl, "recName"));

  const purposeEl = centerTextElement(
    { id: "purpose", type: "text", x: 0, y: 0, width: frameWidth * 0.75, fontSize: fontBase * FONT_SIZE_MAP.purposePhrase, content: F.purposePhrase, color: "#222", zIndex: 10 },
    frameX, frameWidth, isLandscape ? bTop + bGap * 9.6 : bTop + (portraitOffsets["purpose"] ?? 0) * bGap
  );
  applyFrameAndClamp(purposeEl, "purpose", isLandscape);
  add(withOverrides(purposeEl, "purpose"));

  if (F.role) {
    const roleEl = centerTextElement(
      { id: "role", type: "text", x: 0, y: 0, bold: true, fontSize: fontBase * FONT_SIZE_MAP.role, content: F.role, color: "#222", zIndex: 10 },
      frameX, frameWidth, isLandscape ? bTop + bGap * 11.5 : bTop + (portraitOffsets["role"] ?? 0) * bGap
    );
    applyFrameAndClamp(roleEl, "role", isLandscape);
    add(withOverrides(roleEl, "role"));
  }

  const eventEl = centerTextElement(
    { id: "event", type: "text", x: 0, y: 0, width: frameWidth * 0.75, fontSize: fontBase * FONT_SIZE_MAP.eventDetails, content: F.eventDetails, color: "#222", zIndex: 10 },
    frameX, frameWidth, isLandscape ? bTop + bGap * 13.5 : bTop + (portraitOffsets["event"] ?? 0) * bGap
  );
  applyFrameAndClamp(eventEl, "event", isLandscape);
  add(withOverrides(eventEl, "event"));

  const dateEl = centerTextElement(
    { id: "date", type: "text", x: 0, y: 0, fontSize: fontBase * FONT_SIZE_MAP.datePlace, content: F.datePlace, color: "#222", zIndex: 10 },
    frameX, frameWidth, isLandscape ? bTop + bGap * 19.5 : bTop + (portraitOffsets["date"] ?? 0) * bGap
  );
  applyFrameAndClamp(dateEl, "date", isLandscape);
  add(withOverrides(dateEl, "date"));

  // -------------------------------------------------------
  // SIGNATURES
  // -------------------------------------------------------
  const signatureElements: CertificateElement[] = [];
  (F.signatures ?? []).forEach((sig, i) => {
    signatureElements.push({
      id: `sig-${i}`,
      type: "signature",
      x: 0,
      y: 0,
      fontSize: fontBase * FONT_SIZE_MAP.signature,
      content: `${sig.name}\n${sig.title}`,
      color: "#222",
      zIndex: 10,
    });
  });

  const positioned = positionSignaturesAdvanced(
    signatureElements,
    frameX, frameY, frameWidth, frameHeight,
    isLandscape
  );

  positioned.forEach((p) => {
    applyFrameAndClamp(p, p.id, isLandscape);
    add(withOverrides(p, p.id));
  });

  return elements;
}

// -------------------------------------------------------
// SIGNATURE FALLBACK BUILDER
// -------------------------------------------------------
function buildSignaturesFallback(detected: DetectedDetails) {
  if (Array.isArray(detected.signatures) && detected.signatures.length > 0) {
    const s = detected.signatures.slice(0, 4);
    const countHint = detected.signatureCount ?? s.length;
    while (s.length < Math.min(4, countHint)) {
      s.push({ name: "NAME", title: "Position, Office" });
    }
    return s;
  }

  if (detected.signatureCount && detected.signatureCount > 0) {
    const n = Math.min(Math.max(detected.signatureCount, 1), 4);
    return Array.from({ length: n }, () => ({
      name: "NAME",
      title: "Position, Office",
    }));
  }

  return [
    { name: "NAME", title: "Position, Office" },
    { name: "NAME", title: "Position, Office" },
  ];
}
