'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function SettingsPage() {
  const [form, setForm] = useState({ who_they_are: '', their_goal: '', their_struggles: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('audience_profile')
      .select('who_they_are, their_goal, their_struggles')
      .eq('id', 1)
      .maybeSingle();
    if (error) setError(error.message);
    else if (data) setForm({
      who_they_are: data.who_they_are || '',
      their_goal: data.their_goal || '',
      their_struggles: data.their_struggles || '',
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function setField(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    const { error } = await supabase
      .from('audience_profile')
      .upsert({
        id: 1,
        who_they_are: form.who_they_are.trim(),
        their_goal: form.their_goal.trim(),
        their_struggles: form.their_struggles.trim(),
      }, { onConflict: 'id' });
    setSaving(false);
    if (error) setError(error.message);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="container">
      <h1>Audience Profile</h1>
      <div className="subtitle">
        One-time setup. This is used by the AI <strong>Generate New Week</strong> button on the Topics page to invent
        weekly themes and daily symptoms that sound like your actual reader — not generic advice.
      </div>

      {error && <div className="error">{error}</div>}
      {loading ? <div className="muted">Loading…</div> : (
        <form onSubmit={save} className="card">
          <label className="field">
            Who they are
            <textarea
              rows={4}
              value={form.who_they_are}
              onChange={(e) => setField('who_they_are', e.target.value)}
              placeholder="Role, industry, team size, tools they use, revenue stage…"
              style={{ width: '100%', marginTop: 6, fontFamily: 'inherit', fontSize: 14, padding: 8 }}
            />
          </label>
          <label className="field">
            Their goal
            <textarea
              rows={4}
              value={form.their_goal}
              onChange={(e) => setField('their_goal', e.target.value)}
              placeholder="What they want the business (and life) to look like…"
              style={{ width: '100%', marginTop: 6, fontFamily: 'inherit', fontSize: 14, padding: 8 }}
            />
          </label>
          <label className="field">
            Their struggles
            <textarea
              rows={4}
              value={form.their_struggles}
              onChange={(e) => setField('their_struggles', e.target.value)}
              placeholder="What they feel embarrassed, resentful, or behind about…"
              style={{ width: '100%', marginTop: 6, fontFamily: 'inherit', fontSize: 14, padding: 8 }}
            />
          </label>
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
