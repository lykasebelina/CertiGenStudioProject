// src/lib/openai/generators/aiExtractor.ts
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
  const res = await fetch("http://localhost:4000/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  if (!res.ok) throw new Error("Failed to extract certificate details");
  return res.json();
}
