(() => {
  async function boot() {
    const state = await RateConStore.init({ requireAuth:true });
    if (state.redirected) return;

    const mode = RateConStore.getMode();
    const user = RateConStore.getUser();

    document.querySelectorAll("[data-cloud-mode]").forEach(el => {
      el.textContent = mode === "cloud" ? "Cloud synced" : "Local preview mode";
    });

    const email = document.querySelector("[data-user-email]");
    if (email) email.textContent = user?.email || "Guest";

    const out = document.querySelector("[data-signout]");
    if (out) {
      out.style.display = mode === "cloud" ? "" : "none";
      out.onclick = () => RateConCloud.signOut();
    }

    window.dispatchEvent(new CustomEvent("ratecon:appready"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();