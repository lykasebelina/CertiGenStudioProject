// src/services/certificates.ts
import { supabase } from "../lib/supabaseClient";
import { CertificateElement } from "../types/certificate";

export interface CertificatePayload {
  id?: string; // optional for update
  title: string;
  prompt?: string;
  size: string;
  elements: CertificateElement[];
}

// --- CREATE or UPDATE ---
export async function saveCertificate(payload: CertificatePayload) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const endpoint = payload.id
    ? `/functions/v1/update-certificate?id=${payload.id}`
    : `/functions/v1/create-certificate`;

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to save certificate: ${res.statusText}`);
  }

  return res.json();
}

// --- FETCH all certificates for the logged-in user ---
export async function listCertificates() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-certificates`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch certificates: ${res.statusText}`);
  }

  return res.json();
}

// --- FETCH single certificate by ID ---
export async function getCertificate(id: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-certificate?id=${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch certificate ${id}: ${res.statusText}`);
  }

  return res.json();
}
