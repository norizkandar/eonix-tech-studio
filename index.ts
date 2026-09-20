import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  // Production integration point:
  // 1. Validate authenticated user.
  // 2. Validate class price from database.
  // 3. Create TNG/FPX provider payment intent.
  // 4. Store pending transaction.
  // 5. Return provider checkout URL.
  // Never mark the wallet as paid here.

  return new Response(JSON.stringify({
    ok: false,
    message: "Payment provider integration is not configured yet."
  }), {
    status: 501,
    headers: {"Content-Type":"application/json"}
  });
});
