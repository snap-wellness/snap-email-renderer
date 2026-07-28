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
  logoUrl:     "https://res.cloudinary.com/da3jrnugf/image/upload/snap_lockup_white.png",   // full lockup (white) for the black B2B header
  logoUrlDark: "https://res.cloudinary.com/da3jrnugf/image/upload/snap_lockup_black.png",   // full lockup (black) for the white consumer header
  logoHeight: 38,

  // Benefit-strip GRAPHICS (icons + labels baked into one image each).
  // A benefits_strip uses: its own image_url, else graphics[section.graphic],
  // else the audience default (consumer -> consumer, B2B -> hotel).
  // Benefit strips are now code-built from ICONS + STRIP_SETS (defined below).

  social: [
    { label: "Twitter",   url: "https://twitter.com/",   icon: "" },
    { label: "Facebook",  url: "https://facebook.com/",  icon: "" },
    { label: "Instagram", url: "https://instagram.com/", icon: "" },
  ],

  // ---- Core colors (brand book) ----
  black:  "#000000",
  white:  "#ffffff",
  panel:  "#ffffff",
  soft:   "#f4f4f4",
  text:   "#111111",
  muted:  "#6b6b6b",
  accent: "#000000",

  // ---- Fonts (brand book, "On Type") ----
  headingFont: "'Attila Sans Uniform', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  bodyFont:    "'Helvetica Neue', Helvetica, Arial, sans-serif",
  cursiveFont: "'Snell Roundhand', 'Apple Chancery', 'Segoe Script', Georgia, serif",   // "About the Formula" script

  footer: {
    site: "SNAPWELLNESS.COM",
    unsubscribeHtml: 'No longer want to receive these emails? <a href="{% unsubscribe %}" style="color:#111111;text-decoration:underline;">Unsubscribe</a>.',
    orgName: "{{ organization.name }}",
    orgAddress: "{{ organization.full_address }}",
  },
};

const DEFAULT_CTA_URL = "https://www.snapwellness.com";

// -------------------------------------------------------------
//  1b) PRODUCT CATALOG  — image auto-fills when Mason names a product.
//      (All SPF 30. Pulled from snapwellness.com.)
// -------------------------------------------------------------
const PRODUCTS = {
  "everyday continuous spray":   "https://snapwellness.com/cdn/shop/files/EverydaySprayshadow_6a730adc-3f50-4844-8ae5-e21f1984f39a.png?v=1766424553&width=2000",
  "everyday matte mineral stick":"https://snapwellness.com/cdn/shop/files/EverydayStickwithShadow_c3929aa4-af1b-4e80-9180-c48390ffab1f.png?v=1748913924&width=3072",
  "everyday hydrating lip balm": "https://snapwellness.com/cdn/shop/files/EverydayLipBalmwithShadow.png?v=1748916789&width=3072",
  "swim continuous spray":       "https://snapwellness.com/cdn/shop/files/Swimspraywithshadow.png?v=1766424756&width=2000",
  "swim matte mineral stick":    "https://snapwellness.com/cdn/shop/files/Swimstickwithshadow.png?v=1748915613&width=3072",
  "swim hydrating lip balm":     "https://snapwellness.com/cdn/shop/files/Swimlipbalmwithshadow.png?v=1748969213&width=3072",
  "golf continuous spray":       "https://snapwellness.com/cdn/shop/files/GolfSpraywithshadow.png?v=1766425256&width=2000",
  "golf matte mineral stick":    "https://snapwellness.com/cdn/shop/files/Golf_Stick_with_Shadow.png?v=1748914241&width=3072",
  "golf hydrating lip balm":     "https://snapwellness.com/cdn/shop/files/GolfLipBalmwithshadow.png?v=1748917088&width=3072",
  "tennis continuous spray":     "https://snapwellness.com/cdn/shop/files/Tennisspraywithshadow_c070d607-f8e7-4ec0-b7f1-cea42e8e76bc.png?v=1766425450&width=2000",
  "tennis matte mineral stick":  "https://snapwellness.com/cdn/shop/files/TennisStickwithShadow.png?v=1748915960&width=3072",
  "tennis hydrating lip balm":   "https://snapwellness.com/cdn/shop/files/Tennislipbalmwithshadow.png?v=1748969509&width=3072",
  "kids continuous spray":       "https://snapwellness.com/cdn/shop/files/kidsspray-shadow.png?v=1766429344&width=2000",
  "kids matte mineral stick":    "https://snapwellness.com/cdn/shop/files/KidsStickwithShadow.png?v=1748914860&width=3072",
  "kids hydrating lip balm":     "https://snapwellness.com/cdn/shop/files/kids_centered_attempts.png?v=1749738279&width=3072",
  "ski continuous spray":        "https://snapwellness.com/cdn/shop/files/SkiSpraywithShadow.png?v=1766424926&width=2000",
  "ski matte mineral stick":     "https://snapwellness.com/cdn/shop/files/SkiStickwithShadow.png?v=1748915114&width=3072",
  "ski hydrating lip balm":      "https://snapwellness.com/cdn/shop/files/SkiLipbalmwithshadow.png?v=1748969976&width=3072",
};
function productImage(name) {
  if (!name) return "";
  return PRODUCTS[String(name).trim().toLowerCase()] || "";
}

