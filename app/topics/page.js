'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { CONTENT_TYPES, HOOK_COMBOS, hookComboForIndex, sequenceForDay } from '../../lib/templates';
import { useBusiness } from '../../lib/BusinessContext';

export default function TopicsPage() {
  const { currentId: businessId, current: business } = useBusiness();
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // { mode: 'add'|'edit', row }
  const [weekOpen, setWeekOpen] = useState(false);
  const [viewMode, setViewMode] = useState('daily');

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('days')
      .select('*')
      .eq('business_id', businessId)
      .order('day_number');
    if (error) setError(error.message);
    else setDays(data || []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    const nextDay = days.length ? Math.max(...days.map(d => d.day_number)) + 1 : 1;
    setEditing({
      mode: 'add',
      row: {
        day_number: nextDay,
        week_number: Math.ceil(nextDay / 7),
        topic: '',
        symptom: '',
        hook_combo: hookComboForIndex(days.length),
        sequence: sequenceForDay(nextDay),
      },
    });
  }

  function openDuplicate(row) {
    const nextDay = days.length ? Math.max(...days.map(d => d.day_number)) + 1 : 1;
    const seq = (row.sequence && row.sequence.length === 5) ? [...row.sequence] : sequenceForDay(nextDay);
    setEditing({
      mode: 'add',
      row: {
        day_number: nextDay,
        week_number: Math.ceil(nextDay / 7),
        topic: row.topic,
        symptom: row.symptom,
        hook_combo: row.hook_combo || hookComboForIndex(days.length),
        sequence: seq,
      },
    });
  }

  function openEdit(row) {
    const seq = (row.sequence && row.sequence.length === 5) ? [...row.sequence] : sequenceForDay(row.day_number);
    setEditing({ mode: 'edit', row: { ...row, sequence: seq } });
  }

  async function handleDelete(row) {
    setError(null);
    const { count, error: countErr } = await supabase
      .from('generated_log')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('day_number', row.day_number);
    if (countErr) { setError(countErr.message); return; }
    const msg = count && count > 0
      ? `This day already has ${count} generated prompt(s) logged against it — deleting it won't remove those logs, but the day number will show as unassigned going forward. Continue?`
      : `Delete Day ${row.day_number} ("${row.topic}")? This cannot be undone.`;
    if (!confirm(msg)) return;
    const { error: delErr } = await supabase
      .from('days')
      .delete()
      .eq('business_id', businessId)
      .eq('day_number', row.day_number);
    if (delErr) setError(delErr.message);
    else load();
  }

  return (
    <div className="container">
      <h1>Topics</h1>
      <div className="subtitle">
        {business ? <>Editing topics for <strong>{business.name}</strong>. </> : null}
        Every day in your content plan. Edit topics, adjust sequences, or add new days. Day numbers can&apos;t be
        changed after creation — they&apos;re what the prompt history is tied to.
      </div>

      <div className="row" style={{ marginTop: 0, marginBottom: 12, alignItems: 'center' }}>
        <button className="btn primary" onClick={openAdd}>+ Add New Topic</button>
        <button className="btn" onClick={() => setWeekOpen(true)}>✨ Add New Week (AI)</button>
        {days.length > 0 && (
          <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="muted" style={{ fontSize: 13 }}>View:</span>
            <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
        )}
      </div>

      {error && <div className="error">{error}</div>}
      {loading && <div className="muted">Loading…</div>}

      {!loading && days.length > 0 && viewMode === 'daily' && (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th className="num">Day</th>
                <th className="num">Week</th>
                <th>Topic</th>
                <th>Symptom</th>
                <th>Hook Combo</th>
                <th>Sequence</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.day_number}>
                  <td className="num">{d.day_number}</td>
                  <td className="num">{d.week_number}</td>
                  <td>{d.topic}</td>
                  <td>{d.symptom}</td>
                  <td>{d.hook_combo}</td>
                  <td style={{ fontSize: 12 }}>{(d.sequence || []).join(' → ')}</td>
                  <td className="actions">
                    <button className="btn small" onClick={() => openEdit(d)}>Edit</button>{' '}
                    <button className="btn small" onClick={() => openDuplicate(d)}>Duplicate</button>{' '}
                    <button className="btn small" style={{ color: '#b00020' }} onClick={() => handleDelete(d)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && days.length > 0 && viewMode === 'weekly' && (() => {
        const byWeek = new Map();
        for (const d of days) {
          if (!byWeek.has(d.week_number)) byWeek.set(d.week_number, []);
          byWeek.get(d.week_number).push(d);
        }
        const weeks = Array.from(byWeek.entries()).sort((a, b) => a[0] - b[0]);
        return (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="num">Week</th>
                  <th>Topic</th>
                  <th className="num">Days</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map(([wn, rows]) => {
                  const topics = Array.from(new Set(rows.map(r => r.topic).filter(Boolean)));
                  const dns = rows.map(r => r.day_number).sort((a, b) => a - b);
                  return (
                    <tr key={wn}>
                      <td className="num">{wn}</td>
                      <td>{topics.join(' · ')}</td>
                      <td className="num">{dns[0]}–{dns[dns.length - 1]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      {editing && (
        <TopicForm
          mode={editing.mode}
          initial={editing.row}
          businessId={businessId}
          existingDayNumbers={days.map(d => d.day_number)}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {weekOpen && (
        <WeekForm
          businessId={businessId}
          existingDays={days}
          onClose={() => setWeekOpen(false)}
          onSaved={() => { setWeekOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function TopicForm({ mode, initial, businessId, existingDayNumbers, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [symptomTouched, setSymptomTouched] = useState(mode === 'edit' && initial.symptom !== initial.topic);
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  function setField(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function setSeqAt(i, v) {
    setForm((f) => {
      const s = [...f.sequence];
      s[i] = v;
      return { ...f, sequence: s };
    });
  }

  // Typing in Topic mirrors into Symptom until the user has explicitly
  // edited Symptom in the advanced panel.
  function onTopicChange(v) {
    setForm((f) => ({
      ...f,
      topic: v,
      symptom: symptomTouched ? f.symptom : v,
    }));
  }

  // Keep week_number in sync when day_number changes in advanced mode.
  function onDayNumberChange(v) {
    const dn = Number(v);
    setForm((f) => ({
      ...f,
      day_number: v,
      week_number: Number.isInteger(dn) && dn > 0 ? Math.ceil(dn / 7) : f.week_number,
    }));
  }

  async function save(e) {
    e.preventDefault();
    setErr(null);

    const dn = Number(form.day_number);
    const wn = Number(form.week_number);
    if (!Number.isInteger(dn) || dn < 1) { setErr('Day number must be a positive whole number.'); return; }
    if (!Number.isInteger(wn) || wn < 1) { setErr('Week number must be a positive whole number.'); return; }

    // Symptom falls back to Topic when the user never touched it (default flow).
    const effectiveSymptom = (form.symptom && form.symptom.trim()) || form.topic.trim();

    if (!form.topic.trim() || !effectiveSymptom || !form.hook_combo.trim()) {
      setErr('Topic and Hook Combo are required.');
      return;
    }
    if (form.sequence.length !== 5 || form.sequence.some((s) => !CONTENT_TYPES.includes(s))) {
      setErr('Sequence must have all 5 content types selected.');
      return;
    }
    if (mode === 'add' && existingDayNumbers.includes(dn)) {
      setErr(`Day number ${dn} already exists. Pick a different one.`);
      return;
    }

    setSaving(true);
    const payload = {
      day_number: dn,
      week_number: wn,
      topic: form.topic.trim(),
      symptom: effectiveSymptom,
      hook_combo: form.hook_combo.trim(),
      sequence: form.sequence,
    };
    let error;
    if (mode === 'add') {
      ({ error } = await supabase.from('days').insert({ ...payload, business_id: businessId }));
    } else {
      const { day_number, ...rest } = payload;
      ({ error } = await supabase
        .from('days')
        .update(rest)
        .eq('business_id', businessId)
        .eq('day_number', initial.day_number));
    }
    setSaving(false);
    if (error) setErr(error.message);
    else onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{mode === 'add' ? 'Add New Topic' : `Edit Day ${initial.day_number}`}</h3>
        <form onSubmit={save}>
          <label className="field">
            Topic
            <input
              type="text"
              required
              autoFocus
              value={form.topic}
              onChange={(e) => onTopicChange(e.target.value)}
              placeholder="e.g. Missed follow-ups killing your pipeline"
            />
          </label>

          {!advanced && (
            <div className="muted" style={{ marginTop: 4, fontSize: 12, lineHeight: 1.5 }}>
              Auto: Day <strong>{form.day_number}</strong> · Week <strong>{form.week_number}</strong> · Hook <em>{form.hook_combo}</em> · Sequence <em>{form.sequence.join(' → ')}</em>
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn small"
              onClick={() => setAdvanced((v) => !v)}
            >
              {advanced ? 'Hide advanced options' : 'Advanced options'}
            </button>
          </div>

          {advanced && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee' }}>
              <label className="field">
                Day number {mode === 'edit' && <span className="muted">(can&apos;t be changed)</span>}
                <input
                  type="number"
                  min="1"
                  value={form.day_number}
                  onChange={(e) => onDayNumberChange(e.target.value)}
                  disabled={mode === 'edit'}
                  style={{ width: '100%', marginTop: 6 }}
                />
              </label>
              <label className="field">
                Week number
                <input
                  type="number"
                  min="1"
                  value={form.week_number}
                  onChange={(e) => setField('week_number', e.target.value)}
                  style={{ width: '100%', marginTop: 6 }}
                />
              </label>
              <label className="field">
                Symptom <span className="muted">(defaults to Topic if left blank)</span>
                <input
                  type="text"
                  value={form.symptom}
                  onChange={(e) => { setSymptomTouched(true); setField('symptom', e.target.value); }}
                />
              </label>
              <label className="field">
                Hook Combo
                <input
                  type="text"
                  list="hook-combo-suggestions"
                  value={form.hook_combo}
                  onChange={(e) => setField('hook_combo', e.target.value)}
                />
                <datalist id="hook-combo-suggestions">
                  {HOOK_COMBOS.map((h) => <option key={h} value={h} />)}
                </datalist>
              </label>

              <div className="field" style={{ marginTop: 12 }}>
                Sequence (post order)
                <div className="seq-grid">
                  {form.sequence.map((val, i) => (
                    <label key={i}>
                      Post {i + 1}
                      <select value={val} onChange={(e) => setSeqAt(i, e.target.value)}>
                        {CONTENT_TYPES.map((ct) => (
                          <option key={ct} value={ct}>{ct}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {err && <div className="error">{err}</div>}

          <div className="row" style={{ marginTop: 16 }}>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WeekForm({ businessId, existingDays, onClose, onSaved }) {
  const nextDay = existingDays.length ? Math.max(...existingDays.map(d => d.day_number)) + 1 : 1;
  const [topic, setTopic] = useState('');
  const [symptoms, setSymptoms] = useState(['', '', '', '', '', '', '']);
  const [hookCombo, setHookCombo] = useState(hookComboForIndex(existingDays.length));
  const [startDay, setStartDay] = useState(nextDay);
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [audienceEmpty, setAudienceEmpty] = useState(false);
  const [generated, setGenerated] = useState(false);

  async function generate() {
    setErr(null);
    setAudienceEmpty(false);
    setBusy(true);
    try {
      const res = await fetch('/api/generate-week', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ businessId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body?.error === 'AUDIENCE_EMPTY') { setAudienceEmpty(true); return; }
        throw new Error(body?.error || `Request failed (${res.status}).`);
      }
      setTopic(body.topic || '');
      setSymptoms(body.symptoms || ['', '', '', '', '', '', '']);
      setGenerated(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  function setSymptomAt(i, v) {
    setSymptoms((prev) => prev.map((s, idx) => (idx === i ? v : s)));
  }

  async function save(e) {
    e.preventDefault();
    setErr(null);
    if (!topic.trim()) { setErr('Topic is required.'); return; }
    if (symptoms.some((s) => !s.trim())) { setErr('All 7 symptom lines are required.'); return; }
    if (!hookCombo.trim()) { setErr('Hook combo is required.'); return; }
    const start = Number(startDay);
    if (!Number.isInteger(start) || start < 1) { setErr('Starting day number must be a positive whole number.'); return; }

    const existingDayNumbers = new Set(existingDays.map((d) => d.day_number));
    const rows = [];
    for (let i = 0; i < 7; i++) {
      const dn = start + i;
      if (existingDayNumbers.has(dn)) {
        setErr(`Day number ${dn} already exists. Change the starting day in Advanced options.`);
        return;
      }
      rows.push({
        business_id: businessId,
        day_number: dn,
        week_number: Math.ceil(dn / 7),
        topic: topic.trim(),
        symptom: symptoms[i].trim(),
        hook_combo: hookCombo.trim(),
        sequence: sequenceForDay(dn),
      });
    }

    setSaving(true);
    const { error } = await supabase.from('days').insert(rows);
    setSaving(false);
    if (error) setErr(error.message);
    else onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add New Week (AI)</h3>

        {audienceEmpty ? (
          <div className="card" style={{ background: '#fff8e6', borderColor: '#f0e0a5' }}>
            Set up your Audience Profile first. <a href="/settings">Open Audience settings →</a>
          </div>
        ) : (
          <>
            {!generated && (
              <div className="muted" style={{ marginBottom: 12 }}>
                One click. The AI reads your Audience Profile, checks which topics you've already used, and invents a fresh weekly theme + 7 daily symptoms. Everything is editable before you save.
              </div>
            )}

            <div className="row" style={{ marginTop: 0, marginBottom: 12 }}>
              <button type="button" className="btn primary" onClick={generate} disabled={busy || saving}>
                {busy ? 'Generating…' : generated ? 'Regenerate' : 'Generate New Week'}
              </button>
            </div>

            {err && <div className="error">{err}</div>}

            <form onSubmit={save}>
              <label className="field">
                Topic (weekly theme)
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={generated ? '' : 'Click Generate to fill this in — or type your own.'}
                />
              </label>

              <div className="field" style={{ marginTop: 12 }}>
                7 daily symptoms
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                  {symptoms.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <div className="muted" style={{ width: 44, paddingTop: 8 }}>Day {startDay + i}</div>
                      <textarea
                        rows={2}
                        value={s}
                        onChange={(e) => setSymptomAt(i, e.target.value)}
                        style={{ flex: 1, fontFamily: 'inherit', fontSize: 14, padding: 8 }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <button type="button" className="btn small" onClick={() => setAdvanced((v) => !v)}>
                  {advanced ? 'Hide advanced options' : 'Advanced options'}
                </button>
              </div>

              {advanced && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee' }}>
                  <label className="field">
                    Starting day number
                    <input
                      type="number"
                      min="1"
                      value={startDay}
                      onChange={(e) => setStartDay(e.target.value)}
                      style={{ width: '100%', marginTop: 6 }}
                    />
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      Days {startDay}–{Number(startDay) + 6} will be created. Week numbers are auto-assigned.
                    </div>
                  </label>
                  <label className="field">
                    Hook Combo (applied to all 7 days)
                    <input
                      type="text"
                      list="week-hook-suggestions"
                      value={hookCombo}
                      onChange={(e) => setHookCombo(e.target.value)}
                    />
                    <datalist id="week-hook-suggestions">
                      {HOOK_COMBOS.map((h) => <option key={h} value={h} />)}
                    </datalist>
                  </label>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Post sequence for each day is auto-rotated by the same rule the rest of the app uses.
                  </div>
                </div>
              )}

              <div className="row" style={{ marginTop: 16 }}>
                <button type="submit" className="btn primary" disabled={saving || busy}>
                  {saving ? 'Saving…' : 'Save all 7 days'}
                </button>
                <button type="button" className="btn" onClick={onClose}>Cancel</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
