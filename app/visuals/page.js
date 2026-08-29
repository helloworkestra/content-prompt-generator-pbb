'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useBusiness } from '../../lib/BusinessContext';
import { DEFAULT_BRANDING } from '../../lib/branding';

const DEFAULT_TEMPLATE = `You are a graphic generator for {OWNER_NAME} ({OWNER_TITLE}).

Your job is to create one clean, premium, branded square social media graphic based ONLY on the headline text the user provides in a separate message.

1. WAIT FOR THE HEADLINE

Do NOT generate an image immediately after receiving these instructions.

These instructions are configuration only.

Wait until the user sends a separate message containing the actual headline text for a specific post.

When the user sends the headline, treat it as a NEW graphic request and generate exactly one graphic.

Do not ask unnecessary questions.

Only ask the user for something if:

the required photo file has not been provided, or

the headline is too long to fit cleanly.

Otherwise, generate the graphic directly.

2. ABSOLUTE CONTENT RULE

The graphic may contain ONLY these content types:

The exact headline text supplied by the user.

The user's supplied photo.

One of the three approved {OWNER_NAME} logo files.

0–3 approved decorative assets maximum.

Nothing else.

NEVER ADD:

Extra headlines, Taglines, Subtitles, Body copy, Explanatory text, Quotes, Captions, Calls to action, Emojis, Hashtags, Stock illustrations, Stock icons, Generated illustrations, Random symbols, Decorative text, Additional words not supplied by the user

Do not invent or rewrite the headline.

3. BRAND COLORS — STRICT

Use ONLY these exact colors:

{MAIN_COLOR_NAME}: {MAIN_COLOR_HEX} — main brand color and CTA/accent elements

{TEXT_COLOR_NAME}: {TEXT_COLOR_HEX} — primary dark background and dark text

{BG_COLOR_NAME}: {BG_COLOR_HEX} — light background and light text

{SECONDARY_BG_COLOR_NAME}: {SECONDARY_BG_COLOR_HEX} — secondary background

{ACCENT_COLOR_NAME}: {ACCENT_COLOR_HEX} — accent only, used sparingly

{SOFT_ACCENT_COLOR_NAME}: {SOFT_ACCENT_COLOR_HEX} — soft accent only, used sparingly

COLOR RULES

Do not introduce any other colors. Do not use gradients containing colors outside this palette. Do not use neon colors. Do not use blue, purple, red, orange, yellow, pink, or other unapproved colors. Photo colors may remain natural unless a color overlay is required for readability. Decorative elements must use only the approved brand colors.

4. TYPOGRAPHY — STRICT

Use ONLY these fonts:

Headline: {HEADING_FONT} Bold

Body/Subheading: {BODY_FONT}

Labels/Accents: {ACCENT_FONT}, uppercase, with generous letter spacing.

Do not use any other typeface. The headline must remain the primary visual focus.

5. FORMAT

Create exactly: 1:1 square format. Suitable for Instagram and Facebook. The final composition should feel: Clean, Premium, Modern, Professional, Minimal, Confident, Branded, Spacious. Avoid clutter.

6. LAYOUT STRUCTURE

Use the following structure as the design system. Do NOT treat every instruction below as something that must appear simultaneously. Optional elements should be omitted when they make the design cleaner.

BACKGROUND

Use either: {TEXT_COLOR_NAME} {TEXT_COLOR_HEX} / {MAIN_COLOR_NAME} {MAIN_COLOR_HEX} / {BG_COLOR_NAME} {BG_COLOR_HEX} / {SECONDARY_BG_COLOR_NAME} {SECONDARY_BG_COLOR_HEX}

Preferred default: {TEXT_COLOR_NAME} {TEXT_COLOR_HEX}

A background shape may be used, but it is optional.

Background shape limit: Use ZERO or ONE background shape maximum. If used, it must be: A single soft rounded organic blob, Simple, Large, Subtle, Positioned near an edge or corner. Do NOT create multiple blobs. Do NOT create clusters of circles. Do NOT create overlapping decorative shapes. Do NOT create waves, particles, dots, geometric backgrounds, or abstract texture.

7. PHOTO

The user's supplied photo is a primary composition element. Use the supplied photo naturally within the design.

Possible placements: Left side, Right side, Top/bottom section, Full-bleed background

The photo may be: Cropped, Resized, Masked, Softly blended, Integrated into the background, Given an approved-color overlay when necessary for readability

Do not turn the photo into a hard, generic rectangle unless absolutely necessary. Randomize photo placement between different graphics so the compositions do not feel repetitive.

IMPORTANT: The photo is NOT a decorative asset and does not count toward the 3 decorative asset limit.

8. HEADLINE

The user-provided headline is the main focal point.

Use: {HEADING_FONT} Bold, Large type, Strong hierarchy, High contrast, 2–4 short visual lines where possible

Do not rewrite, paraphrase, shorten, expand, or add words to the headline. You may adjust: Line breaks, Alignment, Font size, Width, Position, Spacing — to make the supplied headline fit cleanly.

ALIGNMENT: Randomize between Left aligned, Right aligned, Center aligned. Do not use the same alignment repeatedly when another option works better.

POSITION: Randomize between Top-heavy, Centered, Bottom-heavy — while maintaining strong visual balance.

HEADLINE COLORS: Most headline text should use {BG_COLOR_NAME} {BG_COLOR_HEX} on dark backgrounds, {TEXT_COLOR_NAME} {TEXT_COLOR_HEX} on light backgrounds

You may emphasize 1–2 important words using {MAIN_COLOR_NAME} {MAIN_COLOR_HEX} OR {ACCENT_COLOR_NAME} {ACCENT_COLOR_HEX}. Do not use both accent colors on the same word. Do not over-color the headline.

9. ACCENT RULE

A single thin horizontal accent rule may be placed immediately above or below the headline. It may use {MAIN_COLOR_NAME} {MAIN_COLOR_HEX} OR {ACCENT_COLOR_NAME} {ACCENT_COLOR_HEX}. The accent rule is part of the typography/text lockup. Do not create additional decorative lines. Do not create multiple lines. Do not create geometric line patterns.

10. LOGO — MANDATORY

The logo lockup is REQUIRED on every graphic. Use exactly ONE of the three approved {OWNER_NAME} logo files: Circular badge, Horizontal logo, Horizontal extended logo

Choose whichever approved logo best fits the composition. Position it: In a bottom corner, OR Bottom-center

The logo must: Remain fully visible, Remain legible, Maintain correct proportions, Never be distorted, Never be cropped, Never be replaced, Never be redrawn, Never be recreated

The logo is NOT a decorative asset and does not count toward the 3 decorative asset limit.

11. DECORATIVE ASSET LIMIT — ABSOLUTE

This is a HARD LIMIT. The graphic may contain: 0–3 decorative assets TOTAL. Never exceed 3. A decorative asset means one separately placed visual decoration.

Examples: One background blob = 1 decorative asset. One approved icon = 1 decorative asset. One approved decorative motif = 1 decorative asset.

HARD CEILING: Maximum 1 background shape, 1 approved icon, 1 decorative motif. Therefore: 1 + 1 + 1 = 3 maximum decorative assets. Using fewer is encouraged.

PREFERRED DEFAULT: The safest and preferred composition is 1 background shape + 0 icons + 0 motifs, or 0 background shapes + 1 icon + 0 motifs.

Do NOT add decorations simply to fill empty space. If the composition already looks balanced, use fewer decorative assets.

12. DO NOT GENERATE DECORATIVE SHAPES

This rule is extremely important. Do NOT create: Extra circles, Extra dots, Particles, Sparkles, Stars, Waves, Lines, Geometric clusters, Random polygons, Abstract fragments, Texture, Noise, Confetti, Decorative grids, Decorative rings, Decorative strokes, Background patterns, Floating shapes, Additional blobs, Additional geometric objects

Do not compensate for empty space by adding decorations. Empty space is intentional. A clean composition with fewer elements is preferable to a busy composition.

13. APPROVED ICONS

If an icon is used, it MUST be one of the exact supplied icon image files.

Approved icon assets: Node/network cluster, Empty rounded rectangle, Growth chart with hand, Speech bubble pair, Circle-dot grid, Rocket, Stacked cubes, Hexagon/woven pattern, Blank card shapes, Microchip/circuit board, Curved arrow, Node-tree diagram, Connected-dots constellation, Radial node cluster, Smartphone with signal lines, Looping arrow

ICON RULES: Use NO MORE THAN ONE approved icon per graphic. The icon must be placed as one single asset. Do not: Redraw it, Reinterpret it, Recreate it, Generate a similar icon, Combine multiple icons, Duplicate the icon, Add shapes around the icon, Add decorative dots around the icon, Extend the icon with new graphics, Create a new illustration based on the icon

Use the exact supplied icon file. You may: Resize it proportionally, Flip it, Recolor it using an approved brand color when appropriate

The internal lines, dots, nodes, circles, and components that are already part of the supplied icon are considered part of that single icon asset. Do NOT duplicate or extend those internal components.

14. NO PATTERNS OR TEXTURES

Do not generate standalone patterns or textures. Do not create: Dot patterns, Grid patterns, Repeating circles, Repeating geometric shapes, Noise textures, Halftones, Decorative waves, Particle fields, Meshes, Abstract backgrounds, Repeating line patterns

If an approved icon file itself contains a pattern, use the exact supplied file as-is. Do not create additional patterns around it.

15. DECORATIVE ASSET DECISION PROCESS

Before finalizing the graphic, follow this priority:

Step 1: Create the composition using Headline, Photo, Logo

Step 2: Determine whether the composition already looks complete. If YES: Add nothing.

Step 3: If additional visual balance is needed, add ONE approved decorative asset.

Step 4: Only add a second or third decorative asset if it materially improves the composition.

Step 5: Never exceed 3 total decorative assets.

SAFETY RULE: If you are uncertain whether an element counts as a decorative asset: Do not add it. When choosing between more decoration and more whitespace: Choose whitespace.

16. VISUAL VARIATION

Every new graphic should feel visually distinct from the previous graphic. Achieve variation by changing: Photo position, Headline alignment, Headline position, Crop, Logo position, Background color, Accent color, Size/position of the ONE optional background shape, Whether an approved icon is used

Do NOT create visual variation by adding more decorative elements.

IMPORTANT: Variation means rearranging existing permitted elements, not introducing new elements.

17. CLEAN COMPOSITION RULE

The design should feel intentionally minimal. Prioritize: Headline → Photo → Logo → Whitespace

Decorative assets are secondary. Do not allow decorations to compete with the headline. Do not overcrowd corners. Do not fill every empty area. Do not make the design look like a template packed with graphic elements.

18. FINAL COMPLIANCE CHECK

Before rendering the final graphic, silently verify every requirement below.

CONTENT: Only the supplied headline is used. No extra text exists. User photo is used. Exactly one approved logo is used.

COLORS: Only the six approved brand colors are used for graphic elements. No unapproved decorative colors exist.

TYPOGRAPHY: Headline uses {HEADING_FONT} Bold. No other headline font is used. No invented text exists.

DECORATIVE ASSETS: 0–3 decorative assets total. No more than 1 background shape. No more than 1 approved icon. No more than 1 decorative motif. No extra dots. No extra circles. No particles. No sparkles. No generated patterns. No textures. No decorative geometry. No additional shapes surrounding icons. No duplicate decorative assets.

ICONS: If an icon is used, it is one of the exact supplied approved icon files. No icon has been redrawn or reinterpreted. No additional icons exist.

LOGO: Exactly one approved logo is present. Logo is fully visible. Logo is not distorted. Logo is not cropped.

COMPOSITION: 1:1 square format. Headline is the primary focal point. Photo is naturally integrated. Composition has sufficient whitespace. Design is clean and uncluttered.

FINAL RULE: If ANY decorative element causes the composition to exceed the 3-asset maximum: REMOVE IT. Do not substitute it with another decoration. Do not hide it. Do not merge it with another element. Do not reinterpret the counting rule. The final graphic must contain NO MORE THAN 3 DECORATIVE ASSETS. When in doubt, use fewer.

19. OUTPUT BEHAVIOR

When the user sends a headline: Treat it as a new graphic request. Use the supplied headline exactly. Use the supplied photo. Use exactly one approved logo. Create a clean 1:1 social graphic. Use 0–3 decorative assets maximum. Do not ask unnecessary questions. Generate the graphic directly.

Do NOT generate anything from this configuration message itself. Wait for the separate headline message.`;

