'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const BusinessContext = createContext(null);
const LS_KEY = 'ghl_current_business_id';

export function BusinessProvider({ children }) {
  const [businesses, setBusinesses] = useState([]);
  const [currentId, setCurrentIdState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('businesses').select('*').order('id');
      if (error) throw error;
      let list = data || [];
      if (list.length === 0) {
        const { data: created, error: cErr } = await supabase
          .from('businesses')
          .insert({ name: 'My Business' })
          .select()
          .single();
        if (cErr) throw cErr;
        await supabase.from('settings').insert({ business_id: created.id, start_date: null });
        list = [created];
      }
      setBusinesses(list);

      const saved = typeof window !== 'undefined'
        ? Number(localStorage.getItem(LS_KEY))
        : null;
      const found = list.find((b) => b.id === saved);
      setCurrentIdState(found ? found.id : list[0].id);
    } catch (e) {
      setError(e.message || 'Failed to load businesses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setCurrentId = useCallback((id) => {
    setCurrentIdState(id);
    if (typeof window !== 'undefined') localStorage.setItem(LS_KEY, String(id));
  }, []);

  const addBusiness = useCallback(async (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Name is required.');
    const { data, error } = await supabase
      .from('businesses')
      .insert({ name: trimmed })
      .select()
      .single();
    if (error) throw error;
    await supabase.from('settings').insert({ business_id: data.id, start_date: null });
    setBusinesses((prev) => [...prev, data]);
    setCurrentId(data.id);
    return data;
  }, [setCurrentId]);

  const renameBusiness = useCallback(async (id, name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Name is required.');
    const { data, error } = await supabase
      .from('businesses')
      .update({ name: trimmed })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setBusinesses((prev) => prev.map((b) => (b.id === id ? data : b)));
    return data;
  }, []);

  const deleteBusiness = useCallback(async (id) => {
    const { error } = await supabase.from('businesses').delete().eq('id', id);
    if (error) throw error;
    const remaining = businesses.filter((b) => b.id !== id);
    setBusinesses(remaining);
    if (currentId === id) {
      if (remaining.length > 0) setCurrentId(remaining[0].id);
      else {
        // Recreate a Default so the app is never in a zero-business state.
        const { data: created } = await supabase
          .from('businesses')
          .insert({ name: 'My Business' })
          .select()
          .single();
        if (created) {
          await supabase.from('settings').insert({ business_id: created.id, start_date: null });
          setBusinesses([created]);
          setCurrentId(created.id);
        }
      }
    }
  }, [businesses, currentId, setCurrentId]);

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        currentId,
        current: businesses.find((b) => b.id === currentId) || null,
        loading,
        error,
        setCurrentId,
        addBusiness,
        renameBusiness,
        deleteBusiness,
        reload: load,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used inside <BusinessProvider>');
  return ctx;
}
