import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Target, ArrowRight } from 'lucide-react';
import { useListingsStore } from '../../stores/listingsStore';
import TicketCard from '../../components/tickets/TicketCard';

const MOVIE_SUGGESTIONS = [
  'Coolie', 'F1: The Movie', 'Jurassic World', 'Avengers', 'Interstellar', 'Pushpa 3', 'Kalki',
];

const SORT_OPTIONS = [
  { value: 'urgency', label: '⚡ Starting Soon' },
  { value: 'price_asc', label: '💰 Lowest Price' },
  { value: 'recently_listed', label: '🆕 Recently Listed' },
];

const TIME_FILTERS = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'starting_soon', label: '🔥 Starting Soon' },
];

export default function FindPage() {
  const navigate = useNavigate();
  const { fetchListings, setFilters, getFilteredListings, isLoading, filters } = useListingsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [maxPriceInput, setMaxPriceInput] = useState<string>(filters.maxPrice ? String(filters.maxPrice) : '');

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    setFilters({ movie: q.trim() || undefined });
  };

  const handleTimeFilter = (val: string) => {
    const current = filters.timeRange;
    setFilters({ timeRange: current === val ? undefined : (val as typeof filters.timeRange) });
  };

  const handleSort = (val: string) => {
    setFilters({ sortBy: val as typeof filters.sortBy });
  };

  const applyMaxPrice = (priceVal: string) => {
    setMaxPriceInput(priceVal);
    const num = parseInt(priceVal, 10);
    setFilters({ maxPrice: !isNaN(num) && num > 0 ? num : undefined });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setMaxPriceInput('');
    setFilters({
      movie: undefined,
      theatre: undefined,
      date: undefined,
      timeRange: undefined,
      maxPrice: undefined,
      sortBy: 'urgency',
    });
    setShowFiltersModal(false);
  };

  const results = getFilteredListings();
  const hasActiveFilters = Boolean(filters.movie || filters.timeRange || filters.maxPrice || filters.sortBy !== 'urgency');

  return (
    <div className="page">
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h1 className="section-title" style={{ margin: 0 }}>
          🎟️ Find Tickets
        </h1>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
          {results.length} {results.length === 1 ? 'ticket' : 'tickets'} available
        </span>
      </div>

      {/* ── SEARCH BAR ── */}
      <div className="search-bar" style={{ marginBottom: 'var(--space-3)' }}>
        <Search size={18} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
        <input
          id="find-search-input"
          type="search"
          className="search-bar-input"
          placeholder="Search movie, theatre, or time..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          aria-label="Search tickets"
        />
        {searchQuery && (
          <button
            className="icon-btn"
            style={{ width: '28px', height: '28px', background: 'none', border: 'none' }}
            onClick={() => handleSearch('')}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
        <button
          id="find-filter-btn"
          className={`icon-btn ${hasActiveFilters ? 'active' : ''}`}
          style={{
            flexShrink: 0,
            background: hasActiveFilters ? 'rgba(249,115,22,0.15)' : undefined,
            color: hasActiveFilters ? 'var(--color-brand-primary)' : undefined,
          }}
          onClick={() => setShowFiltersModal(true)}
          aria-label="Toggle filters"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* ── QUICK SUGGESTION CHIPS ── */}
      {!searchQuery && (
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {MOVIE_SUGGESTIONS.map((m) => (
            <button
              key={m}
              className="chat-chip"
              onClick={() => handleSearch(m)}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* ── TIME FILTER PILLS ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-4)', overflowX: 'auto' }}>
        {TIME_FILTERS.map(({ value, label }) => {
          const isActive = filters.timeRange === value;
          return (
            <button
              key={value}
              id={`filter-pill-${value}`}
              className={`filter-pill ${isActive ? 'active' : ''}`}
              onClick={() => handleTimeFilter(value)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── FIND MY MATCH BANNER ── */}
      <div
        id="find-my-match-banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.12) 0%, rgba(249, 115, 22, 0.08) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-4)',
          cursor: 'pointer',
        }}
        onClick={() => navigate('/match')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(139, 92, 246, 0.2)',
              color: 'var(--color-brand-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Target size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)' }}>
              Looking for a specific movie or budget?
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              Set up auto-matching in <strong>Find My Match</strong>
            </div>
          </div>
        </div>
        <ArrowRight size={16} style={{ color: 'var(--color-brand-tertiary)' }} />
      </div>

      {/* ── TICKETS FEED ── */}
      {isLoading ? (
        <div className="tickets-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton skeleton-card" style={{ height: '200px' }} />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="tickets-grid">
          {results.map((listing) => (
            <TicketCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🎬</div>
          <h3 className="empty-state-title">No last-minute tickets found</h3>
          <p className="empty-state-subtitle">
            {hasActiveFilters
              ? 'Try adjusting your search query, price range, or time filter.'
              : 'Be the first to list a spare ticket for your college peers!'}
          </p>
          {hasActiveFilters && (
            <button
              id="clear-filters-btn"
              className="btn btn-secondary"
              onClick={clearAllFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* ── FILTER BOTTOM SHEET / MODAL ── */}
      {showFiltersModal && (
        <div className="modal-backdrop" onClick={() => setShowFiltersModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={18} style={{ color: 'var(--color-brand-primary)' }} />
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>Filters & Sort</h3>
              </div>
              <button className="icon-btn" onClick={() => setShowFiltersModal(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Sort Options */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <label className="form-label" style={{ marginBottom: '8px' }}>Sort By</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {SORT_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-lg)',
                      background: filters.sortBy === value ? 'rgba(249, 115, 22, 0.12)' : 'var(--color-surface-2)',
                      border: `1px solid ${filters.sortBy === value ? 'var(--color-brand-primary)' : 'var(--color-border)'}`,
                      color: filters.sortBy === value ? 'var(--color-brand-primary)' : 'var(--color-text-primary)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={() => handleSort(value)}
                  >
                    <span>{label}</span>
                    {filters.sortBy === value && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Price Filter */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <label className="form-label">Max Asking Price (₹)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="filter-max-price"
                  type="number"
                  className="form-input"
                  placeholder="e.g. 200"
                  value={maxPriceInput}
                  onChange={(e) => applyMaxPrice(e.target.value)}
                />
                {maxPriceInput && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => applyMaxPrice('')}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={clearAllFilters}
              >
                Reset All
              </button>
              <button
                type="button"
                className="btn btn-primary btn-full"
                onClick={() => setShowFiltersModal(false)}
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
