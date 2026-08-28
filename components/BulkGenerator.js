'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fillTemplate, sequenceForDay } from '../lib/templates';
import { parseISODate, dayNumberForDate, dateForDayNumber } from '../lib/dateUtils';
import { useBusiness } from '../lib/BusinessContext';

// Ensures all 5 posts for a given day are generated. Returns:
//   { dayNumber, dayRow: null, skipped: true }  when day has no topic
//   { dayNumber, dayRow, posts: [{ post_index, content_type, prompt_text, status: 'already'|'new' }, ...] }
async function ensureDayGenerated(businessId, dayNumber) {
  const { data: dayRow, error: dayErr } = await supabase
    .from('days')
    .select('*')
    .eq('business_id', businessId)
    .eq('day_number', dayNumber)
    .maybeSingle();
  if (dayErr) throw dayErr;
  if (!dayRow) return { dayNumber, dayRow: null, skipped: true };

  const { data: existing, error: logErr } = await supabase
    .from('generated_log')
    .select('*')
    .eq('business_id', businessId)
    .eq('day_number', dayNumber);
  if (logErr) throw logErr;

  const byPost = new Map();
  for (const row of existing || []) {
    const prev = byPost.get(row.post_index);
    if (!prev || new Date(row.created_at) < new Date(prev.created_at)) byPost.set(row.post_index, row);
  }

  const seq = (dayRow.sequence && dayRow.sequence.length === 5)
    ? dayRow.sequence
    : sequenceForDay(dayNumber);

  const posts = [];
  for (let i = 1; i <= 5; i++) {
    const existingRow = byPost.get(i);
    if (existingRow) {
      posts.push({
        post_index: i,
        content_type: existingRow.content_type,
        prompt_text: existingRow.prompt_text,
        status: 'already',
      });
      continue;
    }
    const contentType = seq[i - 1];
    const prompt = fillTemplate(contentType, dayRow.symptom, dayRow.hook_combo);
    const { error: insErr } = await supabase.from('generated_log').insert({
      business_id: businessId,
      day_number: dayNumber,
      post_index: i,
      content_type: contentType,
      prompt_text: prompt,
    });
    if (insErr) throw insErr;
    posts.push({ post_index: i, content_type: contentType, prompt_text: prompt, status: 'new' });
  }
  return { dayNumber, dayRow, posts };
}

async function copy(text, setCopiedKey, key) {
  try {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  } catch {}
}

