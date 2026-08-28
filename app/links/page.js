'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useBusiness } from '../../lib/BusinessContext';

function isValidUrl(v) {
  const s = (v || '').trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

export default function LinksPage() {
  const { currentId: businessId, current: business } = useBusiness();
  const [links, setLinks] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('business_links')
      .select('*')
      .eq('business_id', businessId)
      .order('position');
    if (error) setError(error.message);
    else setLinks(data || []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  async function addLink(e) {
    e.preventDefault();
    setError(null);
    if (!newTitle.trim()) { setError('Title is required.'); return; }
    if (!isValidUrl(newUrl)) { setError('URL must be a valid http(s) link.'); return; }
    const nextPos = links.length ? Math.max(...links.map((l) => l.position)) + 1 : 1;
    const { data, error } = await supabase
      .from('business_links')
      .insert({
        business_id: businessId,
        position: nextPos,
        title: newTitle.trim(),
        url: newUrl.trim(),
      })
      .select()
      .single();
    if (error) { setError(error.message); return; }
    setLinks((prev) => [...prev, data]);
    setNewTitle('');
    setNewUrl('');
  }

  async function updateLink(id, patch) {
    if (patch.url != null && !isValidUrl(patch.url)) { setError('URL must be a valid http(s) link.'); return; }
    if (patch.title != null && !patch.title.trim()) { setError('Title is required.'); return; }
    setError(null);
    const { error } = await supabase
      .from('business_links')
      .update(patch)
      .eq('id', id)
      .eq('business_id', businessId);
    if (error) { setError(error.message); return; }
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function deleteLink(id) {
    if (!confirm('Delete this link?')) return;
    const { error } = await supabase
      .from('business_links')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);
    if (error) { setError(error.message); return; }
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  async function move(id, direction) {
    const idx = links.findIndex((l) => l.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= links.length) return;
    const a = links[idx];
    const b = links[swapIdx];
    const next = [...links];
    next[idx] = { ...b, position: a.position };
    next[swapIdx] = { ...a, position: b.position };
    next.sort((x, y) => x.position - y.position);
    setLinks(next);
    const [r1, r2] = await Promise.all([
      supabase.from('business_links').update({ position: b.position }).eq('id', a.id).eq('business_id', businessId),
      supabase.from('business_links').update({ position: a.position }).eq('id', b.id).eq('business_id', businessId),
    ]);
    if (r1.error || r2.error) { setError((r1.error || r2.error).message); load(); }
  }

  return (
    <div className="container">
      <h1>Links</h1>
      <div className="subtitle">
        {business ? <>Links for <strong>{business.name}</strong>. Each business has its own. </> : null}
        Add anything you want quick access to while working — custom ChatGPTs, content calendar docs, dashboards, drives. Every link here shows up as an <em>Open [Title] ↗</em> button next to the Copy buttons on the Home and Portraits pages.
      </div>

      {error && <div className="error">{error}</div>}

      <form onSubmit={addLink} className="card">
        <div className="label">Add a link</div>
        <div className="row" style={{ marginTop: 0, flexWrap: 'wrap', gap: 8 }}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title (e.g. ChatGPT, Content Calendar Doc)"
            style={{ flex: '1 1 240px' }}
          />
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://…"
            style={{ flex: '2 1 360px' }}
          />
          <button type="submit" className="btn primary">+ Add</button>
        </div>
      </form>

      {loading ? <div className="muted">Loading…</div> : (
        <>
          {links.length === 0 && (
            <div className="muted">No links yet — add one above.</div>
          )}
          {links.map((l, idx) => (
            <LinkRow
              key={l.id}
              row={l}
              canUp={idx > 0}
              canDown={idx < links.length - 1}
              onUpdate={(patch) => updateLink(l.id, patch)}
              onDelete={() => deleteLink(l.id)}
              onMove={(dir) => move(l.id, dir)}
            />
          ))}
        </>
      )}
    </div>
  );
}

function LinkRow({ row, canUp, canDown, onUpdate, onDelete, onMove }) {
  const [title, setTitle] = useState(row.title);
  const [url, setUrl] = useState(row.url);
  const [editing, setEditing] = useState(false);

  async function save() {
    await onUpdate({ title: title.trim(), url: url.trim() });
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 600 }}>{row.title}</div>
              <a href={row.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, wordBreak: 'break-all' }}>
                {row.url}
              </a>
            </>
          )}
          <div className="row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <a className="btn small primary" href={row.url} target="_blank" rel="noopener noreferrer">Open ↗</a>
            {editing ? (
              <>
                <button className="btn small" onClick={save}>Save</button>
                <button className="btn small" onClick={() => { setTitle(row.title); setUrl(row.url); setEditing(false); }}>Cancel</button>
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
