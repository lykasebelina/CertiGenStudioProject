// src/lib/types/certificate.ts

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
  content?: string;
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
  underline?: boolean; // ✨ NEW
  align?: "left" | "center" | "right";
  textAlign?: "left" | "center" | "right";
  fontWeight?: string;
  letterSpacing?: number; // ✨ NEW
  lineHeight?: number; // ✨ NEW
  textTransform?: "uppercase" | "capitalize" | "none"; // ✨ NEW


wrap?: "word" | "char" | "none";

  
// --- Transform controls (Konva-compatible) ---
scaleX?: number;
scaleY?: number;
rotation?: number;

rotate?: number;
metadata?: CornerFrameMetadata;


  // --- Signature-specific additions ---
  isSignatureLine?: boolean; // ✨ helps draw signature lines

  

  // --- Visuals / Backgrounds ---
  imageUrl?: string; // background images, border textures, decorative patterns
  backgroundColor?: string;

  style?: Record<string, string>;

  // --- 🟨 Border-specific additions ---
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge" | "none";


    // --- Fabric.js control flags (FIX) ---
  selectable?: boolean; // ⭐ Now allowed
  draggable?: boolean;  // ⭐ Now allowed


 // --- NEW, non-breaking control flags for auto-flow ---
  /**
   * When true (default for text elements we generate), this element participates in the
   * automatic vertical flow/stacking algorithm. Keep false for signatures, images, borders.
   */
  autoFlow?: boolean;

  /**
   * When true, element.y was manually set by the user (drag). The auto-flow algorithm
   * will avoid overriding the user's manual Y position for that element.
   */
  manualY?: boolean;
    // set when user manually drags (parent should set this)
  measuredHeight?: number;


   textFrameWidth?: number;

  /**
   * The fixed text frame height (pixels) to enforce for this text element.
   */
  textFrameHeight?: number;

  /**
   * Maximum number of characters allowed in the content.
   * When present, generator and renderer will trim content to this limit.
   */
  maxChars?: number;


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


