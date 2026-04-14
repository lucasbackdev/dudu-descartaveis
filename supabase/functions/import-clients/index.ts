import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { clients } = await req.json();
  if (!Array.isArray(clients)) {
    return new Response(JSON.stringify({ error: "clients array required" }), { status: 400, headers: corsHeaders });
  }

  const { error } = await supabase.from("clients").insert(clients);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ inserted: clients.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
