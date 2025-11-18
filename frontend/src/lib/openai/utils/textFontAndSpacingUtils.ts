// src/lib/openai/utils/textFontAndSpacingUtils.ts
//TWEAK FONT AND SPACING

/**
 * Centralized spacing & font-size settings for certificates.
 * Keeps detailsGenerator clean and makes spacing easy to adjust.
 */

export const SPACING_MAP = {
  headerTop: 0.05,       // top margin of header (percentage of frame height)
  headerGap: 0.030,      // gap between institution / dept / location

  bodyStart: 5.0,          // starts 4 * gap after header
  bodyGap: 0.022,        // base gap for body text (similar to headerGap)
  // PORTRAIT BASE VALUES
  portraitHeaderTop: 0.1,
  portraitHeaderGap: 0.025, 
  portraitBodyStart: 2.3,
  portraitBodyGap: 0.025, 

  // PORTRAIT PER-ELEMENT OFFSETS
  portraitOffsets: {
    inst: 0,
    dept: 0,
    loc: 0,
    opening: 2.5,
    title: 4,
    preRec: 9.8,
    recName: 12.5,
    purpose: 16.5,
    role: 17.2,
    event: 19,
    date: 27, //higher lower
  },
  
  signatureRowGap: 0.05
};

/**
 * All certificate font sizes scale relative to baseFont,
 * which is derived from the frame dimensions.
 */
export const FONT_SIZE_MAP = {
  institution: 0.9,
  department: 0.9,
  location: 0.9,

  openingPhrase: 0.9,
  certificateTitle: 2.0,
  preRecipientPhrase: 0.9,

  recipientName: 1.8,


  purposePhrase: 0.9,
  role: 1.0,
  eventDetails: 0.9,

  datePlace: 0.9,

  signature: 0.8,
};



