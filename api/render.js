// =============================================================
//  SNAP Wellness — Email Renderer   (Vercel serverless function)
//  Receives Mason's JSON (POST) and returns email-safe HTML.
//  Endpoint once deployed:  https://<your-project>.vercel.app/api/render
// =============================================================

// -------------------------------------------------------------
//  1) BRAND CONFIG  —  EDIT THIS BLOCK ONLY.
// -------------------------------------------------------------
const BRAND = {
  name: "SNAP",

  // ---- Logo ----
  logoUrl: "https://res.cloudinary.com/da3jrnugf/image/upload/v1785187930/SNAP_S_white_1_yzgqtc.png",
  logoHeight: 42,        // rendered height of the symbol in the header (px)

  // ---- Core colors (brand book, "Color / Identification") ----
  black:  "#000000",   // True Black  (PMS Process Black)
  white:  "#ffffff",   // True White
  panel:  "#ffffff",   // main content background
  soft:   "#f4f4f4",   // light neutral panel (a transparency of black — NOT cream)
  text:   "#111111",   // near-black body text
  muted:  "#6b6b6b",   // gray body text

  // ---- Default accent (monochrome; themes add a sparing accent) ----
  accent: "#000000",

  // ---- Fonts (brand book, "On Type") ----
  headingFont: "'Attila Sans Uniform', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  bodyFont:    "'Helvetica Neue', Helvetica, Arial, sans-serif",
  scriptFont:  "'Attila Sans Uniform', 'Helvetica Neue', Helvetica, Arial, sans-serif",

  footer: {
    site: "SNAPWELLNESS.COM",
    address: "SNAP Wellness · 123 Example Street, City, ST 00000",
    unsubscribeHtml: '<a href="{% unsubscribe %}" style="color:#6b6b6b;text-decoration:underline;">Unsubscribe</a>',
  },
};

const DEFAULT_CTA_URL = "https://www.snapwellness.com";

// -------------------------------------------------------------
//  1b) SEASONAL THEMES  —  EDIT / ADD OCCASIONS HERE.
//      Accent hexes are from SNAP's expansion palette:
//        Lavender #C5B4E3 · Lilac #E3C8D8 · Spring/lime #E0EC89
//        Magenta  #E63888 · Emerald #008675 · Indigo #00249C
// -------------------------------------------------------------
const THEMES = {
  default:    { accent: "#000000", kicker: "" },
  newyear:    { accent: "#00249C", kicker: "THE RESET" },        // Jan
  valentine:  { accent: "#E63888", kicker: "WITH LOVE" },        // Feb
  spring:     { accent: "#C5B4E3", kicker: "SPRING" },           // Mar–Apr
  memorial:   { accent: "#00249C", kicker: "SUMMER STARTS NOW" },// May
  summer:     { accent: "#008675", kicker: "SUMMER" },           // Jun–Jul
  july4:      { accent: "#00249C", kicker: "THE FOURTH" },       // July 4th week
  highsummer: { accent: "#E0EC89", kicker: "PEAK SUMMER" },      // Aug
  usopen:     { accent: "#E0EC89", kicker: "COURTSIDE" },        // US Open
  labor:      { accent: "#00249C", kicker: "END OF SUMMER" },    // Labor Day
  fall:       { accent: "#008675", kicker: "SPA SEASON" },       // Oct
  gratitude:  { accent: "#6b6b6b", kicker: "GRATITUDE" },        // Nov
  holiday:    { accent: "#008675", kicker: "THE HOLIDAY EDIT" }, // Dec
};

let C = Object.assign({}, BRAND, { kicker: "" });

