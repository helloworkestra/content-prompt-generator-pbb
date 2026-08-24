'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fillTemplate, sequenceForDay } from '../lib/templates';
import BulkGenerator from '../components/BulkGenerator';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [needsNewDay, setNeedsNewDay] = useState(false);
  const [newDay, setNewDay] = useState({ topic: '', symptom: '', hook_combo: '' });
  const [copied, setCopied] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [savingStart, setSavingStart] = useState(false);
  const [startSaved, setStartSaved] = useState(false);

  const loadHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from('generated_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (!error) setHistory(data || []);
  }, []);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from('settings').select('start_date').eq('id', 1).maybeSingle();
    if (data && data.start_date) setStartDate(data.start_date);
  }, []);

  useEffect(() => { loadHistory(); loadSettings(); }, [loadHistory, loadSettings]);

  async function saveStartDate(e) {
    e.preventDefault();
    setSavingStart(true);
    setStartSaved(false);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ id: 1, start_date: startDate || null }, { onConflict: 'id' });
      if (error) throw error;
      setStartSaved(true);
      setTimeout(() => setStartSaved(false), 1800);
    } catch (e) {
      setError(e.message || 'Failed to save start date.');
    } finally {
      setSavingStart(false);
    }
  }

  async function computeNextSlot() {
    const { data, error } = await supabase
      .from('generated_log')
      .select('day_number, post_index, created_at')
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return { day_number: 1, post_index: 1 };
    const last = data[0];
    if (last.post_index < 5) return { day_number: last.day_number, post_index: last.post_index + 1 };
    return { day_number: last.day_number + 1, post_index: 1 };
  }

  async function getDay(dayNumber) {
    const { data, error } = await supabase
      .from('days')
      .select('*')
      .eq('day_number', dayNumber)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function generateAndLog(dayRow, postIndex) {
    const seq = (dayRow.sequence && dayRow.sequence.length === 5)
      ? dayRow.sequence
      : sequenceForDay(dayRow.day_number);
    const contentType = seq[postIndex - 1];
    const prompt = fillTemplate(contentType, dayRow.symptom, dayRow.hook_combo);
    const { data, error } = await supabase
      .from('generated_log')
      .insert({
        day_number: dayRow.day_number,
        post_index: postIndex,
        content_type: contentType,
        prompt_text: prompt,
      })
      .select()
      .single();
    if (error) throw error;
    setCurrent({
      id: data.id,
      day_number: dayRow.day_number,
      post_index: postIndex,
      content_type: contentType,
      prompt_text: prompt,
      created_at: data.created_at,
    });
    setCopied(false);
    loadHistory();
  }

  async function handleNext() {
    setError(null);
    setNeedsNewDay(false);
    setLoading(true);
    try {
      const slot = await computeNextSlot();
      const dayRow = await getDay(slot.day_number);
      if (!dayRow) {
        setCurrent(null);
        setNeedsNewDay(true);
        return;
      }
      await generateAndLog(dayRow, slot.post_index);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDay(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data: maxRow, error: maxErr } = await supabase
        .from('days')
        .select('day_number, week_number')
        .order('day_number', { ascending: false })
        .limit(1)
        .single();
      if (maxErr) throw maxErr;
      const nextDay = maxRow.day_number + 1;
      const nextWeek = maxRow.week_number + 1;
      const seq = sequenceForDay(nextDay);
      const { data: inserted, error: insErr } = await supabase
        .from('days')
        .insert({
          day_number: nextDay,
          week_number: nextWeek,
          topic: newDay.topic,
          symptom: newDay.symptom,
          hook_combo: newDay.hook_combo,
          sequence: seq,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      setNewDay({ topic: '', symptom: '', hook_combo: '' });
      setNeedsNewDay(false);
      await generateAndLog(inserted, 1);
    } catch (e) {
      setError(e.message || 'Failed to add day.');
    } finally {
      setLoading(false);
    }
  }

  async function deletePrompt(id) {
    if (!confirm('Delete this prompt from history? This cannot be undone.')) return;
    setError(null);
    try {
      const { error } = await supabase.from('generated_log').delete().eq('id', id);
      if (error) throw error;
      if (current && current.id === id) setCurrent(null);
      await loadHistory();
    } catch (e) {
      setError(e.message || 'Failed to delete prompt.');
    }
  }

  async function resetAll() {
    if (!confirm('Reset ALL generated prompts? This deletes your entire prompt history and starts the "Get Next Prompt" flow back at Day 1, Post 1. This cannot be undone.')) return;
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.from('generated_log').delete().gte('id', 0);
      if (error) throw error;
      setCurrent(null);
      setNeedsNewDay(false);
      await loadHistory();
    } catch (e) {
      setError(e.message || 'Failed to reset.');
    } finally {
      setLoading(false);
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Copy failed. Long-press to select and copy manually.');
    }
  }

  return (
    <div className="container">
      <h1>GHL Content Tracker</h1>
      <div className="subtitle">One prompt at a time. Tap the button, copy, paste into your GPT.</div>

      <form onSubmit={saveStartDate} className="card" style={{ marginTop: 0 }}>
        <div className="label">Which date is Day 1?</div>
        <div className="row" style={{ marginTop: 0 }}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <button className="btn primary" type="submit" disabled={savingStart}>
            {savingStart ? 'Saving…' : startSaved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          Only used to line up Day 1–30 on the Calendar page. Doesn&apos;t change the "next prompt" order.
        </div>
      </form>

      <button className="big-btn" style={{ marginTop: 20 }} onClick={handleNext} disabled={loading}>
        {loading ? 'Working…' : 'Get Next Prompt'}
      </button>

      {error && <div className="error">{error}</div>}

      {current && (
        <div className="card">
          <div className="label">
            Day {current.day_number} — Post {current.post_index} of 5 — {current.content_type}
          </div>
          <div className="prompt-block">{current.prompt_text}</div>
          <div className="row">
            <button className="btn primary" onClick={() => copyText(current.prompt_text)}>
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <BulkGenerator onGenerated={loadHistory} />

      {needsNewDay && (
        <div className="card">
          <div className="label">You've used all your topics — add a new one to keep going</div>
          <form onSubmit={handleAddDay}>
            <label className="field">
              Topic (weekly theme)
              <input type="text" required value={newDay.topic}
                onChange={(e) => setNewDay({ ...newDay, topic: e.target.value })} />
            </label>
            <label className="field">
              Symptom (specific daily topic)
              <input type="text" required value={newDay.symptom}
                onChange={(e) => setNewDay({ ...newDay, symptom: e.target.value })} />
            </label>
            <label className="field">
              Hook Combo (psychology angle)
              <input type="text" required value={newDay.hook_combo}
                onChange={(e) => setNewDay({ ...newDay, hook_combo: e.target.value })} />
            </label>
            <div className="row">
              <button className="btn primary" type="submit" disabled={loading}>
                {loading ? 'Adding…' : 'Add day & generate first prompt'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
        <div className="history-title" style={{ margin: 0 }}>Recent prompts</div>
        {history.length > 0 && (
          <button className="btn small" onClick={resetAll} disabled={loading}>
            Reset all
          </button>
        )}
      </div>
      {history.length === 0 && <div className="muted" style={{ marginTop: 8 }}>Nothing yet. Tap the button above.</div>}
      {history.map((h) => (
        <details key={h.id} className="history-item">
          <summary>
            <span className="history-summary-text">
              Day {h.day_number} · Post {h.post_index} · {h.content_type}
              <span className="muted"> — {new Date(h.created_at).toLocaleString()}</span>
            </span>
            <button
              type="button"
              className="icon-btn"
              aria-label="Delete prompt"
              title="Delete prompt"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); deletePrompt(h.id); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
              </svg>
            </button>
          </summary>
          <div className="prompt-block" style={{ marginTop: 10 }}>{h.prompt_text}</div>
          <div className="row">
            <button className="btn" onClick={() => copyText(h.prompt_text)}>Copy</button>
          </div>
        </details>
      ))}
    </div>
  );
}