export default function BulkGenerator({ onGenerated }) {
  const { currentId: businessId } = useBusiness();
  const [startDate, setStartDate] = useState(null);
  const [mode, setMode] = useState(null); // 'day' | 'range' | null
  const [dayInput, setDayInput] = useState('1');
  const [dayDate, setDayDate] = useState('');
  const [rangeStart, setRangeStart] = useState('1');
  const [rangeEnd, setRangeEnd] = useState('5');
  const [rangeStartDate, setRangeStartDate] = useState('');
  const [rangeEndDate, setRangeEndDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [copiedKey, setCopiedKey] = useState(null);
  const [endNote, setEndNote] = useState(null);

  useEffect(() => {
    (async () => {
      if (!businessId) return;
      setResults([]);
      setEndNote(null);
      const { data } = await supabase
        .from('settings')
        .select('start_date')
        .eq('business_id', businessId)
        .maybeSingle();
      if (data && data.start_date) setStartDate(parseISODate(data.start_date));
      else setStartDate(null);
    })();
  }, [businessId]);

  function resolveDayNumberFromDate(iso) {
    if (!iso || !startDate) return null;
    return dayNumberForDate(parseISODate(iso), startDate);
  }

  async function runOneDay(e) {
    e.preventDefault();
    setError(null);
    setResults([]);
    setEndNote(null);
    let dn = null;
    if (startDate && dayDate) dn = resolveDayNumberFromDate(dayDate);
    else dn = Number(dayInput);
    if (!Number.isInteger(dn) || dn < 1) { setError('Pick a valid day.'); return; }
    setBusy(true);
    try {
      const r = await ensureDayGenerated(businessId, dn);
      setResults([r]);
      onGenerated && onGenerated();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function runRemaining() {
    setError(null);
    setResults([]);
    setEndNote(null);
    setBusy(true);
    try {
      const { data: lastArr } = await supabase
        .from('generated_log')
        .select('day_number, post_index')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(1);
      let startDay;
      if (!lastArr || lastArr.length === 0) startDay = 1;
      else if (lastArr[0].post_index < 5) startDay = lastArr[0].day_number;
      else startDay = lastArr[0].day_number + 1;

      const out = [];
      let dn = startDay;
      const HARD_CAP = 365;
      let processed = 0;
      let lastFilled = startDay - 1;
      while (processed < HARD_CAP) {
        // eslint-disable-next-line no-await-in-loop
        const r = await ensureDayGenerated(businessId, dn);
        if (r.skipped) {
          setEndNote(`Reached the end of your available topics after Day ${lastFilled}. Add more on the Topics page to keep generating.`);
          break;
        }
        out.push(r);
        setResults([...out]);
        lastFilled = dn;
        dn += 1;
        processed += 1;
      }
      if (processed >= HARD_CAP) {
        setEndNote(`Stopped after ${HARD_CAP} days as a safety limit.`);
      }
      onGenerated && onGenerated();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function runRange(e) {
    e.preventDefault();
    setError(null);
    setResults([]);
    setEndNote(null);
    let s, en;
    if (startDate && rangeStartDate && rangeEndDate) {
      s = resolveDayNumberFromDate(rangeStartDate);
      en = resolveDayNumberFromDate(rangeEndDate);
    } else {
      s = Number(rangeStart);
      en = Number(rangeEnd);
    }
    if (!Number.isInteger(s) || !Number.isInteger(en) || s < 1 || en < s) {
      setError('Pick a valid range (end must be on or after start).');
      return;
    }
    if (en - s > 60) { setError('Range is too large (max 60 days at a time).'); return; }
    setBusy(true);
    try {
      const out = [];
      for (let dn = s; dn <= en; dn++) {
        // eslint-disable-next-line no-await-in-loop
        const r = await ensureDayGenerated(businessId, dn);
        out.push(r);
        setResults([...out]);
      }
      onGenerated && onGenerated();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="card">
      <div className="label">Bulk generate</div>
      <div className="row" style={{ marginTop: 0 }}>
        <button
          className={'btn ' + (mode === 'day' ? 'primary' : '')}
          onClick={() => { setMode(mode === 'day' ? null : 'day'); setResults([]); setError(null); }}
        >
          Generate all for one day
        </button>
        <button
          className={'btn ' + (mode === 'range' ? 'primary' : '')}
          onClick={() => { setMode(mode === 'range' ? null : 'range'); setResults([]); setError(null); }}
        >
          Generate for a range
        </button>
        <button
          className="btn"
          onClick={() => { setMode(null); runRemaining(); }}
          disabled={busy || !businessId}
        >
          {busy ? 'Working…' : 'Generate all remaining'}
        </button>
      </div>

      {mode === 'day' && (
        <form onSubmit={runOneDay} style={{ marginTop: 12 }}>
          {startDate ? (
            <label className="field">
              Pick a date
              <input
                type="date"
                value={dayDate}
                onChange={(e) => setDayDate(e.target.value)}
                required
              />
              {dayDate && (
                <div className="muted" style={{ marginTop: 4 }}>
                  = Day {resolveDayNumberFromDate(dayDate)}
                </div>
              )}
            </label>
          ) : (
            <label className="field">
              Day number
              <input
                type="number"
                min="1"
                value={dayInput}
                onChange={(e) => setDayInput(e.target.value)}
                required
                style={{ width: '100%', marginTop: 6 }}
              />
            </label>
          )}
          <div className="row">
            <button className="btn primary" type="submit" disabled={busy || !businessId}>
              {busy ? 'Working…' : 'Generate all 5 posts'}
            </button>
          </div>
        </form>
      )}

      {mode === 'range' && (
        <form onSubmit={runRange} style={{ marginTop: 12 }}>
          {startDate ? (
            <>
              <label className="field">
                Start date
                <input type="date" value={rangeStartDate} required onChange={(e) => setRangeStartDate(e.target.value)} />
              </label>
              <label className="field">
                End date
                <input type="date" value={rangeEndDate} required onChange={(e) => setRangeEndDate(e.target.value)} />
              </label>
              {rangeStartDate && rangeEndDate && (
                <div className="muted" style={{ marginTop: 4 }}>
                  = Day {resolveDayNumberFromDate(rangeStartDate)} through Day {resolveDayNumberFromDate(rangeEndDate)}
                </div>
              )}
            </>
          ) : (
            <>
              <label className="field">
                Start day
                <input type="number" min="1" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} required
                  style={{ width: '100%', marginTop: 6 }} />
              </label>
              <label className="field">
                End day
                <input type="number" min="1" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} required
                  style={{ width: '100%', marginTop: 6 }} />
              </label>
            </>
          )}
          <div className="row">
            <button className="btn primary" type="submit" disabled={busy || !businessId}>
              {busy ? 'Working…' : 'Generate range'}
            </button>
          </div>
        </form>
      )}

      {error && <div className="error">{error}</div>}

      {results.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {results.map((r) => (
            <div key={r.dayNumber} style={{ borderTop: '1px solid #eee', paddingTop: 12, marginTop: 12 }}>
              <DayResult
                result={r}
                startDate={startDate}
                copiedKey={copiedKey}
                onCopy={(text, key) => copy(text, setCopiedKey, key)}
              />
            </div>
          ))}
        </div>
      )}

      {endNote && (
        <div className="card" style={{ marginTop: 16, background: '#fff8e6', borderColor: '#f0e0a5' }}>
          {endNote} <a href="/topics">Open Topics page →</a>
        </div>
      )}
    </div>
  );
}

function DayResult({ result, startDate, copiedKey, onCopy }) {
  const dateStr = startDate ? dateForDayNumber(result.dayNumber, startDate).toDateString() : null;

  if (result.skipped) {
    return (
      <div>
        <strong>Day {result.dayNumber}{dateStr ? ` — ${dateStr}` : ''}</strong>
        <div className="muted" style={{ marginTop: 4 }}>
          Day {result.dayNumber} has no topic yet — add one on the <a href="/topics">Topics page</a>.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <strong>Day {result.dayNumber}{dateStr ? ` — ${dateStr}` : ''}</strong>
        <span className="muted">{result.dayRow.topic}</span>
      </div>
      {result.posts.map((p) => {
        const key = `${result.dayNumber}-${p.post_index}`;
        return (
          <div key={p.post_index} style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span><strong>Post {p.post_index}</strong> — {p.content_type}</span>
              <span className="muted" style={{ fontSize: 11 }}>
                {p.status === 'new' ? '● just generated' : '○ already generated'}
              </span>
            </div>
            <div className="prompt-block" style={{ marginTop: 6, maxHeight: '25vh' }}>{p.prompt_text}</div>
            <div className="row" style={{ marginTop: 6 }}>
              <button className="btn small" onClick={() => onCopy(p.prompt_text, key)}>
                {copiedKey === key ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
