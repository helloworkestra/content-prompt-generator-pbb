'use client';

import { useState } from 'react';
import { useBusiness } from '../lib/BusinessContext';

export default function BusinessSwitcher() {
  const {
    businesses, currentId, current, loading, error,
    setCurrentId, addBusiness, renameBusiness, deleteBusiness,
  } = useBusiness();

  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState(null);

  if (loading) {
    return <div className="biz-switcher muted">Loading businesses…</div>;
  }
  if (error) {
    return <div className="biz-switcher error">Business error: {error}</div>;
  }

  async function handleAdd() {
    const name = window.prompt('Name for the new business or page:');
    if (name == null) return;
    setBusy(true); setLocalError(null);
    try { await addBusiness(name); }
    catch (e) { setLocalError(e.message); }
    finally { setBusy(false); }
  }

  async function handleRename() {
    if (!current) return;
    const name = window.prompt('Rename business:', current.name);
    if (name == null) return;
    setBusy(true); setLocalError(null);
    try { await renameBusiness(current.id, name); }
    catch (e) { setLocalError(e.message); }
    finally { setBusy(false); }
  }

  async function handleDelete() {
    if (!current) return;
    const ok = window.confirm(
      `Delete "${current.name}" and ALL of its days, prompts, and metrics? This cannot be undone.`
    );
    if (!ok) return;
    setBusy(true); setLocalError(null);
    try { await deleteBusiness(current.id); }
    catch (e) { setLocalError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="biz-switcher">
      <label className="muted" style={{ fontSize: 12 }}>Business:</label>
      <select
        value={currentId ?? ''}
        onChange={(e) => setCurrentId(Number(e.target.value))}
        disabled={busy}
      >
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      <button className="btn small" onClick={handleAdd} disabled={busy}>+ New</button>
      <button className="btn small" onClick={handleRename} disabled={busy || !current}>Rename</button>
      <button
        className="btn small"
        style={{ color: '#b00020' }}
        onClick={handleDelete}
        disabled={busy || !current}
      >
        Delete
      </button>
      {localError && <span className="error" style={{ marginLeft: 8 }}>{localError}</span>}
    </div>
  );
}
