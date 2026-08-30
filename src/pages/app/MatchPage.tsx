import { useState, useEffect } from 'react';
import { Target, Plus, Trash2, Edit2, Play, Pause } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useListingsStore } from '../../stores/listingsStore';
import { useAuthStore } from '../../stores/authStore';
import { useMatchPreferenceStore } from '../../stores/matchPreferenceStore';
import { matchListings } from '../../lib/urgency';
import type { MatchPreference, MatchResult } from '../../types';
import TicketCard from '../../components/tickets/TicketCard';

const MOVIE_OPTIONS = [
  'Coolie',
  'F1: The Movie',
  'Jurassic World: Rebirth',
  'Avengers: Doomsday',
  'Interstellar',
  'Pushpa 3',
  'Kalki 2898 AD',
];

const THEATRE_OPTIONS = [
  'PVR VR Chennai',
  'PVR Forum Mall',
  'PVR Phoenix Market City',
  'INOX GVK One',
  'IMAX Forum',
  'AGS Cinemas OMR',
];

const defaultPref: Partial<MatchPreference> = {
  movie: '',
  theatre: '',
  date: '',
  startTime: '',
  endTime: '',
  maxPrice: undefined,
  active: true,
};

export default function MatchPage() {
  const { user } = useAuthStore();
  const { listings, fetchListings } = useListingsStore();
  const {
    preferences,
    fetchPreferences,
    createPreference,
    updatePreference,
    deletePreference,
    togglePreferenceActive,
  } = useMatchPreferenceStore();

  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPrefId, setEditingPrefId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const { register, handleSubmit, reset, setValue } = useForm<Partial<MatchPreference>>({
    defaultValues: defaultPref,
  });

  useEffect(() => {
    fetchListings();
    if (user?.id) {
      fetchPreferences(user.id);
    }
  }, [user?.id, fetchListings, fetchPreferences]);

  useEffect(() => {
    if (preferences.length > 0 && listings.length > 0) {
      const results = matchListings(preferences, listings);
      setMatches(results);
    } else {
      setMatches([]);
    }
  }, [preferences, listings]);

  const handleSavePreference = async (data: Partial<MatchPreference>) => {
    setActionError('');
    if (!user) {
      setActionError('You must be logged in to save preferences.');
      return;
    }

    if (editingPrefId) {
      const res = await updatePreference(editingPrefId, data);
      if (res.error) setActionError(res.error);
      else {
        setEditingPrefId(null);
        setShowForm(false);
        reset(defaultPref);
      }
    } else {
      const res = await createPreference({ ...data, userId: user.id });
      if (res.error) setActionError(res.error);
      else {
        setShowForm(false);
        reset(defaultPref);
      }
    }
  };

  const handleStartEdit = (pref: MatchPreference) => {
    setEditingPrefId(pref.id);
    setValue('movie', pref.movie || '');
    setValue('theatre', pref.theatre || '');
    setValue('date', pref.date || '');
    setValue('startTime', pref.startTime || '');
    setValue('endTime', pref.endTime || '');
    setValue('maxPrice', pref.maxPrice);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingPrefId(null);
    reset(defaultPref);
  };

  const activeCount = preferences.filter((p) => p.active).length;

  return (
    <div className="page">
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 0 }}>
            <Target size={22} style={{ color: 'var(--color-brand-tertiary)' }} />
            Find My Match
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', marginTop: '2px' }}>
            Set your movie preferences. We'll automatically match incoming tickets with explainable match scores.
          </p>
        </div>
        {!showForm && (
          <button
            id="add-preference-btn"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setEditingPrefId(null);
              reset(defaultPref);
              setShowForm(true);
            }}
          >
            <Plus size={16} /> New Match
          </button>
        )}
      </div>

      {actionError && (
        <div className="form-error-banner" style={{ marginBottom: 'var(--space-4)' }}>
          {actionError}
        </div>
      )}

      {/* ── ADD / EDIT PREFERENCE FORM ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 'var(--space-5)', border: '1.5px solid rgba(139, 92, 246, 0.4)', background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.06) 0%, rgba(17, 24, 39, 0.8) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {editingPrefId ? 'Edit Match Preference' : 'Create Match Preference'}
            </h3>
            <span className="badge badge-soon" style={{ fontSize: '10px' }}>
              🎯 Smart Rules Engine
            </span>
          </div>

          <form onSubmit={handleSubmit(handleSavePreference)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* Movie */}
            <div className="form-group">
              <label className="form-label" htmlFor="pref-movie">Movie (Optional)</label>
              <input
                id="pref-movie"
                type="text"
                className="form-input"
                placeholder="e.g. Coolie, Interstellar, F1"
                list="movie-list"
                {...register('movie')}
              />
              <datalist id="movie-list">
                {MOVIE_OPTIONS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            {/* Theatre */}
            <div className="form-group">
              <label className="form-label" htmlFor="pref-theatre">Theatre / Cinema (Optional)</label>
              <input
                id="pref-theatre"
                type="text"
                className="form-input"
                placeholder="e.g. PVR VR Chennai"
                list="theatre-list"
                {...register('theatre')}
              />
              <datalist id="theatre-list">
                {THEATRE_OPTIONS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            {/* Date & Max Price */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="pref-date">Date</label>
                <input id="pref-date" type="date" className="form-input" {...register('date')} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="pref-max-price">Max Budget (₹)</label>
                <input
                  id="pref-max-price"
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="250"
                  {...register('maxPrice', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Preferred Time Window */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="pref-start">Earliest Showtime</label>
                <input id="pref-start" type="time" className="form-input" {...register('startTime')} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="pref-end">Latest Showtime</label>
                <input id="pref-end" type="time" className="form-input" {...register('endTime')} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <button type="button" className="btn btn-secondary btn-full" onClick={handleCancelForm}>
                Cancel
              </button>
              <button id="save-pref-btn" type="submit" className="btn btn-primary btn-full">
                <Target size={16} /> {editingPrefId ? 'Update Preference' : 'Save Preference'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── ACTIVE PREFERENCES LIST ── */}
      {preferences.length > 0 && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
              Your Preferences ({activeCount} Active)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {preferences.map((pref) => (
              <div
                key={pref.id}
                className="card"
                style={{
                  border: pref.active ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid var(--color-border)',
                  opacity: pref.active ? 1 : 0.65,
                  padding: 'var(--space-3) var(--space-4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)' }}>
                        {pref.movie || 'Any Movie'}
                      </span>
                      <span className={`badge ${pref.active ? 'badge-verified' : 'badge-sold'}`} style={{ fontSize: '10px' }}>
                        {pref.active ? '● Active' : '○ Paused'}
                      </span>
                    </div>

                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                      {pref.theatre && <span>📍 {pref.theatre}</span>}
                      {pref.date && <span>📅 {pref.date}</span>}
                      {pref.maxPrice != null && <span>💰 Under ₹{pref.maxPrice}</span>}
                      {pref.startTime && <span>⏰ {pref.startTime} – {pref.endTime || 'Late'}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => togglePreferenceActive(pref.id)}
                      title={pref.active ? 'Pause matching' : 'Resume matching'}
                    >
                      {pref.active ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleStartEdit(pref)}
                      title="Edit preference"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => deletePreference(pref.id)}
                      title="Delete preference"
                      style={{ color: 'var(--color-error)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MATCH RESULTS SECTION ── */}
      <div style={{ marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          🎯 Recommended Matches
        </h2>
        {matches.length > 0 && (
          <span className="badge badge-hot" style={{ fontSize: '11px' }}>
            {matches.length} matching ticket{matches.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {preferences.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <h3 className="empty-state-title">No preferences set</h3>
          <p className="empty-state-subtitle">
            Tell us which movies, theatres, or budgets you're looking for, and we'll highlight matches automatically.
          </p>
          <button id="empty-add-pref" className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Match Preference
          </button>
        </div>
      ) : matches.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3 className="empty-state-title">No matching tickets right now</h3>
          <p className="empty-state-subtitle">
            Your preferences are active. The moment a matching ticket is listed by a student, it will appear here and trigger a notification.
          </p>
        </div>
      ) : (
        <div className="tickets-grid">
          {matches.map(({ listing, matchScore, matchedFields }) => (
            <div key={listing.id} style={{ position: 'relative' }}>
              {/* Match Explanation Banner */}
              <div
                style={{
                  background: matchScore >= 80 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(249, 115, 22, 0.1)',
                  border: `1px solid ${matchScore >= 80 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(249, 115, 22, 0.25)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '6px 12px',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 'var(--text-xs)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, color: matchScore >= 80 ? 'var(--color-success)' : 'var(--color-brand-primary)' }}>
                    🎯 {matchScore}% Match
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                    ({matchedFields.map((f) => `✓ ${f}`).join(' ')})
                  </span>
                </div>
                {matchScore >= 80 && (
                  <span className="badge badge-verified" style={{ fontSize: '9px', padding: '1px 4px' }}>
                    Top Pick
                  </span>
                )}
              </div>

              <TicketCard listing={listing} showMatchScore={matchScore} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
