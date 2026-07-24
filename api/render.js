// =============================================================
//  SNAP Wellness — Email Renderer   (Vercel serverless function)
//  Receives Mason's JSON (POST) and returns email-safe HTML.
//  Endpoint once deployed:  https://<your-project>.vercel.app/api/render
//  Styled to match SNAP's brand: black / cream / gold, bold uppercase
//  headlines, script accents, black & white-pill buttons.
// =============================================================

// -------------------------------------------------------------
//  1) BRAND CONFIG  —  EDIT THIS BLOCK ONLY.
// -------------------------------------------------------------
const BRAND = {
  name: "SNAP",

  // Logo: paste a PUBLIC image URL (a white PNG works best on the black bar).
  // Leave "" to use a styled "SNAP" text wordmark.
  logoUrl: "",

  // Colors
  black:  "#000000",
  cream:  "#f3ede3",   // warm tan panels / testimonial cards
  panel:  "#ffffff",
  text:   "#1a1a1a",
  muted:  "#9a9186",
  accent: "#b89258",   // gold (stats, accents)

  // Fonts (email-safe stacks)
  headingFont: "'Helvetica Neue', Helvetica, Arial, sans-serif", // bold + uppercase in use
  bodyFont:    "'Helvetica Neue', Helvetica, Arial, sans-serif",
  scriptFont:  "'Snell Roundhand', 'Apple Chancery', 'Segoe Script', Georgia, serif", // for soft headers (falls back to serif italic)

  footer: {
    site: "SNAPWELLNESS.COM",
    address: "SNAP Wellness · 123 Example Street, City, ST 00000",
    unsubscribeHtml: '<a href="{% unsubscribe %}" style="color:#9a9186;text-decoration:underline;">Unsubscribe</a>',
  },
};

// Fallback link when Mason leaves a cta_url empty. TODO: real default landing page.
const DEFAULT_CTA_URL = "https://www.snapwellness.com";