function pickThemeKey(d) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const md = m * 100 + day;

  // specific occasion windows (priority over month season)
  if (md >= 1215 || md <= 101) return "holiday";
  if (md >= 208 && md <= 216)  return "valentine";
  if (md >= 522 && md <= 531)  return "memorial";
  if (md >= 701 && md <= 707)  return "july4";
  if (md >= 825 && md <= 908)  return "usopen";
  if (md >= 1122 && md <= 1130) return "gratitude";

  // month-based seasons
  if (m === 1)  return "newyear";
  if (m === 2)  return "valentine";
  if (m === 3 || m === 4) return "spring";
  if (m === 5)  return "memorial";
  if (m === 6 || m === 7) return "summer";
  if (m === 8)  return "highsummer";
  if (m === 9)  return "labor";
  if (m === 10) return "fall";
  if (m === 11) return "gratitude";
  if (m === 12) return "holiday";
  return "default";
}

function resolveTheme(data) {
  const key =
    (data && data.theme && THEMES[data.theme]) ? data.theme
      : pickThemeKey(resolveDate(data));
  C = Object.assign({}, BRAND, THEMES[key] || THEMES.default);
  return key;
}
function resolveDate(data) {
  const raw = data && (data.send_date || data.date || data.publish_date || data.date_iso);
  if (raw) { const d = new Date(raw); if (!isNaN(d.getTime())) return d; }
  return new Date();
}

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
    .map(p => `<p style="margin:0 0 16px;font-family:${BRAND.bodyFont};font-size:16px;line-height:1.65;color:${color || C.text};">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
function readableOn(hex) {
  const h = String(hex || "#000000").replace("#", "");
  if (h.length < 6) return "#ffffff";
  const r = parseInt(h.substr(0, 2), 16),
        g = parseInt(h.substr(2, 2), 16),
        b = parseInt(h.substr(4, 2), 16);
  const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return L > 0.6 ? "#000000" : "#ffffff";
}
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

function toList(v) {
  if (v == null) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr.filter(u => u != null && String(u).trim() !== "");
}
function img(url, alt) {
  if (!url) return "";
  return `<img src="${esc(url)}" alt="${esc(alt || "")}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;">`;
}
function imgs(urls, alt) {
  const list = toList(urls);
  if (!list.length) return "";
  return list.map((u, i) =>
    `<div style="font-size:0;line-height:0;${i ? "margin-top:2px;" : ""}">${img(u, alt)}</div>`
  ).join("");
}
function imgsCentered(urls, alt, w) {
  const list = toList(urls);
  if (!list.length) return "";
  const width = w || 240;
  return list.map((u, i) =>
    `<div style="${i ? "margin-top:16px;" : ""}"><img src="${esc(u)}" alt="${esc(alt || "")}" width="${width}" style="display:block;margin:0 auto;width:${width}px;max-width:80%;height:auto;border:0;"></div>`
  ).join("");
}

function headline(text, color, size) {
  return `<h1 style="margin:0 0 16px;font-family:${BRAND.headingFont};font-weight:700;font-size:${size || 30}px;line-height:1.12;letter-spacing:1px;text-transform:uppercase;color:${color || C.text};">${esc(text)}</h1>`;
}
function scriptHeader(text, color) {
  return `<div style="font-family:${BRAND.headingFont};font-weight:500;font-size:30px;line-height:1.12;letter-spacing:0.2px;color:${color || C.text};">${esc(text)}</div>`;
}
function kickerRow() {
  if (!C.kicker) return "";
  const fg = readableOn(C.accent);
  return `<tr><td style="padding:0 24px 16px;background:${C.black};">
    <span style="display:inline-block;background:${C.accent};color:${fg};font-family:${BRAND.headingFont};font-size:11px;letter-spacing:3px;font-weight:bold;text-transform:uppercase;padding:5px 12px;">${esc(C.kicker)}</span>
  </td></tr>`;
}

// -------------------------------------------------------------
//  3) SECTION RENDERERS
// -------------------------------------------------------------
const RENDER = {
  logo_header() {
    const inner = BRAND.logoUrl
      ? `<img src="${esc(BRAND.logoUrl)}" alt="${esc(BRAND.name)}" height="${BRAND.logoHeight}" style="display:block;height:${BRAND.logoHeight}px;width:auto;border:0;">`
      : `<span style="font-family:${BRAND.headingFont};font-weight:700;font-size:22px;letter-spacing:2px;color:#ffffff;">${esc(BRAND.name)}</span>`;
    return `<tr><td style="padding:18px 24px;background:${C.black};">${inner}</td></tr>`;
  },
  footer() {
    return `<tr><td align="center" style="padding:30px 24px;background:${C.black};">
      <p style="margin:0 0 10px;font-family:${BRAND.headingFont};font-size:13px;letter-spacing:2px;color:#ffffff;">${esc(BRAND.footer.site)}</p>
      <p style="margin:0 0 8px;font-family:${BRAND.bodyFont};font-size:11px;line-height:1.6;color:${C.muted};">${esc(BRAND.footer.address)}</p>
      <p style="margin:0;font-family:${BRAND.bodyFont};font-size:11px;line-height:1.6;color:${C.muted};">${BRAND.footer.unsubscribeHtml}</p>
    </td></tr>`;
  },

  machine_hero(s) {
    return `<tr><td style="background:${C.black};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="center" style="padding:40px 32px 28px;">
          ${headline(s.headline, "#ffffff", 30)}
          ${button(s.cta_label, s.cta_url, true)}
        </td>
      </tr></table>
      ${imgs(s.machine_image_url, s.headline)}
    </td></tr>`;
  },
  machine_body(s) {
    return `<tr><td style="padding:42px 34px;background:${C.panel};">
      ${s.header ? headline(s.header, C.text, 24) : ""}
      ${paras(s.body)}
      ${toList(s.machine_photo_url).length ? `<div style="margin-top:20px;">${imgs(s.machine_photo_url, s.header)}</div>` : ""}
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
        <p style="margin:0 0 4px;font-family:${BRAND.headingFont};font-weight:bold;font-size:12px;letter-spacing:1px;color:${C.text};">${esc(t)}</p>
        <div style="width:24px;height:2px;background:${C.accent};margin:6px auto 8px;"></div>
        <p style="margin:0;font-family:${BRAND.bodyFont};font-size:12px;line-height:1.5;color:${C.muted};">${esc(d)}</p>
      </td>`).join("");
    return `<tr><td style="padding:32px 18px;background:${C.soft};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>
    </td></tr>`;
  },
  outcomes_row(s) {
    const items = (s.outcomes || []).map(o => `
      <p style="margin:0 0 14px;font-family:${BRAND.bodyFont};font-size:15px;line-height:1.5;color:${C.text};">
        <span style="color:${C.accent};font-weight:bold;">&#10022;</span>&nbsp;&nbsp;${esc(o)}</p>`).join("");
    return `<tr><td style="padding:36px 44px;background:${C.panel};">${items}</td></tr>`;
  },
  closing_cta(s) {
    return `<tr><td align="center" style="padding:48px 32px;background:${C.black};">
      ${headline(s.headline, "#ffffff", 24)}
      ${button(s.cta_label, s.cta_url, true)}
    </td></tr>`;
  },

  hero_dark(s) {
    return `<tr><td style="background:${C.black};">
      ${imgs(s.product_image_url, s.headline)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="center" style="padding:36px 32px;">
          ${headline(s.headline, "#ffffff", 32)}
          ${button(s.cta_label, s.cta_url, true)}
        </td>
      </tr></table>
    </td></tr>`;
  },
  collections_intro(s) {
    return `<tr><td align="center" style="padding:44px 32px 16px;background:${C.panel};">
      ${scriptHeader(s.header, C.text)}
      ${s.subtitle ? `<p style="margin:14px 0 0;font-family:${BRAND.bodyFont};font-size:16px;line-height:1.6;color:${C.muted};">${esc(s.subtitle)}</p>` : ""}
    </td></tr>`;
  },
  collection_row(s) {
    return `<tr><td align="center" style="padding:24px 32px 32px;background:${C.panel};">
      ${imgsCentered(s.bottle_image_url, s.collection, 240)}
      ${s.collection ? `<p style="margin:14px 0 8px;font-family:${BRAND.headingFont};font-weight:bold;font-size:15px;letter-spacing:1px;text-transform:uppercase;color:${C.text};">${esc(s.collection)}</p>` : ""}
      ${s.description ? `<p style="margin:0 auto 14px;max-width:420px;font-family:${BRAND.bodyFont};font-size:15px;line-height:1.6;color:${C.muted};">${esc(s.description)}</p>` : ""}
      ${button(s.cta_label, s.cta_url, false)}
    </td></tr>`;
  },
  about_formula(s) {
    return `<tr><td style="padding:0;background:${C.panel};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="center" style="padding:40px 32px 8px;">
          ${s.header ? scriptHeader(s.header, C.text) : ""}
        </td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="center" style="padding:8px 40px 28px;">${paras(s.body)}</td>
      </tr></table>
      ${imgs(s.lifestyle_image_url, s.header)}
    </td></tr>`;
  },
  product_card(s) {
    const boxes = toList(s.product_image_url).map((u, i) =>
      `<div style="${i ? "margin-top:12px;" : ""}background:${C.soft};padding:24px;"><img src="${esc(u)}" alt="${esc(s.name)}" width="240" style="display:block;margin:0 auto;width:240px;max-width:80%;height:auto;border:0;"></div>`
    ).join("");
    return `<tr><td align="center" style="padding:24px 32px;background:${C.panel};">
      ${boxes}
      ${s.name ? `<p style="margin:14px 0 0;font-family:${BRAND.headingFont};font-weight:bold;font-size:14px;letter-spacing:1px;text-transform:uppercase;color:${C.text};">${esc(s.name)}</p>` : ""}
    </td></tr>`;
  },
  closing_lifestyle(s) {
    return `<tr><td style="background:${C.black};">
      ${imgs(s.lifestyle_image_url, s.headline)}
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
  const themeKey = resolveTheme(data);

  const incoming = Array.isArray(data.sections) ? data.sections : [];
  const body = incoming
    .filter(s => s && s.type && s.type !== "logo_header" && s.type !== "footer")
    .map(s => { const fn = RENDER[s.type]; return fn ? fn(s) : `<!-- unknown section: ${esc(s.type)} -->`; })
    .join("\n");

  const inner = RENDER.logo_header() + "\n" + kickerRow() + "\n" + body + "\n" + RENDER.footer();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${esc(data.subject || BRAND.name)}</title>
<!-- theme: ${esc(themeKey)} -->
</head>
<body style="margin:0;padding:0;background:${C.soft};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(data.preview_text || "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:${C.panel};">
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

    if (data && typeof data.json === "string") {
      const env = data;
      data = JSON.parse(env.json);
      ["send_date", "date", "publish_date", "date_iso", "theme"].forEach(k => {
        if (data[k] == null && env[k] != null) data[k] = env[k];
      });
    }

    // send_date / theme can arrive as URL query params:
    //   /api/render?send_date=2026-07-04     (auto seasonal theme)
    //   /api/render?theme=usopen             (force a specific theme)
    const q = req.query || {};
    ["send_date", "date", "publish_date", "date_iso", "theme"].forEach(k => {
      if (data && (data[k] == null || data[k] === "") && q[k]) data[k] = q[k];
    });

    if (!data || !Array.isArray(data.sections)) {
      res.status(400).json({ error: "Expected a JSON body with a 'sections' array.", received: data }); return;
    }
    const html = buildEmail(data);
    res.status(200).json({
      subject: data.subject || "",
      preview_text: data.preview_text || "",
      theme: resolveTheme(data),
      html
    });
  } catch (err) {
    res.status(400).json({ error: "Could not parse Mason's JSON.", detail: String(err && err.message || err) });
  }
};

module.exports.buildEmail = buildEmail;
module.exports.pickThemeKey = pickThemeKey;
