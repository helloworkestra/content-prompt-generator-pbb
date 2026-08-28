'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useBusiness } from '../../lib/BusinessContext';

function isValidUrl(v) {
  const s = (v || '').trim();
  if (!s) return true; // empty is allowed (means "not set")
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

export default function GptLinksPage() {
  const { currentId: businessId, current: business } = useBusiness();
  const [captions, setCaptions] = useState('');
  const [portrait, setPortrait] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    const { data, error } = await supabase
      .from('settings')
      .select('captions_gpt_url, portrait_gpt_url')
      .eq('business_id', businessId)
      .maybeSingle();
    if (error) setError(error.message);
    else {
      setCaptions(data?.captions_gpt_url || '');
      setPortrait(data?.portrait_gpt_url || '');
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  async function save(e) {
    e.preventDefault();
    if (!businessId) return;
    if (!isValidUrl(captions)) { setError('Captions GPT link must be a valid http(s) URL.'); return; }
    if (!isValidUrl(portrait)) { setError('Portrait GPT link must be a valid http(s) URL.'); return; }
    setSaving(true);
    setSaved(false);
    setError(null);
    const { error } = await supabase
      .from('settings')
      .upsert({
        business_id: businessId,
        captions_gpt_url: captions.trim() || null,
        portrait_gpt_url: portrait.trim() || null,
      }, { onConflict: 'business_id' });
    setSaving(false);
    if (error) setError(error.message);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="container">
      <h1>GPT Links</h1>
      <div className="subtitle">
        {business ? <>Links for <strong>{business.name}</strong>. Each business has its own. </> : null}
        Paste the ChatGPT URLs for your Captions and Portrait custom GPTs. Open buttons on the Home and Portraits pages will use these to jump straight to the right GPT in a new tab.
      </div>

      {loading ? <div className="muted">Loading…</div> : (
        <form onSubmit={save} className="card">
          <label className="field">
            Captions GPT Link
            <input
              type="url"
              value={captions}
              onChange={(e) => setCaptions(e.target.value)}
              placeholder="https://chat.openai.com/g/g-XXXXX-your-captions-gpt"
              style={{ width: '100%', marginTop: 6 }}
            />
          </label>
          <label className="field">
            Portrait GPT Link
            <input
              type="url"
              value={portrait}
              onChange={(e) => setPortrait(e.target.value)}
              placeholder="https://chat.openai.com/g/g-XXXXX-your-portrait-gpt"
              style={{ width: '100%', marginTop: 6 }}
            />
          </label>
          {error && <div className="error">{error}</div>}
          <div className="row" style={{ marginTop: 16 }}>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
