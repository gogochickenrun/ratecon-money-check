(() => {
  let client = null;
  let config = null;
  let session = null;

  async function getConfig() {
    if (config) return config;
    try {
      const res = await fetch("/api/app-config", { cache: "no-store" });
      config = await res.json();
    } catch {
      config = { configured: false, supabaseUrl: "", publishableKey: "" };
    }
    return config;
  }

  async function init() {
    const cfg = await getConfig();
    if (!cfg.configured || !window.supabase?.createClient) {
      return { configured: false, user: null };
    }

    if (!client) {
      client = window.supabase.createClient(
        cfg.supabaseUrl,
        cfg.publishableKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );
    }

    const { data } = await client.auth.getSession();
    session = data?.session || null;

    client.auth.onAuthStateChange((_event, newSession) => {
      session = newSession || null;
      window.dispatchEvent(new CustomEvent("ratecon:authchange", {
        detail: { user: session?.user || null }
      }));
    });

    return { configured: true, user: session?.user || null };
  }

  async function requireUser() {
    const state = await init();
    if (!state.configured) return state;
    if (!state.user) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.href = `/app/login/?next=${next}`;
      return { configured: true, user: null, redirected: true };
    }
    return state;
  }

  async function sendMagicLink(email) {
    await init();
    if (!client) throw new Error("Cloud login is not configured yet.");
    const next = new URLSearchParams(location.search).get("next") || "/app/";
    const redirect = `${location.origin}/app/login/?next=${encodeURIComponent(next)}`;
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect }
    });
    if (error) throw error;
  }

  async function signOut() {
    await init();
    if (client) await client.auth.signOut();
    location.href = "/";
  }

  function getClient() { return client; }
  function getUser() { return session?.user || null; }

  window.RateConCloud = {
    init, requireUser, sendMagicLink, signOut, getClient, getUser, getConfig
  };
})();