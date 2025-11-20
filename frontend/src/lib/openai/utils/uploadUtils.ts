// src/lib/openai/utils/uploadUtils.ts
import { supabase } from "../../supabaseClient";

/**
 * Upload a Blob to Supabase storage (public bucket: certificate-images)
 * Returns the public URL (string) on success, or throws an Error.
 *
 * Files will be stored under: certificate-images/<folderPrefix>/<filename>
 * Example filenamePrefix: "ai/backgrounds" or "ai/corner-frames"
 */
export async function uploadImageToSupabase(
  blob: Blob,
  folderPrefix = "ai",
  extHint = "png"
): Promise<string> {
  const BUCKET = "certificate-images";
  try {
    const ext = blob.type?.split("/")[1] || extHint || "png";
    const filename = `${folderPrefix}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: blob.type || `image/${ext}`,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw uploadError;
    }

    if (!uploadData || !uploadData.path) {
      throw new Error("Upload succeeded but returned no path.");
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);
    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) {
      throw new Error("Failed to obtain public URL after upload.");
    }

    return publicUrl;
  } catch (err) {
    console.error("uploadImageToSupabase() failed:", err);
    throw err;
  }
}
