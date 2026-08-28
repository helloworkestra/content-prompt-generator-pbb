'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useBusiness } from '../../lib/BusinessContext';
import { DEFAULT_BRANDING, GOOGLE_FONT_SUGGESTIONS, fontStack, pickContrastText, useGoogleFonts } from '../../lib/branding';

const COLOR_FIELDS = [
  { key: 'main_brand_color',   label: 'Main Brand' },
  { key: 'text_main_color',    label: 'Text — Main' },
  { key: 'cta_button_color',   label: 'CTA Buttons' },
  { key: 'background_color',   label: 'Background' },
  { key: 'secondary_bg_color', label: 'Secondary BG' },
  { key: 'accent_color',       label: 'Accent' },
  { key: 'soft_accent_color',  label: 'Soft Accent' },
];

const FONT_FIELDS = [
  { key: 'heading_font',    label: 'Heading font' },
  { key: 'body_font',       label: 'Body font' },
  { key: 'subheading_font', label: 'Subheading font' },
  { key: 'accent_font',     label: 'Accent font' },
];

function isValidHex(v) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v || '').trim());
}

export default function BrandingPage() {
  const { currentId: businessId, current: business } = useBusiness();
  const [form, setForm] = useState(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useGoogleFonts([form.heading_font, form.body_font, form.subheading_font, form.accent_font]);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    const { data, error } = await supabase
      .from('branding_profile')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();
    if (error) setError(error.message);
    else setForm({ ...DEFAULT_BRANDING, ...(data || {}) });
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  function setField(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    if (!businessId) return;
    for (const { key, label } of COLOR_FIELDS) {
      if (!isValidHex(form[key])) { setError(`${label} needs a valid hex color (e.g. #ff8800).`); return; }
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    const payload = { business_id: businessId };
    for (const { key } of COLOR_FIELDS) payload[key] = form[key].trim().toLowerCase();
    for (const { key } of FONT_FIELDS) payload[key] = (form[key] || '').trim() || DEFAULT_BRANDING[key];
    const { error } = await supabase
      .from('branding_profile')
      .upsert(payload, { onConflict: 'business_id' });
    setSaving(false);
    if (error) setError(error.message);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="container">
      <h1>Branding</h1>
      <div className="subtitle">
        {business ? <>Branding for <strong>{business.name}</strong>. Each business has its own. </> : null}
        Colors and fonts saved here lightly style the Home page (heading + Copy button) so your brand shows up day to day. The live preview below reflects unsaved changes in real time.
      </div>

      {loading ? <div className="muted">Loading…</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
          <form onSubmit={save} className="card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {COLOR_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={isValidHex(form[key]) ? form[key] : '#000000'}
                      onChange={(e) => setField(key, e.target.value)}
                      style={{ width: 44, height: 32, padding: 0, border: '1px solid #ccc', borderRadius: 6, background: 'none' }}
                    />
                    <input
                      type="text"
                      value={form[key]}
                      onChange={(e) => setField(key, e.target.value)}
                      spellCheck={false}
                      style={{ flex: 1, fontFamily: 'monospace', textTransform: 'lowercase' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {FONT_FIELDS.map(({ key, label }) => (
                <label key={key} className="field" style={{ marginBottom: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                  <input
                    type="text"
                    list={`fonts-${key}`}
                    value={form[key]}
                    onChange={(e) => setField(key, e.target.value)}
                    placeholder="Type or pick a Google Font"
                    style={{ marginTop: 6 }}
                  />
                  <datalist id={`fonts-${key}`}>
                    {GOOGLE_FONT_SUGGESTIONS.map((n) => <option key={n} value={n} />)}
                  </datalist>
                </label>
              ))}
            </div>

            {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}

            <div className="row" style={{ marginTop: 16 }}>
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
              </button>
            </div>
          </form>

          <BrandPreview form={form} />
        </div>
      )}
    </div>
  );
}

function BrandPreview({ form }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: 12, background: '#111', color: '#fff', fontSize: 13, fontWeight: 600 }}>
        Live preview
      </div>
      <div style={{
        background: form.background_color,
        color: form.text_main_color,
        padding: 24,
      }}>
        <h2 style={{
          fontFamily: fontStack(form.heading_font),
          color: form.main_brand_color,
          margin: 0,
          fontSize: 28,
          lineHeight: 1.2,
        }}>
          The heading of a landing page
        </h2>
        <div style={{
          fontFamily: fontStack(form.subheading_font),
          color: form.text_main_color,
          opacity: 0.75,
          marginTop: 8,
          fontSize: 16,
        }}>
          A subheading that supports the main promise above.
        </div>
        <p style={{
          fontFamily: fontStack(form.body_font),
          color: form.text_main_color,
          marginTop: 16,
          lineHeight: 1.55,
          fontSize: 15,
        }}>
          Body copy sits here — the paragraph a reader actually reads. Long enough to feel real, short enough to preview. The point is to see how the body font pairs with the heading and whether the text color is readable on the background.
        </p>
        <button type="button" style={{
          marginTop: 12,
          background: form.cta_button_color,
          color: pickContrastText(form.cta_button_color),
          border: 'none',
          padding: '12px 18px',
          borderRadius: 8,
          fontFamily: fontStack(form.accent_font),
          fontWeight: 600,
          fontSize: 15,
          cursor: 'pointer',
        }}>
          Book a call
        </button>

        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <Swatch color={form.accent_color} label="Accent" />
          <Swatch color={form.soft_accent_color} label="Soft Accent" />
        </div>

        <div style={{
          marginTop: 20,
          padding: 16,
          background: form.secondary_bg_color,
          borderRadius: 8,
        }}>
          <div style={{
            fontFamily: fontStack(form.subheading_font),
            fontWeight: 600,
            marginBottom: 6,
            color: form.text_main_color,
          }}>
            A secondary content block
          </div>
          <div style={{
            fontFamily: fontStack(form.body_font),
            color: form.text_main_color,
            opacity: 0.85,
            fontSize: 14,
          }}>
            Shows how the secondary background reads against the main background above.
          </div>
        </div>
      </div>
    </div>
  );
}

function Swatch({ color, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div style={{
        width: 64, height: 40, background: color, borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)',
      }} />
      <div style={{ fontSize: 11, fontFamily: 'monospace', marginTop: 4 }}>{color}</div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>{label}</div>
    </div>
  );
}