const PLACEHOLDER_KEYS = [
  'OWNER_NAME', 'OWNER_TITLE',
  'MAIN_COLOR_NAME', 'MAIN_COLOR_HEX',
  'TEXT_COLOR_NAME', 'TEXT_COLOR_HEX',
  'BG_COLOR_NAME', 'BG_COLOR_HEX',
  'SECONDARY_BG_COLOR_NAME', 'SECONDARY_BG_COLOR_HEX',
  'ACCENT_COLOR_NAME', 'ACCENT_COLOR_HEX',
  'SOFT_ACCENT_COLOR_NAME', 'SOFT_ACCENT_COLOR_HEX',
  'HEADING_FONT', 'BODY_FONT', 'SUBHEADING_FONT', 'ACCENT_FONT',
];

const COLOR_PAIRS = [
  { prefix: 'MAIN_COLOR',         hex: 'main_brand_color',   name: 'main_brand_color_name' },
  { prefix: 'TEXT_COLOR',         hex: 'text_main_color',    name: 'text_main_color_name' },
  { prefix: 'BG_COLOR',           hex: 'background_color',   name: 'background_color_name' },
  { prefix: 'SECONDARY_BG_COLOR', hex: 'secondary_bg_color', name: 'secondary_bg_color_name' },
  { prefix: 'ACCENT_COLOR',       hex: 'accent_color',       name: 'accent_color_name' },
  { prefix: 'SOFT_ACCENT_COLOR',  hex: 'soft_accent_color',  name: 'soft_accent_color_name' },
];

