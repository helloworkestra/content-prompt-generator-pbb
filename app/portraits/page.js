'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useBusiness } from '../../lib/BusinessContext';
import { DEFAULT_BRANDING } from '../../lib/branding';

const DEFAULT_TEMPLATE = 'Using the uploaded photo as the exact likeness reference, generate a professional portrait of this same person, keeping facial features, skin tone, and identity fully consistent and unaltered. {VARIATION}. Studio-quality lighting, soft and natural, no harsh shadows. Background: solid clean color in {TEXT_COLOR} or {BG_COLOR} (pick one, no gradients, no textures, no patterns). Wardrobe color: solid-color shirt in {MAIN_COLOR} or {TEXT_COLOR} as the base, optionally with a small {ACCENT_COLOR} accent (like a subtle collar detail or accessory) — do not introduce any colors outside this exact palette: {MAIN_HEX}, {TEXT_HEX}, {BG_HEX}, {SECONDARY_BG_HEX}, {ACCENT_HEX}, {SOFT_ACCENT_HEX}. Realistic photography style, sharp focus, high resolution, no illustration or cartoon effect, no text or logos in the image.';

// Placeholders shown in the "available placeholders" hint on the editor.
const PLACEHOLDER_KEYS = [
  'VARIATION',
  'MAIN_COLOR', 'TEXT_COLOR', 'BG_COLOR', 'SECONDARY_BG_COLOR', 'ACCENT_COLOR', 'SOFT_ACCENT_COLOR',
  'MAIN_HEX',   'TEXT_HEX',   'BG_HEX',   'SECONDARY_BG_HEX',   'ACCENT_HEX',   'SOFT_ACCENT_HEX',
];

// Named placeholder → {hex column, name column}. Substitutes as "Name `#HEX`".
const NAMED_COLOR_MAP = {
  MAIN_COLOR:         { hex: 'main_brand_color',   name: 'main_brand_color_name' },
  TEXT_COLOR:         { hex: 'text_main_color',    name: 'text_main_color_name' },
  BG_COLOR:           { hex: 'background_color',   name: 'background_color_name' },
  SECONDARY_BG_COLOR: { hex: 'secondary_bg_color', name: 'secondary_bg_color_name' },
  ACCENT_COLOR:       { hex: 'accent_color',       name: 'accent_color_name' },
  SOFT_ACCENT_COLOR:  { hex: 'soft_accent_color',  name: 'soft_accent_color_name' },
};

// Hex-only placeholder → hex column. Substitutes as "`#HEX`".
const HEX_ONLY_MAP = {
  MAIN_HEX:         'main_brand_color',
  TEXT_HEX:         'text_main_color',
  BG_HEX:           'background_color',
  SECONDARY_BG_HEX: 'secondary_bg_color',
  ACCENT_HEX:       'accent_color',
  SOFT_ACCENT_HEX:  'soft_accent_color',
};

function upperHex(v) {
  return typeof v === 'string' && v.startsWith('#') ? v.toUpperCase() : v;
}

function buildPrompt(template, variationText, branding, brandingConfigured) {
  // Wrap variation in square brackets, matching the original tone.
  let out = (template || '').replace(/\{VARIATION\}/g, variationText ? `[${variationText}]` : '{VARIATION}');

  for (const [ph, cols] of Object.entries(NAMED_COLOR_MAP)) {
    if (!brandingConfigured) continue;
    const hex = upperHex(branding?.[cols.hex] || '');
    const name = (branding?.[cols.name] || '').trim();
    if (!hex) continue;
    const value = name ? `${name} ${hex}` : hex;
    out = out.split(`{${ph}}`).join(value);
  }

  for (const [ph, col] of Object.entries(HEX_ONLY_MAP)) {
    if (!brandingConfigured) continue;
    const hex = upperHex(branding?.[col] || '');
    if (!hex) continue;
    out = out.split(`{${ph}}`).join(hex);
  }

  return out;
}

