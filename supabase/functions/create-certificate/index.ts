// supabase/functions/create-certificate/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

async function downloadAsUint8Array(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url} : ${res.status}`);
  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}

function getFileExtensionFromContentType(contentType?: string, fallback = "png") {
  if (!contentType) return fallback;
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  };
  return map[contentType] ?? fallback;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SERVICE) {
      return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), { status: 500, headers: corsHeaders });
    }

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    if (!token) return new Response(JSON.stringify({ error: "Missing access token" }), { status: 401, headers: corsHeaders });

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } });

    const { data: { user }, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    // parse body
    const body = await req.json();
    const { title, prompt, size, elements } = body;

    if (!Array.isArray(elements)) {
      return new Response(JSON.stringify({ error: "Invalid elements array" }), { status: 400, headers: corsHeaders });
    }

    // Prepare bucket and path
    const BUCKET = "certificate-assets";

    // We'll create a map of originalUrl -> publicUrl so duplicates reuse same object
    const urlMap = new Map<string, string>();

    // Process elements: for any element with imageUrl (http/https), download and upload to Supabase Storage
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const imageUrl: string | undefined = el.imageUrl ?? el.src ?? null;

      if (!imageUrl || typeof imageUrl !== "string") continue;

      // If it's already supabase public URL in this project, skip
      if (imageUrl.includes("/storage/v1/object/public/") && imageUrl.includes(new URL(SUPABASE_URL).host)) {
        // already permanent public link — keep as-is
        continue;
      }

      // If we've already processed this URL, reuse mapped public url
      if (urlMap.has(imageUrl)) {
        const publicUrl = urlMap.get(imageUrl)!;
        el.imageUrl = publicUrl;
        continue;
      }

      try {
        // Attempt download
        const data = await downloadAsUint8Array(imageUrl);

        // Try to detect content-type via HEAD if possible (best-effort)
        let contentType: string | undefined = undefined;
        try {
          const head = await fetch(imageUrl, { method: "HEAD" });
          if (head.ok) contentType = head.headers.get("content-type") ?? undefined;
        } catch {
          // ignore HEAD failure
        }

        const ext = getFileExtensionFromContentType(contentType, "png");
        const filename = `images/${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        // Upload to Supabase storage
        const uploadResult = await serviceClient.storage.from(BUCKET).upload(filename, data, {
          contentType: contentType ?? `image/${ext}`,
          upsert: false,
        });

        if (uploadResult.error) {
          console.error("Storage upload error for", imageUrl, uploadResult.error);
          // don't fail the whole request — keep original imageUrl (best-effort)
          continue;
        }

        // Build public URL
        const publicUrl = `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(filename)}`;

        // Replace in element
        el.imageUrl = publicUrl;

        // Save in map
        urlMap.set(imageUrl, publicUrl);
      } catch (err) {
        // Log and continue — don't abort entire save
        console.error("Failed to process image URL", imageUrl, err);
        // leave el.imageUrl as-is (fallback)
      }
    }

    // Now insert certificate into DB
    const { data, error } = await serviceClient
      .from("certificates")
      .insert({
        user_id: user.id,
        title: title ?? null,
        prompt: prompt ?? null,
        size: size ?? null,
        elements,
      })
      .select()
      .single();

    if (error) {
      console.error("Insert certificate error:", error);
      return new Response(JSON.stringify({ error }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ certificate: data }), { status: 201, headers: corsHeaders });
  } catch (err) {
    console.error("create-certificate error:", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), { status: 500, headers: corsHeaders });
  }
});