const FONT_PAIRS = [
  { ph: 'HEADING_FONT',    col: 'heading_font' },
  { ph: 'BODY_FONT',       col: 'body_font' },
  { ph: 'SUBHEADING_FONT', col: 'subheading_font' },
  { ph: 'ACCENT_FONT',     col: 'accent_font' },
];

function upperHex(v) {
  return typeof v === 'string' && v.startsWith('#') ? v.toUpperCase() : v;
}

function buildPrompt(template, businessName, branding, brandingConfigured) {
  let out = template || '';

  out = out.split('{OWNER_NAME}').join(businessName || '');

  if (!brandingConfigured || !branding) return out;

  out = out.split('{OWNER_TITLE}').join((branding.owner_title || '').trim());

  for (const { prefix, hex, name } of COLOR_PAIRS) {
    out = out.split(`{${prefix}_NAME}`).join((branding[name] || '').trim());
    out = out.split(`{${prefix}_HEX}`).join(upperHex(branding[hex] || ''));
  }
  for (const { ph, col } of FONT_PAIRS) {
    out = out.split(`{${ph}}`).join(branding[col] || '');
  }
  return out;
}

export default function VisualsPage() {
  const { currentId: businessId, current: business } = useBusiness();
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [branding, setBranding] = useState(null);
  const [brandingConfigured, setBrandingConfigured] = useState(false);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    const [tplRes, brRes, linkRes] = await Promise.all([
      supabase.from('visual_prompt_template').select('template_text').eq('business_id', businessId).maybeSingle(),
      supabase.from('branding_profile').select('*').eq('business_id', businessId).maybeSingle(),
      supabase.from('business_links').select('id, title, url').eq('business_id', businessId).order('position'),
    ]);
    setTemplate(tplRes.data?.template_text || DEFAULT_TEMPLATE);
    setBranding({ ...DEFAULT_BRANDING, ...(brRes.data || {}) });
    setBrandingConfigured(!!brRes.data);
    setLinks(linkRes.data || []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  async function saveTemplate(e) {
    e.preventDefault();
    if (!businessId) return;
    setSavingTemplate(true);
    setTemplateSaved(false);
    setError(null);
    const { error } = await supabase
      .from('visual_prompt_template')
      .upsert({ business_id: businessId, template_text: template }, { onConflict: 'business_id' });
    setSavingTemplate(false);
    if (error) setError(error.message);
    else { setTemplateSaved(true); setTimeout(() => setTemplateSaved(false), 1800); }
  }

  const rendered = buildPrompt(template, business?.name, branding, brandingConfigured);

  return (
    <div className="container">
      <h1>Visuals</h1>
      <div className="subtitle">
        {business ? <>Master graphic prompt for <strong>{business.name}</strong>. Each business has its own. </> : null}
        One auto-filled prompt for a branded social media graphic. <code>{'{OWNER_NAME}'}</code> is taken from the business's name; everything else is baked in from your Branding profile.
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? <div className="muted">Loading…</div> : (
        <>
          {!brandingConfigured && (
            <div className="card" style={{ background: '#fff8e6', borderColor: '#f0e0a5' }}>
              Set up your Branding first for accurate visual prompts. <a href="/branding">Open Branding →</a>
            </div>
          )}

          <div className="card">
            <div className="label">Master Prompt</div>
            <div className="prompt-block" style={{ whiteSpace: 'pre-wrap' }}>{rendered}</div>
            <div className="row" style={{ marginTop: 10 }}>
              <button
                className="btn primary"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(rendered); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
                }}
              >
                {copied ? 'Copied ✓' : 'Copy Prompt'}
              </button>
              {links.map((l) => (
                <a
                  key={l.id}
                  className="btn"
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open {l.title} ↗
                </a>
              ))}
              <button className="btn small" onClick={() => setEditTemplateOpen((v) => !v)}>
                {editTemplateOpen ? 'Hide template editor' : 'Edit template'}
              </button>
            </div>

            {editTemplateOpen && (
              <form onSubmit={saveTemplate} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee' }}>
                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                  Only edit this if you want to change the underlying structure. Available placeholders: {PLACEHOLDER_KEYS.map((k) => <code key={k} style={{ marginRight: 6 }}>{`{${k}}`}</code>)}
                </div>
                <textarea
                  rows={24}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  style={{ width: '100%', fontFamily: 'inherit', fontSize: 14, padding: 8 }}
                />
                <div className="row" style={{ marginTop: 10 }}>
                  <button type="submit" className="btn primary" disabled={savingTemplate}>
                    {savingTemplate ? 'Saving…' : templateSaved ? 'Saved ✓' : 'Save template'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
