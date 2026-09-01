function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export default async (request) => {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const url = process.env.SUPABASE_URL || "";
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  return json({
    configured: Boolean(url && publishableKey),
    supabaseUrl: url,
    publishableKey
  });
};

export const config = { path: "/api/app-config" };
