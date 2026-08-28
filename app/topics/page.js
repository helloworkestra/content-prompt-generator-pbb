'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { CONTENT_TYPES } from '../../lib/templates';
import { useBusiness } from '../../lib/BusinessContext';

const EMPTY_SEQ = [...CONTENT_TYPES];

export default function TopicsPage() {
  const { currentId: businessId, current: business } = useBusiness();
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // { mode: 'add'|'edit', row }

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
        hook_combo: '',
        sequence: [...EMPTY_SEQ],
      },
    });
  }

  function openDuplicate(row) {
    const nextDay = days.length ? Math.max(...days.map(d => d.day_number)) + 1 : 1;
    const seq = (row.sequence && row.sequence.length === 5) ? [...row.sequence] : [...EMPTY_SEQ];
    setEditing({
      mode: 'add',
      row: {
        day_number: nextDay,
        week_number: Math.ceil(nextDay / 7),
        topic: row.topic,
        symptom: row.symptom,
        hook_combo: row.hook_combo,
        sequence: seq,
      },
    });
  }

  function openEdit(row) {
    const seq = (row.sequence && row.sequence.length === 5) ? [...row.sequence] : [...EMPTY_SEQ];
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

      <div className="row" style={{ marginTop: 0, marginBottom: 12 }}>
        <button className="btn primary" onClick={openAdd}>+ Add New Topic</button>
      </div>

      {error && <div className="error">{error}</div>}
      {loading && <div className="muted">Loading…</div>}

      {!loading && days.length > 0 && (
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
    </div>
  );
}

function TopicForm({ mode, initial, businessId, existingDayNumbers, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  function setField(k, v) { setForm({ ...form, [k]: v }); }
  function setSeqAt(i, v) {
    const s = [...form.sequence];
    s[i] = v;
    setForm({ ...form, sequence: s });
  }

  async function save(e) {
    e.preventDefault();
    setErr(null);

    const dn = Number(form.day_number);
    const wn = Number(form.week_number);
    if (!Number.isInteger(dn) || dn < 1) { setErr('Day number must be a positive whole number.'); return; }
    if (!Number.isInteger(wn) || wn < 1) { setErr('Week number must be a positive whole number.'); return; }
    if (!form.topic.trim() || !form.symptom.trim() || !form.hook_combo.trim()) {
      setErr('Topic, symptom, and hook combo are required.');
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
      symptom: form.symptom.trim(),
      hook_combo: form.hook_combo.trim(),
      sequence: form.sequence,
    };
    let error;
    if (mode === 'add') {
      ({ error } = await supabase.from('days').insert({ ...payload, business_id: businessId }));
    } else {
      // day_number is not editable in edit mode
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
            Day number {mode === 'edit' && <span className="muted">(can&apos;t be changed)</span>}
            <input
              type="number"
              min="1"
              value={form.day_number}
              onChange={(e) => setField('day_number', e.target.value)}
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
            Topic
            <input type="text" value={form.topic} onChange={(e) => setField('topic', e.target.value)} />
          </label>
          <label className="field">
            Symptom
            <input type="text" value={form.symptom} onChange={(e) => setField('symptom', e.target.value)} />
          </label>
          <label className="field">
            Hook Combo
            <input type="text" value={form.hook_combo} onChange={(e) => setField('hook_combo', e.target.value)} />
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
