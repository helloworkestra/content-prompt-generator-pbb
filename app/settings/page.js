'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useBusiness } from '../../lib/BusinessContext';

const QUESTIONS = [
  {
    label: 'Who is your ideal client? (industry, role, team size — be specific)',
    placeholder: 'e.g. small tax prep firm owners, 2-5 staff, already paying for a CRM they never finished setting up',
  },
  {
    label: 'What do they want more of in their business right now?',
    placeholder: 'e.g. more qualified appointments without personally chasing every lead',
  },
  {
    label: "What's frustrating them about how things currently run day to day?",
    placeholder: 'e.g. leads slipping through the cracks, doing follow-ups by hand every night',
  },
  {
    label: "What have they already tried or paid for that didn't fully fix the problem?",
    placeholder: 'e.g. bought GoHighLevel but only use 20% of it, hired a VA who left after 3 months',
  },
];

const EMPTY_PROFILE = { who_they_are: '', their_goal: '', their_struggles: '' };

export default function SettingsPage() {
  const { currentId: businessId, current: business } = useBusiness();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [mode, setMode] = useState(null); // 'guided' | 'manual'
  const [answers, setAnswers] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    const { data, error } = await supabase
      .from('audience_profile')
      .select('who_they_are, their_goal, their_struggles')
      .eq('business_id', businessId)
      .maybeSingle();
    if (error) {
      setError(error.message);
      setMode('guided');
    } else {
      const p = {
        who_they_are: data?.who_they_are || '',
        their_goal: data?.their_goal || '',
        their_struggles: data?.their_struggles || '',
      };
      setProfile(p);
      const hasAny = p.who_they_are || p.their_goal || p.their_struggles;
      setMode(hasAny ? 'manual' : 'guided');
    }
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  function setField(k, v) { setProfile((p) => ({ ...p, [k]: v })); }
  function setAnswerAt(i, v) { setAnswers((prev) => prev.map((a, idx) => (idx === i ? v : a))); }

  async function save(e) {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    const { error } = await supabase
      .from('audience_profile')
      .upsert({
        business_id: businessId,
        who_they_are: profile.who_they_are.trim(),
        their_goal: profile.their_goal.trim(),
        their_struggles: profile.their_struggles.trim(),
      }, { onConflict: 'business_id' });
    setSaving(false);
    if (error) setError(error.message);
    else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function submitQuiz(e) {
    e.preventDefault();
    setError(null);
    if (answers.some((a) => !a.trim())) {
      setError('Please answer all 4 questions.');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `Request failed (${res.status}).`);
      setProfile({
        who_they_are: body.who_they_are || '',
        their_goal: body.their_goal || '',
        their_struggles: body.their_struggles || '',
      });
      setMode('manual');
    } catch (e) {
      setError(`Couldn't generate your profile — you can fill in the fields manually instead. (${e.message})`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="container">
      <h1>Audience Profile</h1>
      <div className="subtitle">
        {business ? <>Profile for <strong>{business.name}</strong>. Each business has its own. </> : null}
        Used by the AI <strong>Generate New Week</strong> button on the Topics page to invent
        weekly themes and daily symptoms that sound like your actual reader.
      </div>

      {loading ? <div className="muted">Loading…</div> : (
        <>
          <div className="card" style={{ marginTop: 0, padding: 12 }}>
            <div className="row" style={{ marginTop: 0, gap: 8 }}>
              <button
                type="button"
                className={'btn ' + (mode === 'guided' ? 'primary' : '')}
                onClick={() => setMode('guided')}
              >
                Guided Setup (answer a few questions)
              </button>
              <button
                type="button"
                className={'btn ' + (mode === 'manual' ? 'primary' : '')}
                onClick={() => setMode('manual')}
              >
                Write it myself
              </button>
              {mode === 'manual' && (
                <button
                  type="button"
                  className="btn small"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => { setAnswers(['', '', '', '']); setMode('guided'); }}
                >
                  Redo guided setup
                </button>
              )}
            </div>
          </div>

          {error && <div className="error">{error}</div>}

          {mode === 'guided' && (
            <form onSubmit={submitQuiz} className="card">
              <div className="muted" style={{ marginBottom: 12 }}>
                Answer these 4 questions. The AI will turn them into your Audience Profile — you'll get to review and edit before saving.
              </div>
              {QUESTIONS.map((q, i) => (
                <label key={i} className="field">
                  <span style={{ fontWeight: 600 }}>{i + 1}. {q.label}</span>
                  <textarea
                    rows={3}
                    value={answers[i]}
                    onChange={(e) => setAnswerAt(i, e.target.value)}
                    placeholder={q.placeholder}
                    style={{ width: '100%', marginTop: 6, fontFamily: 'inherit', fontSize: 14, padding: 8 }}
                  />
                </label>
              ))}
              <div className="row" style={{ marginTop: 16 }}>
                <button type="submit" className="btn primary" disabled={generating}>
                  {generating ? 'Generating…' : 'Generate my profile'}
                </button>
                <button type="button" className="btn" onClick={() => setMode('manual')}>
                  Skip — write it myself
                </button>
              </div>
            </form>
          )}

          {mode === 'manual' && (
            <form onSubmit={save} className="card">
              <label className="field">
                Who they are
                <textarea
                  rows={4}
                  value={profile.who_they_are}
                  onChange={(e) => setField('who_they_are', e.target.value)}
                  placeholder="Role, industry, team size, tools they use, revenue stage…"
                  style={{ width: '100%', marginTop: 6, fontFamily: 'inherit', fontSize: 14, padding: 8 }}
                />
              </label>
              <label className="field">
                Their goal
                <textarea
                  rows={4}
                  value={profile.their_goal}
                  onChange={(e) => setField('their_goal', e.target.value)}
                  placeholder="What they want the business (and life) to look like…"
                  style={{ width: '100%', marginTop: 6, fontFamily: 'inherit', fontSize: 14, padding: 8 }}
                />
              </label>
              <label className="field">
                Their struggles
                <textarea
                  rows={4}
                  value={profile.their_struggles}
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
        </>
      )}
    </div>
  );
}