// -------------------------------------------------------------
//  1d) BENEFIT ICONS + STRIP SETS  (code-built, always aligned)
// -------------------------------------------------------------
const ICON_BASE = "https://res.cloudinary.com/da3jrnugf/image/upload/";
const ICONS = {};
["reef_safe","clothing_safe","water_sweat","moisturizing","hypoallergenic","uva_uvb",
 "elevate_experience","generate_revenue","market_visibility",
 "ten_second_coverage","clean_ingredients","stain_free"].forEach(n => { ICONS[n] = ICON_BASE + n + ".png"; });

// White-circle BADGES for the "About the Formula" flanking layout.
const BADGES = {};
["mineral_based","hypoallergenic","water_sweat","no_white_cast","moisturizing","uva_uvb"].forEach(n => { BADGES[n] = ICON_BASE + "b_" + n + ".png"; });
// Default 6 features (3 left / 3 right) if a brief doesn't specify.
const DEFAULT_FEATURES = [
  { badge: "mineral_based",  label: "Mineral-Based" },
  { badge: "hypoallergenic", label: "Hypoallergenic" },
  { badge: "water_sweat",    label: "Water & Sweat Resistant" },
  { badge: "no_white_cast",  label: "No White Cast" },
  { badge: "moisturizing",   label: "Moisturizing" },
  { badge: "uva_uvb",        label: "UVA/UVB Broad Spectrum" },
];

// A benefits_strip picks a set by name (or the audience default). Each strip is
// drawn in code (icon + label), so it's always full-width and perfectly aligned.
const STRIP_SETS = {
  consumer: { on_dark: true, items: [
    { icon: "reef_safe",      label: "Reef-Safe & Eco-Friendly" },
    { icon: "clothing_safe",  label: "Clothing Safe" },
    { icon: "water_sweat",    label: "Water & Sweat Resistant" },
    { icon: "moisturizing",   label: "Moisturizing" },
    { icon: "hypoallergenic", label: "Hypoallergenic" },
  ]},
  growth: { on_dark: true, items: [
    { icon: "elevate_experience", label: "Elevate Experience" },
    { icon: "generate_revenue",   label: "Generate Revenue" },
    { icon: "market_visibility",  label: "Increase Market Visibility" },
  ]},
  claims: { on_dark: true, items: [
    { icon: "ten_second_coverage", label: "10 Second Coverage", sub: "One 10-second rotation gives guests complete, even sun protection." },
    { icon: "clean_ingredients",   label: "Clean Ingredients",  sub: "Eco-friendly, hypoallergenic, and free from oxybenzone, PABA, and parabens." },
    { icon: "stain_free",          label: "Stain-Free Application", sub: "Transparent and non-greasy, with no white cast that harms clothing." },
  ]},
};

