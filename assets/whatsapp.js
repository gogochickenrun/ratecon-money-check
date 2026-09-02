(() => {
  if (document.getElementById("ratecon-whatsapp-support")) return;

  const href = "https://wa.me/19432601577?text=" + encodeURIComponent("Hi, I\u2019m using RateConRisk and I have a question.");

  const wrap = document.createElement("div");
  wrap.id = "ratecon-whatsapp-support";
  wrap.innerHTML = `
    <a class="rr-wa-btn"
       href="${href}"
       target="_blank"
       rel="noopener noreferrer"
       aria-label="Contact RateConRisk support on WhatsApp">
      <span class="rr-wa-icon" aria-hidden="true">WA</span>
      <span class="rr-wa-label">
        <strong>WhatsApp Support</strong>
        <small>Questions? Message us.</small>
      </span>
    </a>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #ratecon-whatsapp-support {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 9999;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #ratecon-whatsapp-support .rr-wa-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-height: 52px;
      padding: 9px 13px 9px 10px;
      color: #fff;
      text-decoration: none;
      border-radius: 999px;
      background: #111820;
      border: 1px solid rgba(255,255,255,.14);
      box-shadow: 0 14px 40px rgba(0,0,0,.34);
      backdrop-filter: blur(12px);
      transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease;
    }
    #ratecon-whatsapp-support .rr-wa-btn:hover {
      transform: translateY(-2px);
      border-color: rgba(37,211,102,.75);
      box-shadow: 0 18px 48px rgba(0,0,0,.42);
    }
    #ratecon-whatsapp-support .rr-wa-icon {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      flex: 0 0 34px;
      border-radius: 50%;
      background: #25D366;
      color: #08120c;
      font-size: 11px;
      font-weight: 950;
      letter-spacing: -.03em;
    }
    #ratecon-whatsapp-support .rr-wa-label {
      display: flex;
      flex-direction: column;
      gap: 1px;
      line-height: 1.15;
    }
    #ratecon-whatsapp-support .rr-wa-label strong {
      font-size: 12px;
      font-weight: 900;
      letter-spacing: -.01em;
    }
    #ratecon-whatsapp-support .rr-wa-label small {
      font-size: 10px;
      color: #aeb7c5;
      white-space: nowrap;
    }
    @media (max-width: 640px) {
      #ratecon-whatsapp-support {
        right: 12px;
        bottom: 12px;
      }
      #ratecon-whatsapp-support .rr-wa-btn {
        min-height: 48px;
        padding: 8px;
      }
      #ratecon-whatsapp-support .rr-wa-label {
        display: none;
      }
      #ratecon-whatsapp-support .rr-wa-icon {
        width: 32px;
        height: 32px;
        flex-basis: 32px;
      }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(wrap);

  wrap.querySelector(".rr-wa-btn").addEventListener("click", () => {
    try {
      if (typeof window.rateconTrack === "function") {
        window.rateconTrack("whatsapp_support_click", {
          page_path: location.pathname,
          support_channel: "whatsapp",
          placement: "floating_button"
        });
      } else if (typeof window.gtag === "function") {
        window.gtag("event", "whatsapp_support_click", {
          page_path: location.pathname,
          support_channel: "whatsapp",
          placement: "floating_button"
        });
      }
    } catch {}
  });
})();
