// RateConRisk Google Analytics 4
const RATECONRISK_GA_ID = "G-ETTCBWC4CH";

window.rateconTrack = function(eventName, params = {}) {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
};

if (RATECONRISK_GA_ID && /^G-[A-Z0-9]+$/i.test(RATECONRISK_GA_ID)) {
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(RATECONRISK_GA_ID)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ dataLayer.push(arguments); };
  gtag("js", new Date());
  gtag("config", RATECONRISK_GA_ID, { anonymize_ip: true });

  // CTA click — useful for seeing interest before upload/analysis.
  document.addEventListener("click", (e) => {
    const el = e.target.closest("button,a");
    if (!el) return;
    const text = (el.innerText || el.getAttribute("aria-label") || "").trim().toLowerCase();
    if (text.includes("check my rate con")) {
      window.rateconTrack("ratecon_check_click");
    }
  });
}