// -------------------------------------------------------------
//  1c) SEASONAL ACCENT (subtle; no more "kicker" chip)
// -------------------------------------------------------------
const THEMES = {
  default: "#000000", newyear: "#00249C", valentine: "#E63888", spring: "#C5B4E3",
  memorial: "#00249C", summer: "#008675", july4: "#00249C", highsummer: "#E0EC89",
  usopen: "#E0EC89", labor: "#00249C", fall: "#008675", gratitude: "#6b6b6b", holiday: "#008675",
};
let C = Object.assign({}, BRAND);
let AUD = "";
function isB2B() { return AUD === "hotel" || AUD === "country club" || AUD === "camp"; }

function pickThemeKey(d) {
  const m = d.getMonth() + 1, day = d.getDate(), md = m * 100 + day;
  if (md >= 1215 || md <= 101) return "holiday";
  if (md >= 208 && md <= 216)  return "valentine";
  if (md >= 522 && md <= 531)  return "memorial";
  if (md >= 701 && md <= 707)  return "july4";
  if (md >= 825 && md <= 908)  return "usopen";
  if (md >= 1122 && md <= 1130) return "gratitude";
  if (m === 1) return "newyear";
  if (m === 2) return "valentine";
  if (m === 3 || m === 4) return "spring";
  if (m === 5) return "memorial";
  if (m === 6 || m === 7) return "summer";
  if (m === 8) return "highsummer";
  if (m === 9) return "labor";
  if (m === 10) return "fall";
  if (m === 11) return "gratitude";
  if (m === 12) return "holiday";
  return "default";
}
function resolveTheme(data) {
  const key = (data && data.theme && THEMES[data.theme]) ? data.theme : pickThemeKey(resolveDate(data));
  C = Object.assign({}, BRAND, { accent: THEMES[key] || "#000000" });
  AUD = String((data && data.audience) || "").toLowerCase();
  return key;
}
function resolveDate(data) {
  const raw = data && (data.send_date || data.date || data.publish_date || data.date_iso);
  if (raw) { const d = new Date(String(raw).trim()); if (!isNaN(d.getTime())) return d; }
  return new Date();
}

