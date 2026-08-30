// ============================================================
// Last Minuties — Match Preferences Store (Zustand)
// Smart Discovery & Buyer Preference Matching
// ============================================================
import { create } from 'zustand';
import type { MatchPreference } from '../types';
import { supabase, DEMO_MODE } from '../lib/supabase';

// Seed demo preferences
const DEMO_PREFERENCES: MatchPreference[] = [
  {
    id: 'demo-pref-1',
    userId: 'demo-user',
    movie: 'Coolie',
    theatre: 'PVR VR Chennai',
    date: new Date().toISOString().slice(0, 10),
    startTime: '18:00',
    endTime: '23:30',
    maxPrice: 250,
    active: true,
    createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
  },
];

// Helper: map DB row (snake_case) → MatchPreference (camelCase)
function mapDbToPreference(row: any): MatchPreference {
  return {
    id: row.id,
    userId: row.user_id,
    movie: row.movie || undefined,
    theatre: row.theatre || undefined,
    date: row.show_date || row.date || undefined,
    startTime: row.start_time || row.startTime || undefined,
    endTime: row.end_time || row.endTime || undefined,
    maxPrice: row.max_price != null ? Number(row.max_price) : undefined,
    active: row.active ?? true,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

interface MatchPreferenceState {
  preferences: MatchPreference[];
  isLoading: boolean;
  error: string | null;

  fetchPreferences: (userId: string) => Promise<void>;
  createPreference: (data: Partial<MatchPreference> & { userId: string }) => Promise<{ id?: string; error?: string }>;
  updatePreference: (id: string, data: Partial<MatchPreference>) => Promise<{ error?: string }>;
  deletePreference: (id: string) => Promise<{ error?: string }>;
  togglePreferenceActive: (id: string) => Promise<{ error?: string }>;
}

export const useMatchPreferenceStore = create<MatchPreferenceState>((set, get) => ({
  preferences: [],
  isLoading: false,
  error: null,

  fetchPreferences: async (userId: string) => {
    set({ isLoading: true, error: null });

    if (DEMO_MODE || !supabase) {
      await new Promise((r) => setTimeout(r, 200));
      set({
        preferences: DEMO_PREFERENCES.filter((p) => p.userId === userId || p.userId === 'demo-user'),
        isLoading: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('match_preferences')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const prefs = (data || []).map(mapDbToPreference);
      set({ preferences: prefs, isLoading: false });
    } catch (err: any) {
      console.error('[matchPreferenceStore] fetchPreferences error:', err);
      set({ isLoading: false, error: 'Failed to load preferences.' });
    }
  },

  createPreference: async (data) => {
    if (DEMO_MODE || !supabase) {
      const newPref: MatchPreference = {
        id: `pref-${Date.now()}`,
        userId: data.userId,
        movie: data.movie,
        theatre: data.theatre,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        maxPrice: data.maxPrice,
        active: true,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ preferences: [newPref, ...state.preferences] }));
      return { id: newPref.id };
    }

    try {
      const { data: inserted, error } = await supabase
        .from('match_preferences')
        .insert({
          user_id: data.userId,
          movie: data.movie || null,
          theatre: data.theatre || null,
          show_date: data.date || null,
          start_time: data.startTime || null,
          end_time: data.endTime || null,
          max_price: data.maxPrice != null ? data.maxPrice : null,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;

      const pref = mapDbToPreference(inserted);
      set((state) => ({ preferences: [pref, ...state.preferences] }));
      return { id: pref.id };
    } catch (err: any) {
      console.error('[matchPreferenceStore] createPreference error:', err);
      return { error: err?.message || 'Failed to save preference.' };
    }
  },

  updatePreference: async (id, data) => {
    if (DEMO_MODE || !supabase) {
      set((state) => ({
        preferences: state.preferences.map((p) => (p.id === id ? { ...p, ...data } : p)),
      }));
      return {};
    }

    try {
      const updatePayload: any = {};
      if (data.movie !== undefined) updatePayload.movie = data.movie || null;
      if (data.theatre !== undefined) updatePayload.theatre = data.theatre || null;
      if (data.date !== undefined) updatePayload.show_date = data.date || null;
      if (data.startTime !== undefined) updatePayload.start_time = data.startTime || null;
      if (data.endTime !== undefined) updatePayload.end_time = data.endTime || null;
      if (data.maxPrice !== undefined) updatePayload.max_price = data.maxPrice != null ? data.maxPrice : null;
      if (data.active !== undefined) updatePayload.active = data.active;

      const { error } = await supabase
        .from('match_preferences')
        .update(updatePayload)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        preferences: state.preferences.map((p) => (p.id === id ? { ...p, ...data } : p)),
      }));
      return {};
    } catch (err: any) {
      console.error('[matchPreferenceStore] updatePreference error:', err);
      return { error: err?.message || 'Failed to update preference.' };
    }
  },

  deletePreference: async (id) => {
    if (DEMO_MODE || !supabase) {
      set((state) => ({
        preferences: state.preferences.filter((p) => p.id !== id),
      }));
      return {};
    }

    try {
      const { error } = await supabase
        .from('match_preferences')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        preferences: state.preferences.filter((p) => p.id !== id),
      }));
      return {};
    } catch (err: any) {
      console.error('[matchPreferenceStore] deletePreference error:', err);
      return { error: err?.message || 'Failed to delete preference.' };
    }
  },

  togglePreferenceActive: async (id) => {
    const pref = get().preferences.find((p) => p.id === id);
    if (!pref) return { error: 'Preference not found' };
    return get().updatePreference(id, { active: !pref.active });
  },
}));
