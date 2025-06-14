
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@13.21.0";

// CORS headers obrigatórios para acesso do navegador
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Suporte a preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // O Supabase injeta o JWT verificado do usuário logado em req.headers
    // Descobrir o usuário autenticado
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado (authorization header ausente)" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obter o id do usuário Supabase
    // O JWT é validado automaticamente pelo Supabase nas Edge Functions privadas
    // O payload do usuário será lido pelo serviço do Supabase nos endpoints
    const jwt = authHeader.replace("Bearer ", "");
    // Decodificar JWT para pegar o sub/user_id
    const base64Url = jwt.split(".")[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(decodeURIComponent(escape(atob(base64))));
    const user_id = payload.sub;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "Usuário não reconhecido no JWT" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🔑 Usuário logado: ${user_id}`);

    // Buscar na tabela stripe_customers
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    const res = await fetch(`${supabaseUrl}/rest/v1/stripe_customers?select=stripe_customer_id&user_id=eq.${user_id}`, {
      headers: {
        apikey: supabaseAnonKey!,
        Authorization: `Bearer ${supabaseAnonKey!}`,
      },
    });

    const customers = await res.json();
    if (!Array.isArray(customers) || customers.length === 0 || !customers[0].stripe_customer_id) {
      return new Response(JSON.stringify({ error: "ID do cliente Stripe não vinculado à conta" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeCustomerId = customers[0].stripe_customer_id;

    // Preparar Stripe client
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    const stripe = new Stripe(stripeSecret!, { apiVersion: "2022-11-15" });

    // Criar o portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: supabaseUrl, // OU defina uma landing page customizada!
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("❗ Erro customer-portal:", e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Suporte a atob em Deno
function atob(str: string): string {
  return Buffer.from(str, 'base64').toString('binary');
}