export default function PortraitsPage() {
  const { currentId: businessId, current: business } = useBusiness();
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [branding, setBranding] = useState(null);
  const [brandingConfigured, setBrandingConfigured] = useState(false);
  const [variations, setVariations] = useState([]);
  const [newVariation, setNewVariation] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [masterCopied, setMasterCopied] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    const [tplRes, varRes, brRes] = await Promise.all([
      supabase.from('portrait_base_template').select('template_text').eq('business_id', businessId).maybeSingle(),
      supabase.from('portrait_variations').select('*').eq('business_id', businessId).order('position'),
      supabase.from('branding_profile').select('*').eq('business_id', businessId).maybeSingle(),
    ]);
    setTemplate(tplRes.data?.template_text || DEFAULT_TEMPLATE);
    setVariations(varRes.data || []);
    setBranding({ ...DEFAULT_BRANDING, ...(brRes.data || {}) });
    setBrandingConfigured(!!brRes.data);
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
      .from('portrait_base_template')
      .upsert({ business_id: businessId, template_text: template }, { onConflict: 'business_id' });
    setSavingTemplate(false);
    if (error) setError(error.message);
    else { setTemplateSaved(true); setTimeout(() => setTemplateSaved(false), 1800); }
  }

  async function addVariation(e) {
    e.preventDefault();
    if (!businessId || !newVariation.trim()) return;
    const nextPos = variations.length ? Math.max(...variations.map((v) => v.position)) + 1 : 1;
    const { data, error } = await supabase
      .from('portrait_variations')
      .insert({ business_id: businessId, position: nextPos, variation_text: newVariation.trim() })
      .select()
      .single();
    if (error) { setError(error.message); return; }
    setVariations((prev) => [...prev, data]);
    setNewVariation('');
  }

  async function updateVariation(id, text) {
    const { error } = await supabase
      .from('portrait_variations')
      .update({ variation_text: text })
      .eq('id', id)
      .eq('business_id', businessId);
    if (error) { setError(error.message); return; }
    setVariations((prev) => prev.map((v) => (v.id === id ? { ...v, variation_text: text } : v)));
  }

  async function deleteVariation(id) {
    if (!confirm('Delete this variation? This cannot be undone.')) return;
    const { error } = await supabase
      .from('portrait_variations')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);
    if (error) { setError(error.message); return; }
    setVariations((prev) => prev.filter((v) => v.id !== id));
  }

  async function move(id, direction) {
    const idx = variations.findIndex((v) => v.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= variations.length) return;
    const a = variations[idx];
    const b = variations[swapIdx];
    // Optimistic swap positions in memory.
    const next = [...variations];
    next[idx] = { ...b, position: a.position };
    next[swapIdx] = { ...a, position: b.position };
    next.sort((x, y) => x.position - y.position);
    setVariations(next);
    const [r1, r2] = await Promise.all([
      supabase.from('portrait_variations').update({ position: b.position }).eq('id', a.id).eq('business_id', businessId),
      supabase.from('portrait_variations').update({ position: a.position }).eq('id', b.id).eq('business_id', businessId),
    ]);
    if (r1.error || r2.error) {
      setError((r1.error || r2.error).message);
      load();
    }
  }

  return (
    <div className="container">
      <h1>Portraits</h1>
      <div className="subtitle">
        {business ? <>Prompt library for <strong>{business.name}</strong>. Each business has its own. </> : null}
        Base template + editable variations. Every prompt copies with your saved Branding colors baked in.
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? <div className="muted">Loading…</div> : (
        <>
          {!brandingConfigured && (
            <div className="card" style={{ background: '#fff8e6', borderColor: '#f0e0a5' }}>
              Set up your Branding colors first for accurate portrait prompts. <a href="/branding">Open Branding →</a>
            </div>
          )}

          {variations.length > 0 ? (
            <div className="card">
              <div className="label">Master Prompt — Variation #{variations[0].position}</div>
              <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 6 }}>
                {variations[0].variation_text}
              </div>
              <div className="prompt-block">
                {buildPrompt(template, variations[0].variation_text, branding, brandingConfigured)}
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <button
                  className="btn primary"
                  onClick={async () => {
                    const text = buildPrompt(template, variations[0].variation_text, branding, brandingConfigured);
                    try { await navigator.clipboard.writeText(text); setMasterCopied(true); setTimeout(() => setMasterCopied(false), 1500); } catch {}
                  }}
                >
                  {masterCopied ? 'Copied ✓' : 'Copy Prompt'}
                </button>
                <button
                  className="btn small"
                  onClick={() => setEditTemplateOpen((v) => !v)}
                >
                  {editTemplateOpen ? 'Hide template editor' : 'Edit template'}
                </button>
              </div>

              {editTemplateOpen && (
                <form onSubmit={saveTemplate} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee' }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                    Only edit this if you want to change the underlying structure. Available placeholders: {PLACEHOLDER_KEYS.map((k) => <code key={k} style={{ marginRight: 6 }}>{`{${k}}`}</code>)}
                  </div>
                  <textarea
                    rows={10}
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
          ) : (
            <div className="card">
              <div className="muted">Add a variation below to see the Master Prompt here.</div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn small" onClick={() => setEditTemplateOpen((v) => !v)}>
                  {editTemplateOpen ? 'Hide template editor' : 'Edit template'}
                </button>
              </div>
              {editTemplateOpen && (
                <form onSubmit={saveTemplate} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee' }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                    Available placeholders: {PLACEHOLDER_KEYS.map((k) => <code key={k} style={{ marginRight: 6 }}>{`{${k}}`}</code>)}
                  </div>
                  <textarea
                    rows={10}
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
          )}

          <h2>Variations</h2>

          <form onSubmit={addVariation} className="card">
            <label className="field">
              Add a new variation
              <textarea
                rows={2}
                value={newVariation}
                onChange={(e) => setNewVariation(e.target.value)}
                placeholder="e.g. Standing with hands in pockets, relaxed shoulders, three-quarter angle"
                style={{ width: '100%', marginTop: 6, fontFamily: 'inherit', fontSize: 14, padding: 8 }}
              />
            </label>
            <div className="row" style={{ marginTop: 8 }}>
              <button type="submit" className="btn primary" disabled={!newVariation.trim()}>+ Add Variation</button>
            </div>
          </form>

          {variations.length <= 1 && (
            <div className="muted">
              {variations.length === 0 ? 'No variations yet — add one above.' : 'Only one variation — add more above to build the list.'}
            </div>
          )}

          {variations.slice(1).map((v, idx) => {
            const rowIdx = idx + 1; // real index in the full array
            return (
              <VariationRow
                key={v.id}
                row={v}
                canUp={rowIdx > 1}
                canDown={rowIdx < variations.length - 1}
                onUpdate={(text) => updateVariation(v.id, text)}
                onDelete={() => deleteVariation(v.id)}
                onMove={(dir) => move(v.id, dir)}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

function VariationRow({ row, canUp, canDown, onUpdate, onDelete, onMove }) {
  const [text, setText] = useState(row.variation_text);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const shortLine = `Same as before, but swap the bracket part to: ${row.variation_text}`;

  async function copyShort() {
    try {
      await navigator.clipboard.writeText(shortLine);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  async function saveEdit() {
    await onUpdate(text.trim());
    setEditing(false);
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button className="btn small" disabled={!canUp} onClick={() => onMove('up')} title="Move up">↑</button>
          <div className="muted" style={{ textAlign: 'center', fontSize: 12 }}>#{row.position}</div>
          <button className="btn small" disabled={!canDown} onClick={() => onMove('down')} title="Move down">↓</button>
        </div>
        <div style={{ flex: 1 }}>
          {editing ? (
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ width: '100%', fontFamily: 'inherit', fontSize: 14, padding: 8 }}
            />
          ) : (
            <div style={{ fontSize: 14 }}>
              <span className="muted">Same as before, but swap the bracket part to:</span> {row.variation_text}
            </div>
          )}
          <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <button className="btn small primary" onClick={copyShort}>
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
            {editing ? (
              <>
                <button className="btn small" onClick={saveEdit}>Save edit</button>
                <button className="btn small" onClick={() => { setText(row.variation_text); setEditing(false); }}>Cancel</button>
              </>
            ) : (
              <button className="btn small" onClick={() => setEditing(true)}>Edit</button>
            )}
            <button className="btn small" style={{ color: '#b00020' }} onClick={onDelete}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}
