// src/lib/storageUtils.ts
import { supabase } from "./supabaseClient";

/**
 * Converts a Base64 string to a Blob and uploads it to Supabase.
 * This bypasses CORS issues because we don't fetch from an external URL.
 */
export async function uploadDalleImageToSupabase(base64Data: string, userId: string = 'system'): Promise<string | null> {
  try {
    // 1. Convert Base64 to Blob
    // The Base64 string from OpenAI does not include the "data:image/png;base64," prefix, 
    // so we handle the raw string directly.
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/png" });

    // 2. Generate a unique filename
    // Structure: generated-assets/{userId}/{timestamp}-{random}.png
    const fileExt = "png"; 
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `generated-assets/${userId}/${fileName}`;

    // 3. Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from("certificate-assets") // ⚠️ Ensure this bucket exists and is Public
      .upload(filePath, blob, {
        contentType: "image/png",
        cacheControl: "31536000", // 1 year cache
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase Upload Error:", uploadError);
      return null;
    }

    // 4. Get the Public URL
    const { data } = supabase.storage
      .from("certificate-assets")
      .getPublicUrl(filePath);

    return data.publicUrl;

  } catch (error) {
    console.error("Error uploading Base64 image:", error);
    return null;
  }
}