// -------------------------------------------------------------
//  2) HELPERS
// -------------------------------------------------------------
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function paras(text, color) {
  return String(text || "")
    .split(/\n{2,}|\r\n\r\n/).filter(Boolean)
    .map(p => `<p style="margin:0 0 16px;font-family:${BRAND.bodyFont};font-size:16px;line-height:1.65;color:${color || BRAND.text};">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// Button. onDark => white pill w/ black text. else => black rectangle w/ white text.
function button(label, url, onDark) {
  const href = esc(url && String(url).trim() ? url : DEFAULT_CTA_URL);
  const text = esc(label || "LEARN MORE").toUpperCase();
  const bg = onDark ? "#ffffff" : "#000000";
  const fg = onDark ? "#000000" : "#ffffff";
  const radius = onDark ? "40px" : "0px";
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px auto;"><tr>
    <td bgcolor="${bg}" style="border-radius:${radius};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:${BRAND.bodyFont};font-size:12px;letter-spacing:1.5px;font-weight:bold;text-transform:uppercase;color:${fg};text-decoration:none;">${text}</a>
    </td>
  </tr></table>`;
}

function img(url, alt) {
  if (!url) return "";
  return `<img src="${esc(url)}" alt="${esc(alt || "")}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;">`;
}

// Bold uppercase headline (the SNAP signature).
function headline(text, color, size) {
  return `<h1 style="margin:0 0 16px;font-family:${BRAND.headingFont};font-weight:800;font-size:${size || 30}px;line-height:1.12;letter-spacing:0.5px;text-transform:uppercase;color:${color || BRAND.text};">${esc(text)}</h1>`;
}
// Soft script header ("About the Formula").
function scriptHeader(text, color) {
  return `<div style="font-family:${BRAND.scriptFont};font-style:italic;font-size:40px;line-height:1.1;color:${color || BRAND.text};">${esc(text)}</div>`;
}

// -------------------------------------------------------------
//  3) SECTION RENDERERS
// -------------------------------------------------------------
const RENDER = {
  // ---- Shared ----
  logo_header() {
    const inner = BRAND.logoUrl
      ? `<img src="${esc(BRAND.logoUrl)}" alt="${esc(BRAND.name)}" width="96" style="display:block;border:0;">`
      : `<span style="font-family:${BRAND.headingFont};font-weight:800;font-size:22px;letter-spacing:2px;color:#ffffff;">${esc(BRAND.name)}</span>`;
    return `<tr><td style="padding:18px 24px;background:${BRAND.black};">${inner}</td></tr>`;
  },

  footer() {
    return `<tr><td align="center" style="padding:30px 24px;background:${BRAND.black};">
      <p style="margin:0 0 10px;font-family:${BRAND.headingFont};font-size:13px;letter-spacing:2px;color:#ffffff;">${esc(BRAND.footer.site)}</p>
      <p style="margin:0 0 8px;font-family:${BRAND.bodyFont};font-size:11px;line-height:1.6;color:${BRAND.muted};">${esc(BRAND.footer.address)}</p>
      <p style="margin:0;font-family:${BRAND.bodyFont};font-size:11px;line-height:1.6;color:${BRAND.muted};">${BRAND.footer.unsubscribeHtml}</p>
    </td></tr>`;
  },

  // ---- Machine sections (Hotel / Country Club / Camp) ----
  machine_hero(s) {
    return `<tr><td style="background:${BRAND.black};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="center" style="padding:40px 32px 28px;">
          ${headline(s.headline, "#ffffff", 30)}
          ${button(s.cta_label, s.cta_url, true)}
        </td>
      </tr></table>
      ${img(s.machine_image_url, s.headline)}
    </td></tr>`;
  },

  machine_body(s) {
    return `<tr><td style="padding:42px 34px;background:${BRAND.panel};">
      ${s.header ? headline(s.header, BRAND.text, 24) : ""}
      ${paras(s.body)}
      ${s.machine_photo_url ? `<div style="margin-top:20px;">${img(s.machine_photo_url, s.header)}</div>` : ""}
    </td></tr>`;
  },

  claims_row() {
    const claims = [
      ["FULL-BODY COVERAGE", "Touchless application in 10 seconds"],
      ["CLEAN INGREDIENTS", "Hypoallergenic & lightweight"],
      ["STAIN-FREE", "Clothing-safe, no residue"],
    ];
    const cells = claims.map(([t, d]) => `
      <td width="33%" align="center" valign="top" style="padding:6px 12px;">
        <p style="margin:0 0 4px;font-family:${BRAND.headingFont};font-weight:bold;font-size:12px;letter-spacing:1px;color:${BRAND.text};">${esc(t)}</p>
        <div style="width:24px;height:2px;background:${BRAND.accent};margin:6px auto 8px;"></div>
        <p style="margin:0;font-family:${BRAND.bodyFont};font-size:12px;line-height:1.5;color:${BRAND.muted};">${esc(d)}</p>
      </td>`).join("");
    return `<tr><td style="padding:32px 18px;background:${BRAND.cream};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>
    </td></tr>`;
  },

  outcomes_row(s) {
    const items = (s.outcomes || []).map(o => `
      <p style="margin:0 0 14px;font-family:${BRAND.bodyFont};font-size:15px;line-height:1.5;color:${BRAND.text};">
        <span style="color:${BRAND.accent};font-weight:bold;">&#10022;</span>&nbsp;&nbsp;${esc(o)}</p>`).join("");
    return `<tr><td style="padding:36px 44px;background:${BRAND.panel};">${items}</td></tr>`;
  },

  closing_cta(s) {
    return `<tr><td align="center" style="padding:48px 32px;background:${BRAND.black};">
      ${headline(s.headline, "#ffffff", 24)}
      ${button(s.cta_label, s.cta_url, true)}
    </td></tr>`;
  },

  // ---- Consumer sections ----
  hero_dark(s) {
    return `<tr><td style="background:${BRAND.black};">
      ${img(s.product_image_url, s.headline)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="center" style="padding:36px 32px;">
          ${headline(s.headline, "#ffffff", 32)}
          ${button(s.cta_label, s.cta_url, true)}
        </td>
      </tr></table>
    </td></tr>`;
  },

  collections_intro(s) {
    return `<tr><td align="center" style="padding:44px 32px 16px;background:${BRAND.panel};">
      ${scriptHeader(s.header, BRAND.text)}
      ${s.subtitle ? `<p style="margin:14px 0 0;font-family:${BRAND.bodyFont};font-size:16px;line-height:1.6;color:${BRAND.muted};">${esc(s.subtitle)}</p>` : ""}
    </td></tr>`;
  },

  collection_row(s) {
    return `<tr><td align="center" style="padding:24px 32px 32px;background:${BRAND.panel};">
      ${s.bottle_image_url ? `<img src="${esc(s.bottle_image_url)}" alt="${esc(s.collection)}" width="240" style="display:block;margin:0 auto 14px;width:240px;max-width:70%;height:auto;border:0;">` : ""}
      ${s.collection ? `<p style="margin:0 0 8px;font-family:${BRAND.headingFont};font-weight:bold;font-size:15px;letter-spacing:1px;text-transform:uppercase;color:${BRAND.text};">${esc(s.collection)}</p>` : ""}
      ${s.description ? `<p style="margin:0 auto 14px;max-width:420px;font-family:${BRAND.bodyFont};font-size:15px;line-height:1.6;color:${BRAND.muted};">${esc(s.description)}</p>` : ""}
      ${button(s.cta_label, s.cta_url, false)}
    </td></tr>`;
  },

  about_formula(s) {
    return `<tr><td style="padding:0;background:${BRAND.panel};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="center" style="padding:40px 32px 8px;">
          ${s.header ? scriptHeader(s.header, BRAND.text) : ""}
        </td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="center" style="padding:8px 40px 28px;">${paras(s.body)}</td>
      </tr></table>
      ${img(s.lifestyle_image_url, s.header)}
    </td></tr>`;
  },

  product_card(s) {
    return `<tr><td align="center" style="padding:24px 32px;background:${BRAND.panel};">
      ${s.product_image_url ? `<div style="background:${BRAND.cream};padding:24px;"><img src="${esc(s.product_image_url)}" alt="${esc(s.name)}" width="240" style="display:block;margin:0 auto;width:240px;max-width:80%;height:auto;border:0;"></div>` : ""}
      ${s.name ? `<p style="margin:14px 0 0;font-family:${BRAND.headingFont};font-weight:bold;font-size:14px;letter-spacing:1px;text-transform:uppercase;color:${BRAND.text};">${esc(s.name)}</p>` : ""}
    </td></tr>`;
  },

  closing_lifestyle(s) {
    return `<tr><td style="background:${BRAND.black};">
      ${img(s.lifestyle_image_url, s.headline)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="center" style="padding:36px 32px;">
          ${headline(s.headline, "#ffffff", 26)}
          ${button(s.cta_label, s.cta_url, true)}
        </td>
      </tr></table>
    </td></tr>`;
  },
};

// -------------------------------------------------------------
//  4) ASSEMBLE
// -------------------------------------------------------------
function buildEmail(data) {
  const incoming = Array.isArray(data.sections) ? data.sections : [];
  const body = incoming
    .filter(s => s && s.type && s.type !== "logo_header" && s.type !== "footer")
    .map(s => { const fn = RENDER[s.type]; return fn ? fn(s) : `<!-- unknown section: ${esc(s.type)} -->`; })
    .join("\n");
  const inner = RENDER.logo_header() + "\n" + body + "\n" + RENDER.footer();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${esc(data.subject || BRAND.name)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(data.preview_text || "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:${BRAND.panel};">
      ${inner}
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// -------------------------------------------------------------
//  5) HANDLER
// -------------------------------------------------------------
module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Use POST." }); return; }
  try {
    let data = req.body;
    if (typeof data === "string") data = JSON.parse(data);
    if (data && typeof data.json === "string") data = JSON.parse(data.json);
    if (!data || !Array.isArray(data.sections)) {
      res.status(400).json({ error: "Expected a JSON body with a 'sections' array.", received: data }); return;
    }
    const html = buildEmail(data);
    res.status(200).json({ subject: data.subject || "", preview_text: data.preview_text || "", html });
  } catch (err) {
    res.status(400).json({ error: "Could not parse Mason's JSON.", detail: String(err && err.message || err) });
  }
};
