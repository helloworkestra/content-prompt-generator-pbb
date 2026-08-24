'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { sequenceForDay } from '../../lib/templates';
import {
  parseISODate, toISODate, monthGrid, diffDays,
  MONTH_NAMES, WEEKDAY_SHORT,
} from '../../lib/dateUtils';

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [startDate, setStartDate] = useState(null);
  const [days, setDays] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedISO, setSelectedISO] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const [s, d, l] = await Promise.all([
      supabase.from('settings').select('start_date').eq('id', 1).maybeSingle(),
      supabase.from('days').select('*').order('day_number'),
      supabase.from('generated_log').select('*').order('created_at', { ascending: false }),
    ]);
    if (s.data && s.data.start_date) setStartDate(parseISODate(s.data.start_date));
    else setStartDate(null);
    if (d.data) setDays(d.data);
    if (l.data) setLogs(l.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const dayByNumber = useMemo(() => {
    const m = new Map();
    for (const d of days) m.set(d.day_number, d);
    return m;
  }, [days]);

  const logsByDay = useMemo(() => {
    const m = new Map();
    for (const row of logs) {
      const arr = m.get(row.day_number) || [];
      arr.push(row);
      m.set(row.day_number, arr);
    }
    return m;
  }, [logs]);

  const cells = useMemo(() => monthGrid(year, month), [year, month]);

  function cellInfo(date) {
    if (!startDate) return { dayNumber: null, dayRow: null, generatedCount: 0 };
    const dn = diffDays(date, startDate) + 1;
    if (dn < 1) return { dayNumber: null, dayRow: null, generatedCount: 0 };
    const dayRow = dayByNumber.get(dn) || null;
    const generatedCount = (logsByDay.get(dn) || []).length;
    return { dayNumber: dn, dayRow, generatedCount };
  }

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11); } else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0); } else setMonth(month + 1);
  }

  const selectedDate = selectedISO ? parseISODate(selectedISO) : null;
  const selectedInfo = selectedDate ? cellInfo(selectedDate) : null;
  const todayISO = toISODate(today);

  return (
    <div className="container">
      <h1>Calendar</h1>
      {!startDate && (
        <div className="subtitle">
          Set your Day 1 date on the <a href="/">Home page</a> to see topics laid out on the calendar.
        </div>
      )}
      {startDate && (
        <div className="subtitle">
          Day 1 is {startDate.toDateString()}.
        </div>
      )}

      <div className="cal-header">
        <button className="btn small" onClick={prevMonth}>← Prev</button>
        <strong>{MONTH_NAMES[month]} {year}</strong>
        <button className="btn small" onClick={nextMonth}>Next →</button>
      </div>

      {logs.length > 0 && (
        <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn small"
            onClick={async () => {
              if (!confirm('Reset ALL generated prompts and engagement data? This wipes every day\'s progress. Cannot be undone.')) return;
              const { error } = await supabase.from('generated_log').delete().gte('id', 0);
              if (error) setError(error.message);
              else { setSelectedISO(null); load(); }
            }}
          >
            Reset all
          </button>
        </div>
      )}

      <div className="cal-grid">
        {WEEKDAY_SHORT.map((d) => (
          <div key={d} className="cal-weekday">{d}</div>
        ))}
        {cells.map((date) => {
          const inMonth = date.getMonth() === month;
          const iso = toISODate(date);
          const { dayNumber, dayRow, generatedCount } = cellInfo(date);
          const clickable = inMonth && !!dayRow;
          const classes = [
            'cal-cell',
            !inMonth ? 'dim' : '',
            clickable ? 'clickable' : '',
            selectedISO === iso ? 'selected' : '',
            iso === todayISO ? 'today' : '',
          ].filter(Boolean).join(' ');
          return (
            <div
              key={iso}
              className={classes}
              onClick={() => { if (clickable) setSelectedISO(iso); }}
            >
              <div className="cal-date">{date.getDate()}</div>
              {inMonth && dayRow && (
                <>
                  <div className="cal-topic" title={dayRow.symptom}>{dayRow.symptom}</div>
                  <div className={'cal-badge' + (generatedCount === 0 ? ' empty' : '')}>
                    {generatedCount}/5 posted
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {error && <div className="error">{error}</div>}

      {selectedInfo && selectedInfo.dayRow && (
        <DayDetail
          date={selectedDate}
          dayRow={selectedInfo.dayRow}
          logs={logsByDay.get(selectedInfo.dayNumber) || []}
          onSaved={load}
          onError={setError}
        />
      )}
    </div>
  );
}

function DayDetail({ date, dayRow, logs, onSaved, onError }) {
  const seq = (dayRow.sequence && dayRow.sequence.length === 5)
    ? dayRow.sequence
    : sequenceForDay(dayRow.day_number);

  // pick earliest log per post_index (in case duplicates exist)
  const logByPost = new Map();
  for (const l of logs) {
    const prev = logByPost.get(l.post_index);
    if (!prev || new Date(l.created_at) < new Date(prev.created_at)) logByPost.set(l.post_index, l);
  }

  const generatedCount = [1, 2, 3, 4, 5].filter((i) => logByPost.get(i)).length;
  const [copiedAll, setCopiedAll] = useState(false);

  async function copyAll() {
    const parts = [];
    for (let i = 1; i <= 5; i++) {
      const l = logByPost.get(i);
      if (!l) continue;
      parts.push(`--- Post ${i} · ${l.content_type} ---\n${l.prompt_text}`);
    }
    if (parts.length === 0) return;
    try {
      await navigator.clipboard.writeText(parts.join('\n\n'));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    } catch {
      onError && onError('Copy failed. Long-press to select and copy manually.');
    }
  }

  return (
    <div className="card">
      <div className="post-header" style={{ marginBottom: 8 }}>
        <div className="label" style={{ margin: 0 }}>
          {date.toDateString()} — Day {dayRow.day_number}
        </div>
        {generatedCount > 0 && (
          <div className="btn-group">
            <button className="btn small" onClick={copyAll}>
              {copiedAll ? 'Copied ✓' : `Copy all ${generatedCount} prompt${generatedCount === 1 ? '' : 's'}`}
            </button>
          </div>
        )}
      </div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{dayRow.topic}</div>
      <div className="muted">Hook: {dayRow.hook_combo}</div>
      <div className="muted" style={{ marginTop: 4 }}>Symptom: {dayRow.symptom}</div>

      {[1, 2, 3, 4, 5].map((postIndex) => {
        const log = logByPost.get(postIndex);
        const contentType = seq[postIndex - 1];
        return (
          <PostRow
            key={postIndex}
            postIndex={postIndex}
            contentType={contentType}
            log={log}
            onSaved={onSaved}
            onError={onError}
          />
        );
      })}
    </div>
  );
}

function PostRow({ postIndex, contentType, log, onSaved, onError }) {
  const [likes, setLikes] = useState(log?.likes ?? 0);
  const [comments, setComments] = useState(log?.comments ?? 0);
  const [shares, setShares] = useState(log?.shares ?? 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    if (!log) return;
    try {
      await navigator.clipboard.writeText(log.prompt_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      onError && onError('Copy failed. Long-press to select and copy manually.');
    }
  }

  useEffect(() => {
    setLikes(log?.likes ?? 0);
    setComments(log?.comments ?? 0);
    setShares(log?.shares ?? 0);
  }, [log]);

  async function save() {
    if (!log) return;
    setSaving(true);
    setSaved(false);
    try {
      const { error } = await supabase
        .from('generated_log')
        .update({
          likes: Number(likes) || 0,
          comments: Number(comments) || 0,
          shares: Number(shares) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', log.id);
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      onSaved && onSaved();
    } catch (e) {
      onError && onError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const total = Number(likes) + Number(comments) + Number(shares);

  return (
    <div className="post-block">
      <div className="post-header">
        <div className="post-title">
          <strong>Post {postIndex}</strong> · {contentType}{' '}
          {log
            ? <span className="muted">· generated</span>
            : <span className="muted">· not generated yet</span>}
        </div>
        {log && (
          <div className="btn-group">
            <button className="btn small" onClick={copyPrompt}>
              {copied ? 'Copied ✓' : 'Copy prompt'}
            </button>
            <button className="btn small" onClick={() => setOpen(!open)}>
              {open ? 'Hide prompt' : 'Show prompt'}
            </button>
          </div>
        )}
      </div>

      {log && open && (
        <div className="prompt-block" style={{ marginTop: 8 }}>{log.prompt_text}</div>
      )}

      {log && (
        <>
          <div className="metrics-row">
            <label className="muted">Likes <input type="number" min="0" value={likes} onChange={(e) => setLikes(e.target.value)} /></label>
            <label className="muted">Comments <input type="number" min="0" value={comments} onChange={(e) => setComments(e.target.value)} /></label>
            <label className="muted">Shares <input type="number" min="0" value={shares} onChange={(e) => setShares(e.target.value)} /></label>
            {total > 0 && <span className="muted total-engagement">Total engagement: <strong>{total}</strong></span>}
          </div>
          <div className="actions-row">
            <div className="btn-group">
              <button className="btn primary small" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
              </button>
              <button
                className="btn small"
                style={{ color: '#b00020' }}
                onClick={async () => {
                  if (!confirm(`Delete Post ${postIndex} (${contentType})? This removes the prompt and its engagement numbers. Cannot be undone.`)) return;
                  const { error } = await supabase.from('generated_log').delete().eq('id', log.id);
                  if (error) onError && onError(error.message);
                  else onSaved && onSaved();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
