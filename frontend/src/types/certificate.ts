// src/types/certificate.ts

export interface CertificateElement {
  id: string;
  type:
    | "text"
    | "image"
    | "signature"
    | "background"
    | "border"
    | "cornerFrame"
    | "cornerOrnament"
    | "decorativeIcon"
    | "logo"
    | "qrCode"
    | "watermark"
    | "backgroundPattern"
    | "margin"
    | "frameElements"
    | "innerFrame";

  // --- Common fields ---
  content?: string;            // For text/signature content
  x: number;
  y: number;
  zIndex?: number;
  width?: number;
  height?: number;
  opacity?: number;

  // --- Text styling ---
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right";
  textAlign?: string;
  fontWeight?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textTransform?: "uppercase" | "capitalize" | "none";
  wrap?: "word" | "char" | "none";

  textFrameWidth?: number;     // Fixed text frame width
  textFrameHeight?: number;    // Fixed text frame height
  maxChars?: number;           // Maximum characters allowed

  // --- Transform controls (Konva-compatible) ---
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  rotate?: number;

  // --- Metadata for corner frames ---
  metadata?: CornerFrameMetadata;

  // --- Signature-specific additions ---
  isSignatureLine?: boolean;

  // --- Visuals / Backgrounds / Images ---
  imageUrl?: string;           // Background, corner frames, decorative icons
  backgroundColor?: string;
  style?: Record<string, string>;

  // --- Border-specific additions ---
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge" | "none";

  // --- Fabric.js / Konva control flags ---
  selectable?: boolean;
  draggable?: boolean;

  // --- Auto-flow / manual placement ---
  autoFlow?: boolean;          // participate in auto vertical flow
  manualY?: boolean;           // user manually dragged
  measuredHeight?: number;     // height measured after rendering
}

export interface CornerFrameMetadata {
  corner: "tl" | "tr" | "bl" | "br";
  isCornerFrame: true;
}

export type CertificateSize =
  | "a4-portrait"
  | "a4-landscape"
  | "letter-portrait"
  | "letter-landscape"
  | "legal-portrait"
  | "legal-landscape";

export interface CertificateData {
  id: string;
  name: string;
  width: number;
  height: number;
  backgroundColor?: string;
  backgroundImage?: string;
  size: CertificateSize;
  layers?: CertificateLayer[];
  elements: CertificateElement[];
  createdAt: Date;
  prompt?: string;
}

export interface AIPrompt {
  description: string;
  style: string;
  colors: string[];
  theme: string;
}

export interface CertificateLayer {
  id: string;
  type: "image";
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
}
