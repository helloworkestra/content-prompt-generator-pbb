'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function DashboardPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    const [logRes, dayRes] = await Promise.all([
      supabase.from('generated_log').select('id, day_number, post_index, content_type, likes, comments, shares'),
      supabase.from('days').select('day_number, topic, hook_combo'),
    ]);
    const dayMap = new Map((dayRes.data || []).map((d) => [d.day_number, d]));
    const flattened = (logRes.data || []).map((r) => {
      const d = dayMap.get(r.day_number);
      return {
        ...r,
        topic: d?.topic || '(unknown)',
        hook_combo: d?.hook_combo || '(unknown)',
      };
    });
    setRows(flattened);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function resetMetrics() {
    if (!confirm('Reset ALL engagement metrics (likes, comments, shares) back to zero? Prompt history is kept. Cannot be undone.')) return;
    setError(null);
    const { error } = await supabase
      .from('generated_log')
      .update({ likes: 0, comments: 0, shares: 0, updated_at: new Date().toISOString() })
      .gte('id', 0);
    if (error) setError(error.message);
    else load();
  }

  async function deleteAllPrompts() {
    if (!confirm('Delete ALL generated prompts and their engagement data? Cannot be undone.')) return;
    setError(null);
    const { error } = await supabase.from('generated_log').delete().gte('id', 0);
    if (error) setError(error.message);
    else load();
  }

  const withMetrics = useMemo(
    () => rows.filter((r) => (r.likes + r.comments + r.shares) > 0),
    [rows]
  );

  const byType = useMemo(() => groupStats(withMetrics, (r) => r.content_type), [withMetrics]);
  const byTopic = useMemo(() => groupStats(withMetrics, (r) => r.topic), [withMetrics]);
  const byHook = useMemo(() => groupStats(withMetrics, (r) => r.hook_combo), [withMetrics]);

  return (
    <div className="container">
      <h1>Dashboard</h1>
      <div className="subtitle">
        Average engagement per post (likes + comments + shares). Only posts with metrics entered are counted.
      </div>

      {rows.length > 0 && (
        <div className="row" style={{ marginTop: 0, marginBottom: 12 }}>
          <button className="btn small" onClick={resetMetrics}>Reset all metrics</button>
          <button className="btn small" style={{ color: '#b00020' }} onClick={deleteAllPrompts}>
            Delete all prompts
          </button>
        </div>
      )}

      {error && <div className="error">{error}</div>}
      {loading && <div className="muted">Loading…</div>}
      {!loading && withMetrics.length === 0 && (
        <div className="card">
          <div className="muted">
            No engagement metrics entered yet. Go to the <a href="/calendar">Calendar page</a>, open a day,
            and enter Likes / Comments / Shares for any generated post.
          </div>
        </div>
      )}

      {!loading && withMetrics.length > 0 && (
        <>
          <RankTable title="By content type" rows={byType} />
          <RankTable title="By topic (weekly theme)" rows={byTopic} />
          <RankTable title="By hook combo" rows={byHook} />
        </>
      )}
    </div>
  );
}

function groupStats(rows, keyFn) {
  const groups = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    const g = groups.get(k) || { name: k, count: 0, likes: 0, comments: 0, shares: 0 };
    g.count += 1;
    g.likes += r.likes;
    g.comments += r.comments;
    g.shares += r.shares;
    groups.set(k, g);
  }
  const out = Array.from(groups.values()).map((g) => {
    const avgLikes = g.likes / g.count;
    const avgComments = g.comments / g.count;
    const avgShares = g.shares / g.count;
    return {
      ...g,
      avgLikes,
      avgComments,
      avgShares,
      avgTotal: avgLikes + avgComments + avgShares,
    };
  });
  out.sort((a, b) => b.avgTotal - a.avgTotal);
  return out;
}

function fmt(n) {
  return n.toFixed(1);
}

function RankTable({ title, rows }) {
  if (!rows.length) return null;
  const max = Math.max(...rows.map((r) => r.avgTotal), 1);
  return (
    <>
      <h2>{title}</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th className="num">Posts</th>
            <th className="num">Avg Likes</th>
            <th className="num">Avg Comments</th>
            <th className="num">Avg Shares</th>
            <th className="num">Avg Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>
                {r.name}
                <div className="bar"><span style={{ width: `${(r.avgTotal / max) * 100}%` }} /></div>
              </td>
              <td className="num">{r.count}</td>
              <td className="num">{fmt(r.avgLikes)}</td>
              <td className="num">{fmt(r.avgComments)}</td>
              <td className="num">{fmt(r.avgShares)}</td>
              <td className="num"><strong>{fmt(r.avgTotal)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
