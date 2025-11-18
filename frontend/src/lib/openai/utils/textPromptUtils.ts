/**
 * Detects important fields from user prompt.
 * Returns only the fields that could be detected (plus a signatures override if found).
 *
 * NOTE: This module tries to be conservative: it returns undefined for fields
 * that were not detected so the generator can decide whether to show placeholders
 * (main) or hide minor fields (Option 2).
 */

// src/lib/openai/utils/textPromptUtils.ts SHOWING

export interface DetectedDetails {
  institution?: string;
  department?: string;
  location?: string;

  openingPhrase?: string;
  certificateTitle?: string;
  preRecipientPhrase?: string;

  recipientName?: string;


  purposePhrase?: string; // main
  role?: string; // minor - show only if detected
  eventDetails?: string; // main
  datePlace?: string; // main (e.g. Given this 24th of February 2025 at Biñan, Philippines.)

  signatures?: { name: string; title: string }[]; // override signatures
  signatureCount?: number; // a hint (1..4)
}

/**
 * Heuristics-based extraction: purposely conservative (only return when confident).
 * Extend regexes as needed for your input variations.
 */
export function extractPromptDetails(prompt: string): DetectedDetails {
  if (!prompt || !prompt.trim()) return {};

  const detected: DetectedDetails = {};
  const lower = prompt.toLowerCase();

  // -----------------------
  // INSTITUTION / DEPT / LOCATION
  // -----------------------
  // Look for "Polytechnic University", "Institute", or patterns like "at BIÑAN CAMPUS"
  const instMatch = prompt.match(/(polytechnic university of [A-Za-z\s-]+|university of [A-Za-z\s-]+|institution[:-]\s*([A-Za-z0-9 ,.'\-&()]+))/i);
  if (instMatch) detected.institution = (instMatch[1] || instMatch[2] || instMatch[0]).trim();

  const deptMatch = prompt.match(/(department|office|division|college|faculty)\s*(of)?\s*[:-]?\s*([A-Z][A-Za-z0-9 &,-]+)/i);
  if (deptMatch) detected.department = deptMatch[3].trim();

  const locMatch = prompt.match(/(campus|at|venue|location|address)\s*(of)?\s*[:-]?\s*([A-Za-z0-9 ,.'\-()]+)/i);
  if (locMatch) {
    // Be conservative: if "at Biñan, Philippines" -> likely location
    detected.location = locMatch[3].trim();
  }

  // -----------------------
  // RECIPIENT NAME
  // -----------------------
  // Matches "to John Doe", "for Juan Dela Cruz", "awarded to John A. Smith"
  const nameMatch = prompt.match(/\b(?:to|for|awarded to|presented to)\s+([A-Z][A-Za-z.'-]+\s+[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+)?)\b/);
  if (nameMatch) detected.recipientName = nameMatch[1].trim();

  // Also try "Recipient: John Doe" or "Name: John Doe"
  const labelNameMatch = prompt.match(/\b(name|recipient)\s*[:-]\s*([A-Z][A-Za-z.'-]+\s+[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+)?)\b/);
  if (!detected.recipientName && labelNameMatch) detected.recipientName = labelNameMatch[2].trim();



  // -----------------------
  // CERTIFICATE TITLE
  // -----------------------
  if (lower.includes("certificate of appreciation")) detected.certificateTitle = "CERTIFICATE OF APPRECIATION";
  else if (lower.includes("certificate of participation")) detected.certificateTitle = "CERTIFICATE OF PARTICIPATION";
  else if (lower.includes("certificate of completion")) detected.certificateTitle = "CERTIFICATE OF COMPLETION";
  else if (lower.includes("certificate of recognition")) detected.certificateTitle = "CERTIFICATE OF RECOGNITION";
  else {
    // try explicit "Certificate Title: ..." pattern
    const ctMatch = prompt.match(/certificate\s+title\s*[:-]\s*["“]?([^"”\n]+)/i);
    if (ctMatch) detected.certificateTitle = ctMatch[1].trim().toUpperCase();
  }

  // -----------------------
  // OPENING / PRE-RECIPIENT PHRASES (small heuristics)
  // -----------------------


  // If user explicitly provides pre-recipient phrase
  const preRecMatch = prompt.match(/(is hereby given to|is conferred upon|is awarded to|is presented to|is proudly presented to)/i);
  if (preRecMatch) detected.preRecipientPhrase = preRecMatch[0];

  // -----------------------
  // PURPOSE PHRASE & ROLE (role is minor)
  // -----------------------
  const purposeMatch = prompt.match(/(in grateful acknowledgement of[^\n.]+|in recognition of[^\n.]+|for his|for her|for their[^\n.]+)/i);
  if (purposeMatch) {
    detected.purposePhrase = purposeMatch[0].trim();
  } else {
    // Try to capture long "for" phrases like "for his participation as resource speaker"
    const forPhrase = prompt.match(/\bfor\s+([a-z][^\n]{5,120})/i);
    if (forPhrase) detected.purposePhrase = `for ${forPhrase[1].trim()}`;
  }

  const roleMatch = prompt.match(/\b(in|as|serving as|in the role of|program|course)\s+([A-Za-z0-9 &\-.,]+)/i);
  if (roleMatch) detected.role = roleMatch[2].trim();

  // -----------------------
  // EVENT DETAILS (theme, type of event)
  // -----------------------
  // Theme detection like: theme "..." or theme: "..."
  const themeMatch = prompt.match(/theme\s*[:-]?\s*["“”']([^"“”']+)["“”']?/i);
  if (themeMatch) {
    const theme = themeMatch[1].trim();
    detected.eventDetails = `with the theme "${theme}"`;
  } else {
    // find "during the [symposium|seminar|workshop] ... on <date>"
    const eventMatch = prompt.match(/\b(during|at|on)\s+the\s+([A-Za-z\s]+?)(?:,| on | held | which | with |$)/i);
    if (eventMatch) detected.eventDetails = `during the ${eventMatch[2].trim()}`;
  }

  // -----------------------
  // DATE PLACE
  // -----------------------
  // Look for dates like "24th of February 2025" or "February 24, 2025" or "24 February 2025"
  const niceDateMatch = prompt.match(/\b(\d{1,2}(?:st|nd|rd|th)?\s+of\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/i);
  if (niceDateMatch) {
    detected.datePlace = `Given this ${niceDateMatch[1]} at ${extractVenueFromPrompt(prompt) || "[Venue]"}.`;
  } else {
    const longDateMatch = prompt.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*\d{4}\b/);
    if (longDateMatch) {
      detected.datePlace = `Given this ${longDateMatch[0]} at ${extractVenueFromPrompt(prompt) || "[Venue]"}.`;
    }
  }

  // -----------------------
  // SIGNATURES / SIGNATORY DETECTION
  // -----------------------
  // Detect explicit signers "Signed by: Name - Title" or "Signatories: A, B, C"
  const signBlockMatch = prompt.match(/(signed by|signatories|signatories:|signatures)\s*[:-]?\s*([^\n]+)/i);
  if (signBlockMatch) {
    const list = signBlockMatch[2].split(/,|;|\band\b/i).map(s => s.trim()).filter(Boolean);
    const sigs: { name: string; title: string }[] = [];
    for (const item of list) {
      // try "NAME - Title" or "NAME, Title"
      const pair = item.split(/[-–—]|,/).map(p => p.trim()).filter(Boolean);
      if (pair.length === 1) {
        sigs.push({ name: pair[0], title: "Position, Office" });
      } else {
        sigs.push({ name: pair[0], title: pair[1] });
      }
      if (sigs.length >= 4) break;
    }
    if (sigs.length) detected.signatures = sigs;
  }

  // Look for phrases like "three signatures", "3 signatures"
  const sigCountMatch = prompt.match(/\b(1|2|3|4|one|two|three|four)\s+signatur/i);
  if (sigCountMatch) {
    const n = sigCountMatch[1].toString().replace(/one/i, "1").replace(/two/i, "2").replace(/three/i, "3").replace(/four/i, "4");
    const count = parseInt(n, 10);
    if (!Number.isNaN(count)) detected.signatureCount = Math.min(Math.max(count, 1), 4);
  }

  // If the user included a very specific signer lines like "ARCHIE C. AREVALO, LPT, MA — Head of Academic Programs"
  const multiLineSigners = Array.from(prompt.matchAll(/^([A-Z][A-Z\s.,\-']{2,}?)\s*[—\-–]\s*([A-Za-z &.-]+)/gim));
  if (multiLineSigners.length) {
    detected.signatures = detected.signatures || [];
    for (const m of multiLineSigners) {
      detected.signatures.push({ name: m[1].trim(), title: (m[2] || "Position, Office").trim() });
      if (detected.signatures.length >= 4) break;
    }
  }

  return detected;
}

/** small helper to find venue/location after "at" or "venue" */
function extractVenueFromPrompt(prompt: string): string | undefined {
  const v = prompt.match(/\bat\s+([A-Z][A-Za-z0-9\-,\s.()]+)/i);
  if (v) return v[1].trim();
  const v2 = prompt.match(/venue\s*[:-]\s*([A-Z][A-Za-z0-9\-,\s.()]+)/i);
  if (v2) return v2[1].trim();
  return undefined;
}
