`// supabase/functions/get-certificate/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    if (!token) return new Response(JSON.stringify({ error: "Missing access token" }), { status: 401, headers: corsHeaders });

    const anonClient = createClient(url, anon);
    const serviceClient = createClient(url, serviceRole);

    const { data: { user }, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    const urlObj = new URL(req.url);
    const id = urlObj.searchParams.get("id");
    if (!id) return new Response(JSON.stringify({ error: "Missing certificate id" }), { status: 400, headers: corsHeaders });

    const { data, error } = await serviceClient
      .from("certificates")
      .select("id, title, prompt, size, elements, created_at")
      .eq("user_id", user.id)
      .eq("id", id)
      .single();

    if (error) return new Response(JSON.stringify({ error }), { status: 404, headers: corsHeaders });

    return new Response(JSON.stringify({ certificate: data }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
`