// -------------------------------------------------------------
//  2) HELPERS
// -------------------------------------------------------------
// Remove em/en dashes from copy (brand rule). Regular hyphens are kept.
function noDash(s) { return String(s == null ? "" : s).replace(/\s*[—–]\s*/g, ", "); }
// Escape for visible copy (also strips em/en dashes).
function escText(s) {
  return noDash(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// Escape for URLs / attributes (no dash stripping).
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function paras(text, color) {
  return String(text || "").split(/\n{2,}|\r\n\r\n/).filter(Boolean)
    .map(p => `<p style="margin:0 0 16px;font-family:${BRAND.bodyFont};font-size:16px;line-height:1.65;color:${color || C.text};">${escText(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
// CTA label with B2B guard: B2B never says "SHOP…".
function ctaText(label) {
  let t = String(label || "").trim();
  if (isB2B() && /^shop\b/i.test(t)) t = "LEARN MORE";
  if (!t) t = isB2B() ? "LEARN MORE" : "SHOP NOW";
  return t;
}
function button(label, url, onDark) {
  const href = esc(url && String(url).trim() ? url : DEFAULT_CTA_URL);
  const text = escText(ctaText(label)).toUpperCase();
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
function smallButton(label, url) {
  const href = esc(url && String(url).trim() ? url : DEFAULT_CTA_URL);
  const text = escText(ctaText(label)).toUpperCase();
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0;"><tr>
    <td bgcolor="#000000"><a href="${href}" target="_blank" style="display:inline-block;padding:10px 22px;font-family:${BRAND.bodyFont};font-size:11px;letter-spacing:1px;font-weight:bold;text-transform:uppercase;color:#ffffff;text-decoration:none;">${text}</a></td>
  </tr></table>`;
}

function toList(v) {
  if (v == null) return [];
  return (Array.isArray(v) ? v : [v]).filter(u => u != null && String(u).trim() !== "");
}
let SEEN = new Set();
function once(url) {
  const k = String(url == null ? "" : url).trim();
  if (!k || SEEN.has(k)) return false;
  SEEN.add(k); return true;
}
function newImages(urls) { return toList(urls).filter(once); }
function nextImage(urls) { for (const u of toList(urls)) { if (once(u)) return u; } return ""; }

function img(url, alt) {
  if (!url) return "";
  return `<img src="${esc(url)}" alt="${esc(alt || "")}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;">`;
}
function imgs(urls, alt) {
  const list = newImages(urls);
  if (!list.length) return "";
  return list.map((u, i) => `<div style="font-size:0;line-height:0;${i ? "margin-top:2px;" : ""}">${img(u, alt)}</div>`).join("");
}
function headline(text, color, size) {
  return `<h1 style="margin:0 0 14px;font-family:${BRAND.headingFont};font-weight:700;font-size:${size || 30}px;line-height:1.12;letter-spacing:1px;text-transform:uppercase;color:${color || C.text};">${escText(text)}</h1>`;
}
function sub(text, color) {
  return `<p style="margin:0 0 16px;font-family:${BRAND.bodyFont};font-size:15px;line-height:1.55;color:${color || C.muted};">${escText(text)}</p>`;
}
function cursiveHeader(text, color) {
  return `<div style="font-family:${BRAND.cursiveFont};font-style:italic;font-size:40px;line-height:1.1;color:${color || C.text};">${escText(text)}</div>`;
}
// one flanking badge cell: badge image + label (label side: 'left' or 'right')
function badgeCell(feat, side) {
  const src = BADGES[feat.badge] || feat.badge_url || "";
  const badge = src ? `<img src="${esc(src)}" alt="" width="54" height="54" style="display:block;width:54px;height:54px;border:0;">` : "";
  const label = `<span style="font-family:${BRAND.bodyFont};font-size:12px;line-height:1.3;color:${C.text};">${escText(feat.label)}</span>`;
  const cells = side === "left"
    ? `<td valign="middle" align="right" style="padding:8px 8px;">${label}</td><td valign="middle" width="60" style="padding:8px 0;">${badge}</td>`
    : `<td valign="middle" width="60" style="padding:8px 0;">${badge}</td><td valign="middle" align="left" style="padding:8px 8px;">${label}</td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`;
}
function socialRow() {
  const items = (BRAND.social || []).filter(s => s && s.url);
  if (!items.length) return "";
  const cells = items.map(s => s.icon
    ? `<td style="padding:0 10px;"><a href="${esc(s.url)}" target="_blank"><img src="${esc(s.icon)}" alt="${esc(s.label)}" width="18" height="18" style="display:block;border:0;"></a></td>`
    : `<td style="padding:0 10px;"><a href="${esc(s.url)}" target="_blank" style="font-family:${BRAND.bodyFont};font-size:11px;letter-spacing:1px;color:${C.muted};text-decoration:none;text-transform:uppercase;">${esc(s.label)}</a></td>`
  ).join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;"><tr>${cells}</tr></table>`;
}
// Code-built benefit strip (icon + label [+ sub]). Always full-width / aligned.
function iconStrip(header, items, dark) {
  const bg = dark ? C.black : C.panel;
  const fg = dark ? "#ffffff" : C.text;
  const subc = dark ? "#cfcfcf" : C.muted;
  const cells = (items || []).map(it => {
    const src = (it.icon && ICONS[it.icon]) || it.icon_url || "";
    return `<td valign="top" align="center" class="stackcol" style="padding:14px 10px;">
      ${src ? `<img src="${esc(src)}" alt="" width="46" height="46" style="display:block;margin:0 auto 12px;border:0;">` : ""}
      <p style="margin:0 0 4px;font-family:${BRAND.headingFont};font-weight:bold;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:${fg};">${escText(it.label)}</p>
      ${it.sub ? `<p style="margin:0;font-family:${BRAND.bodyFont};font-size:11px;line-height:1.45;color:${subc};">${escText(it.sub)}</p>` : ""}
    </td>`;
  }).join("");
  return `<tr><td style="padding:34px 16px;background:${bg};">
    ${header ? `<p style="margin:0 0 22px;text-align:center;font-family:${BRAND.headingFont};font-weight:700;font-size:24px;letter-spacing:1px;text-transform:uppercase;color:${fg};">${escText(header)}</p>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>
  </td></tr>`;
}

// -------------------------------------------------------------
//  3) SECTION RENDERERS
// -------------------------------------------------------------
const RENDER = {
  logo_header() {
    const dark = isB2B();
    const bg = dark ? C.black : C.white;
    const src = dark ? BRAND.logoUrl : BRAND.logoUrlDark;
    const inner = src
      ? `<img src="${esc(src)}" alt="${esc(BRAND.name)}" height="${BRAND.logoHeight}" style="display:block;height:${BRAND.logoHeight}px;width:auto;border:0;">`
      : `<span style="font-family:${BRAND.headingFont};font-weight:700;font-size:22px;letter-spacing:2px;color:${dark ? "#ffffff" : "#000000"};">${esc(BRAND.name)}</span>`;
    const border = dark ? "" : "border-bottom:1px solid #ececec;";
    return `<tr><td align="center" style="padding:16px 24px;background:${bg};${border}">${inner}</td></tr>`;
  },
  footer() {
    return `<tr><td align="center" style="padding:22px 24px;background:${C.black};">
      <p style="margin:0;font-family:${BRAND.headingFont};font-size:13px;letter-spacing:2px;color:#ffffff;">${esc(BRAND.footer.site)}</p>
    </td></tr>
    <tr><td align="center" style="padding:22px 24px 10px;background:${C.panel};">${socialRow()}</td></tr>
    <tr><td align="center" style="padding:6px 24px 26px;background:${C.panel};">
      <p style="margin:0 0 12px;font-family:${BRAND.bodyFont};font-size:12px;line-height:1.6;color:${C.text};">${BRAND.footer.unsubscribeHtml}</p>
      <p style="margin:0 0 4px;font-family:${BRAND.bodyFont};font-size:11px;line-height:1.6;color:${C.muted};">${BRAND.footer.orgName}</p>
      <p style="margin:0;font-family:${BRAND.bodyFont};font-size:11px;line-height:1.6;color:${C.muted};">${BRAND.footer.orgAddress}</p>
    </td></tr>`;
  },

  // ---- Consumer ----
  // Hero: campaign HEADER (live) + image + subheader/button. Header replaces the old kicker chip.
  hero_dark(s) {
    const head = s.header || s.headline;
    const image = imgs(s.product_image_url || s.image_url, head);
    const bar = s.subheadline || s.cta_label;
    return `${head ? `<tr><td align="center" style="padding:32px 32px 16px;background:${C.panel};">${headline(head, C.text, 30)}</td></tr>` : ""}
    ${image ? `<tr><td style="background:${C.panel};">${image}</td></tr>` : ""}
    ${bar ? `<tr><td align="center" style="padding:20px 32px 28px;background:${C.panel};">
      ${s.subheadline ? sub(s.subheadline) : ""}
      ${s.cta_label ? button(s.cta_label, s.cta_url, false) : ""}
    </td></tr>` : ""}`;
  },
  collections_intro(s) {
    return `<tr><td align="center" style="padding:44px 32px 18px;background:${C.panel};">
      ${s.header ? headline(s.header, C.text, 26) : ""}
      ${s.subtitle ? `<p style="margin:6px auto 0;max-width:440px;font-family:${BRAND.bodyFont};font-size:15px;line-height:1.6;color:${C.muted};">${escText(s.subtitle)}</p>` : ""}
    </td></tr>`;
  },
  // Two-column product row. Image auto-fills from the catalog when the name matches.
  collection_row(s) {
    const image = nextImage(s.bottle_image_url || s.product_image_url || productImage(s.collection));
    const left = `
      ${s.eyebrow ? `<p style="margin:0 0 6px;font-family:${BRAND.bodyFont};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${C.accent};">${escText(s.eyebrow)}</p>` : ""}
      ${s.collection ? `<p style="margin:0 0 8px;font-family:${BRAND.headingFont};font-weight:bold;font-size:18px;letter-spacing:0.3px;color:${C.text};">${escText(s.collection)}</p>` : ""}
      ${s.description ? `<p style="margin:0 0 14px;font-family:${BRAND.bodyFont};font-size:14px;line-height:1.55;color:${C.muted};">${escText(s.description)}</p>` : ""}
      ${smallButton(s.cta_label, s.cta_url)}`;
    if (!image) return `<tr><td style="padding:16px 32px;background:${C.panel};">${left}</td></tr>`;
    return `<tr><td style="padding:16px 24px;background:${C.panel};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="52%" valign="middle" class="stackcol" style="padding:8px 16px 8px 6px;">${left}</td>
        <td width="48%" valign="middle" class="stackcol" style="padding:8px 0;"><img src="${esc(image)}" alt="${esc(s.collection || "")}" width="270" style="display:block;width:100%;max-width:270px;height:auto;border:0;"></td>
      </tr></table>
    </td></tr>`;
  },
  // Flanking layout: cursive header, blurb, product photo with 3 badges each side, product-name button.
  about_formula(s) {
    const head = s.header || "About the Formula";
    const productImg = s.product_image_url || s.lifestyle_image_url;
    if (productImg) {
      const feats = (Array.isArray(s.features) && s.features.length) ? s.features : DEFAULT_FEATURES;
      const left = feats.slice(0, 3), right = feats.slice(3, 6);
      const hero = `<img src="${esc(nextImage(productImg))}" alt="" width="240" style="display:block;width:100%;max-width:240px;height:auto;border:0;border-radius:14px;margin:0 auto;">`;
      return `<tr><td align="center" style="padding:40px 24px 6px;background:${C.panel};">
        ${cursiveHeader(head, C.text)}
        ${s.body ? `<div style="max-width:420px;margin:14px auto 4px;">${paras(s.body)}</div>` : ""}
      </td></tr>
      <tr><td style="padding:6px 14px 8px;background:${C.panel};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="28%" valign="middle" class="stackcol" style="padding:0;">${left.map(fh => badgeCell(fh, "left")).join("")}</td>
          <td width="44%" valign="middle" class="stackcol" style="padding:0 6px;">${hero}</td>
          <td width="28%" valign="middle" class="stackcol" style="padding:0;">${right.map(fh => badgeCell(fh, "right")).join("")}</td>
        </tr></table>
      </td></tr>
      ${s.cta_label ? `<tr><td align="center" style="padding:18px 32px 30px;background:${C.panel};">${button(s.cta_label, s.cta_url, false)}</td></tr>` : ""}`;
    }
    // fallback: simple centered version
    return `<tr><td style="padding:0;background:${C.panel};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="center" style="padding:40px 32px 8px;">${cursiveHeader(head, C.text)}</td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="center" style="padding:8px 40px 28px;">${paras(s.body)}</td>
      </tr></table>
      ${imgs(s.lifestyle_image_url, s.header)}
    </td></tr>`;
  },
  // Two-up product grid: name, image (auto from catalog), button.
  product_grid(s) {
    const items = (s.items || []).slice(0, 4);
    let rows = "";
    for (let i = 0; i < items.length; i += 2) {
      const cells = items.slice(i, i + 2).map(it => {
        const im = nextImage(it.product_image_url || productImage(it.name));
        return `<td width="50%" valign="top" align="center" class="stackcol" style="padding:12px 12px 24px;">
          ${it.name ? `<p style="margin:0 0 12px;font-family:${BRAND.headingFont};font-weight:bold;font-size:14px;letter-spacing:0.5px;text-transform:uppercase;color:${C.text};">${escText(it.name)}</p>` : ""}
          ${im ? `<div style="background:${C.soft};padding:18px;"><img src="${esc(im)}" alt="${esc(it.name)}" width="220" style="display:block;width:100%;max-width:220px;height:auto;border:0;margin:0 auto;"></div>` : ""}
          <div style="margin-top:14px;">${smallButton(it.cta_label, it.cta_url)}</div>
        </td>`;
      }).join("");
      rows += `<tr>${cells}</tr>`;
    }
    return `<tr><td style="padding:16px 20px;background:${C.panel};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </td></tr>`;
  },
  product_card(s) {
    const boxes = newImages(toList(s.product_image_url).length ? s.product_image_url : productImage(s.name)).map((u, i) =>
      `<div style="${i ? "margin-top:12px;" : ""}background:${C.soft};padding:24px;"><img src="${esc(u)}" alt="${esc(s.name)}" width="240" style="display:block;margin:0 auto;width:240px;max-width:80%;height:auto;border:0;"></div>`).join("");
    return `<tr><td align="center" style="padding:24px 32px;background:${C.panel};">
      ${boxes}
      ${s.name ? `<p style="margin:14px 0 0;font-family:${BRAND.headingFont};font-weight:bold;font-size:14px;letter-spacing:1px;text-transform:uppercase;color:${C.text};">${escText(s.name)}</p>` : ""}
    </td></tr>`;
  },
  closing_lifestyle(s) {
    const image = imgs(s.lifestyle_image_url, s.header || s.headline);
    const head = s.header || s.headline;
    return `${image ? `<tr><td style="background:${C.panel};">${image}</td></tr>` : ""}
    ${(head || s.cta_label) ? `<tr><td align="center" style="padding:24px 32px 30px;background:${C.panel};">
      ${head ? headline(head, C.text, 22) : ""}
      ${s.cta_label ? button(s.cta_label, s.cta_url, false) : ""}
    </td></tr>` : ""}`;
  },
  quiz_row(s) {
    const isTrue = String(s.correct).toLowerCase() === "true";
    const box = (on) => `<span style="display:inline-block;width:12px;height:12px;border:1px solid ${C.text};vertical-align:middle;margin-right:6px;background:${on ? C.text : "#ffffff"};"></span>`;
    const left = `
      ${s.number || s.prompt_label ? `<p style="margin:0 0 6px;font-family:${BRAND.bodyFont};font-size:12px;color:${C.muted};">${escText([s.number, s.prompt_label || "True or False?"].filter(Boolean).join(". "))}</p>` : ""}
      <p style="margin:0 0 12px;font-family:${BRAND.headingFont};font-weight:bold;font-size:18px;line-height:1.2;color:${C.text};">${escText(s.question)}</p>
      <p style="margin:0 0 12px;font-family:${BRAND.bodyFont};font-size:13px;color:${C.text};">${box(isTrue)}True&nbsp;&nbsp;&nbsp;${box(!isTrue)}False</p>
      <div style="width:36px;height:1px;background:${C.muted};margin:0 0 12px;"></div>
      <p style="margin:0 0 6px;font-family:${BRAND.headingFont};font-weight:bold;font-size:14px;color:${C.text};">${isTrue ? "True." : "False."}</p>
      <p style="margin:0 0 14px;font-family:${BRAND.bodyFont};font-size:13px;line-height:1.55;color:${C.muted};">${escText(s.explanation)}</p>
      ${smallButton(s.cta_label, s.cta_url)}`;
    const image = nextImage(s.image_url || s.product_image_url);
    if (!image) return `<tr><td style="padding:14px 32px;background:${C.soft};">${left}</td></tr>`;
    return `<tr><td style="padding:14px 24px;background:${C.soft};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="52%" valign="top" class="stackcol" style="padding:14px 16px;">${left}</td>
        <td width="48%" valign="middle" class="stackcol" style="padding:0;"><img src="${esc(image)}" alt="" width="270" style="display:block;width:100%;max-width:270px;height:auto;border:0;"></td>
      </tr></table>
    </td></tr>`;
  },
  // Benefit strip = a full-width GRAPHIC image (icons + labels baked in).
  // Uses per-campaign image_url, else the standard BRAND.benefitGraphic.
  // Falls back to a text/icon build only if no graphic is available.
  benefits_strip(s) {
    // 1) explicit graphic image overrides (rarely needed now)
    if (s.image_url) {
      const g = nextImage(s.image_url);
      if (g) {
        const dk = s.on_dark !== false;
        return `<tr><td style="padding:0;background:${dk ? C.black : C.panel};">
          ${s.header ? `<p style="margin:0;padding:30px 24px 6px;text-align:center;font-family:${BRAND.headingFont};font-weight:700;font-size:24px;letter-spacing:1px;text-transform:uppercase;color:${dk ? "#ffffff" : C.text};">${escText(s.header)}</p>` : ""}
          <img src="${esc(g)}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
        </td></tr>`;
      }
    }
    // 2) code-built strip from a named set (default by audience), or ad-hoc items
    const setKey = s.set || (isB2B() ? "claims" : "consumer");
    const def = STRIP_SETS[setKey] || (Array.isArray(s.items) && s.items.length ? { on_dark: s.on_dark !== false, items: s.items } : null);
    if (def) return iconStrip(s.header, def.items, def.on_dark !== false);
    return "";
  },

  // ---- Machine / B2B ----
  machine_hero(s) {
    const head = s.header || s.headline;
    return `<tr><td style="background:${C.black};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="center" style="padding:40px 32px 26px;">
          ${head ? headline(head, "#ffffff", 30) : ""}
          ${s.subheadline ? `<p style="margin:0 0 6px;font-family:${BRAND.bodyFont};font-size:15px;line-height:1.5;color:#cfcfcf;">${escText(s.subheadline)}</p>` : ""}
        </td>
      </tr></table>
      ${imgs(s.machine_image_url, head)}
      ${s.cta_label ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td align="center" style="padding:22px 32px 34px;">${button(s.cta_label, s.cta_url, true)}</td>
      </tr></table>` : ""}
    </td></tr>`;
  },
  machine_body(s) {
    const photo = imgs(s.machine_photo_url, s.header);
    return `<tr><td align="center" style="padding:44px 40px;background:${C.panel};">
      ${s.header ? `<p style="margin:0 0 16px;font-family:${BRAND.headingFont};font-weight:500;font-size:24px;letter-spacing:0.3px;color:${C.text};">${escText(s.header)}</p>` : ""}
      <div style="max-width:460px;margin:0 auto;">${paras(s.body)}</div>
      ${photo ? `<div style="margin-top:20px;">${photo}</div>` : ""}
    </td></tr>`;
  },
  claims_row(s) { return RENDER.benefits_strip(s); },   // alias — same graphic treatment
  outcomes_row(s) {
    if (Array.isArray(s.items) && s.items.length || s.image_url) return RENDER.benefits_strip(s);
    const items = (s.outcomes || []).map(o => `
      <p style="margin:0 0 14px;font-family:${BRAND.bodyFont};font-size:15px;line-height:1.5;color:${C.text};">
        <span style="color:${C.accent};font-weight:bold;">&#10022;</span>&nbsp;&nbsp;${escText(o)}</p>`).join("");
    return `<tr><td style="padding:36px 44px;background:${C.panel};">${items}</td></tr>`;
  },
  closing_cta(s) {
    const head = s.header || s.headline;
    return `<tr><td align="center" style="padding:48px 32px;background:${C.black};">
      ${head ? headline(head, "#ffffff", 24) : ""}
      ${s.cta_label ? button(s.cta_label, s.cta_url, true) : ""}
    </td></tr>`;
  },
};

// -------------------------------------------------------------
//  4) ASSEMBLE
// -------------------------------------------------------------
function buildEmail(data) {
  const themeKey = resolveTheme(data);
  const dark = isB2B();
  SEEN = new Set();

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
<!-- theme: ${esc(themeKey)} | audience: ${esc(AUD || "consumer")} -->
<style>
  @media only screen and (max-width:480px){
    .stackcol{display:block !important;width:100% !important;padding:10px 6px !important;text-align:center !important;}
    .stackcol img{margin:0 auto !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.soft};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escText(data.preview_text || "")}</div>
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
      ["send_date", "date", "publish_date", "date_iso", "theme", "audience"].forEach(k => {
        if (data[k] == null && env[k] != null) data[k] = env[k];
      });
    }
    const q = req.query || {};
    ["send_date", "date", "publish_date", "date_iso", "theme"].forEach(k => {
      if (data && (data[k] == null || data[k] === "") && q[k]) data[k] = q[k];
    });
    if (!data || !Array.isArray(data.sections)) {
      res.status(400).json({ error: "Expected a JSON body with a 'sections' array.", received: data }); return;
    }
    const html = buildEmail(data);
    res.status(200).json({ subject: data.subject || "", preview_text: data.preview_text || "", theme: resolveTheme(data), html });
  } catch (err) {
    res.status(400).json({ error: "Could not parse Mason's JSON.", detail: String(err && err.message || err) });
  }
};

module.exports.buildEmail = buildEmail;
module.exports.pickThemeKey = pickThemeKey;
