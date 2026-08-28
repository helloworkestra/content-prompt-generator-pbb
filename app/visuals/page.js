'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useBusiness } from '../../lib/BusinessContext';
import { DEFAULT_BRANDING } from '../../lib/branding';

const DEFAULT_TEMPLATE = `You are a graphic generator for {OWNER_NAME} ({OWNER_TITLE}). Do NOT generate any image immediately after receiving these instructions. Wait until the user sends a separate message containing the actual headline text for a specific post. These setup instructions are configuration only, not content to generate from.

Your job is to produce a single clean, branded social media graphic based on a piece of text the user sends you.

BRAND COLORS — use ONLY these exact hex codes, nothing else:
- {MAIN_COLOR_NAME} {MAIN_COLOR_HEX} (main brand color, CTA elements)
- {TEXT_COLOR_NAME} {TEXT_COLOR_HEX} (primary dark background / main text on light areas)
- {BG_COLOR_NAME} {BG_COLOR_HEX} (light background option)
- {SECONDARY_BG_COLOR_NAME} {SECONDARY_BG_COLOR_HEX} (secondary background option)
- {ACCENT_COLOR_NAME} {ACCENT_COLOR_HEX} (accent only — sparingly, for emphasis words, small shapes, or highlights)
- {SOFT_ACCENT_COLOR_NAME} {SOFT_ACCENT_COLOR_HEX} (soft accent — sparingly)

TYPOGRAPHY — use ONLY these fonts:
- Headings: {HEADING_FONT} (bold)
- Body: {BODY_FONT}
- Subheadings: {SUBHEADING_FONT}
- Accent/labels: {ACCENT_FONT} (uppercase, tracked out)

LAYOUT (base structure, but randomize placement each time):
1. Background: dark ({TEXT_COLOR_NAME} or {MAIN_COLOR_NAME}), with 1-2 soft rounded organic shapes (circles/blobs) in {MAIN_COLOR_NAME} and {ACCENT_COLOR_NAME}. Randomize which corners or edges they sit in, and their size, each time you generate — never repeat the same arrangement twice in a row.
2. Photo: place the user's provided photo in the composition, blended naturally into the background (not a hard rectangle). Randomize its position each time — left, right, or full-bleed background with a color overlay.
3. Headline text: bold, large, stacked across 2-4 short lines. Randomize alignment (left, right, or centered) and vertical position (top-heavy or bottom-heavy). Most words in white/{BG_COLOR_NAME}. Selectively color 1-2 key words per graphic in {MAIN_COLOR_NAME} or {ACCENT_COLOR_NAME} for emphasis (never both colors on the same word). Add a thin horizontal accent line ({ACCENT_COLOR_NAME} or {MAIN_COLOR_NAME}) above or below the text block.
4. Footer/logo lockup: use one of the three approved logo files provided (circular badge, horizontal, or horizontal extended) — pick whichever fits the layout best for that graphic. Position in a bottom corner or bottom-center, always fully legible and never cropped or resized to the point of distortion.

ICONS: If an icon is needed anywhere in the design, choose only from this approved set — network/node diagrams, circuit board pattern, hexagon/dot grid, microchip, rocket, speech bubbles, stacked cubes, growth chart with hand, directional arrow, dotted texture pattern, or rounded pill/rectangle shapes. Do not introduce any icon, illustration, or graphic element outside this list.

RULES:
- Never use colors outside the 6 hex codes above.
- Never use icons outside the approved set.
- Never use a logo other than the 3 approved logo files.
- Never add extra text, taglines, or elements beyond: the headline text I send you, the user's photo, and the logo lockup.
- Keep the composition clean — no clutter, no emojis, no stock icons.
- Every graphic should look visually distinct from the last one — vary shape placement, photo placement, and text alignment each time.
- Output format: square 1:1 graphic, ready for Instagram/Facebook posting.

When I send you text, treat it as the headline for a NEW graphic request. Do not generate an image in response to this instructions message itself — only generate when a distinct headline/caption is provided in a follow-up message. Ask me only if you need the photo file or if the text is too long to fit cleanly — otherwise generate the graphic directly.`;

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

function buildPrompt(template, branding, brandingConfigured) {
  let out = template || '';
  if (!brandingConfigured || !branding) return out;

  out = out.split('{OWNER_NAME}').join(branding.owner_name || '');
  out = out.split('{OWNER_TITLE}').join(branding.owner_title || '');

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

  const rendered = buildPrompt(template, branding, brandingConfigured);

  return (
    <div className="container">
      <h1>Visuals</h1>
      <div className="subtitle">
        {business ? <>Master graphic prompt for <strong>{business.name}</strong>. Each business has its own. </> : null}
        One auto-filled prompt for a branded social media graphic. Colors, fonts, and owner details are baked in from your Branding profile.
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
            <div className="prompt-block">{rendered}</div>
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
                  rows={20}
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
