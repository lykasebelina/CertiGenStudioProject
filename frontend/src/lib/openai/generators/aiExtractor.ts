// src/lib/openai/generators/aiExtractor.ts (FINAL FIXED)

/**
 * Defines the structure of the certificate details expected to be extracted by the AI.
 */
export interface AIDetails {
  institution: string;
  department: string;
  location: string;
  openingPhrase: string;
  certificateTitle: string;
  preRecipientPhrase: string;
  recipientName: string;
  purposePhrase: string;
  role: string;
  eventDetails: string;
  datePlace: string;
  signatures: { name: string; title: string }[];
}

export async function extractCertificateDetailsAI(prompt: string): Promise<AIDetails> {
  // Get the base URL from the environment variable (VITE_API_BASE_URL).
  // If the variable is not set, default to an empty string. 
  // This allows the use of a relative path, which is best for Vercel deployment.
  const baseURL = import.meta.env.VITE_API_BASE_URL || ''; 
  
  // FIX 1 (URL): Changed hardcoded localhost to the Vercel-friendly baseURL variable.
  // FIX 2 (SYNTAX): Used backticks (`) for template literals to embed the variable.
  const res = await fetch(`${baseURL}/extract`, { 
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  if (!res.ok) throw new Error("Failed to extract certificate details");
  return res.json();
}