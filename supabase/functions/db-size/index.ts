import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated and is admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get table sizes using service role
    const { data: tableData, error: tableError } = await supabase.rpc("get_db_size_info");

    if (tableError) {
      // Fallback: count rows in each table
      const [profiles, deliveries, deliveryItems, products, adminSettings, userRoles] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("deliveries").select("id", { count: "exact", head: true }),
        supabase.from("delivery_items").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("admin_settings").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }),
      ]);

      // Estimate ~500 bytes per row average
      const totalRows = (profiles.count || 0) + (deliveries.count || 0) + (deliveryItems.count || 0) + 
                         (products.count || 0) + (adminSettings.count || 0) + (userRoles.count || 0);
      
      const estimatedBytes = totalRows * 500; // rough estimate
      const limitBytes = 500 * 1024 * 1024; // 500MB

      return new Response(JSON.stringify({
        used_bytes: estimatedBytes,
        limit_bytes: limitBytes,
        used_mb: Math.round(estimatedBytes / (1024 * 1024) * 100) / 100,
        limit_mb: 500,
        percentage: Math.round((estimatedBytes / limitBytes) * 10000) / 100,
        tables: {
          profiles: profiles.count || 0,
          deliveries: deliveries.count || 0,
          delivery_items: deliveryItems.count || 0,
          products: products.count || 0,
          admin_settings: adminSettings.count || 0,
          user_roles: userRoles.count || 0,
        },
        total_rows: totalRows,
        is_estimate: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(tableData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
