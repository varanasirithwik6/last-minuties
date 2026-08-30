import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Zap, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useListingsStore } from '../../stores/listingsStore';
import { useMatchPreferenceStore } from '../../stores/matchPreferenceStore';
import { matchListings } from '../../lib/urgency';
import TicketCard from '../../components/tickets/TicketCard';
import { DEMO_MODE } from '../../lib/supabase';

function SkeletonCard() {
  return (
    <div
      className="skeleton skeleton-card"
      style={{ height: '200px', borderRadius: 'var(--radius-xl)' }}
    />
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { listings, isLoading, fetchListings } = useListingsStore();
  const { preferences, fetchPreferences } = useMatchPreferenceStore();
  const [hideDemoBanner, setHideDemoBanner] = useState(() => {
    return sessionStorage.getItem('dismiss_demo_banner') === 'true';
  });

  const handleDismissBanner = () => {
    setHideDemoBanner(true);
    sessionStorage.setItem('dismiss_demo_banner', 'true');
  };

  useEffect(() => {
    fetchListings();
    if (user?.id) {
      fetchPreferences(user.id);
    }
  }, [fetchListings, fetchPreferences, user?.id]);

  // Active available listings
  const availableListings = useMemo(() => {
    return listings.filter((l) => l.status === 'available');
  }, [listings]);

  // 1. Matches for You (computed from user preferences)
  const matchedListings = useMemo(() => {
    if (preferences.length === 0 || availableListings.length === 0) return [];
    return matchListings(preferences, availableListings).slice(0, 4);
  }, [preferences, availableListings]);

  // 2. Happening Soon (Urgent + Hot)
  const urgentListings = useMemo(() => {
    return availableListings
      .filter((l) => l.urgencyLevel === 'urgent' || l.urgencyLevel === 'hot')
      .sort((a, b) => b.urgencyScore - a.urgencyScore);
  }, [availableListings]);

  // 3. Just Posted (Newest listings by createdAt)
  const justPostedListings = useMemo(() => {
    return [...availableListings]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [availableListings]);

  // 4. Under Budget (<= ₹200)
  const budgetListings = useMemo(() => {
    return availableListings
      .filter((l) => l.askingPrice <= 200)
      .sort((a, b) => a.askingPrice - b.askingPrice)
      .slice(0, 4);
  }, [availableListings]);

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="page">
      {/* Demo mode indicator */}
      {DEMO_MODE && !hideDemoBanner && (
        <div
          style={{
            background: 'rgba(249, 115, 22, 0.08)',
            border: '1px solid rgba(249, 115, 22, 0.2)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-brand-primary)',
            marginBottom: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <span>🎭 Demo Mode — showing sample data. Configure Supabase to go live.</span>
          <button
            onClick={handleDismissBanner}
            style={{
              color: 'var(--color-brand-primary)',
              background: 'none',
              border: 'none',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              opacity: 0.8,
            }}
            title="Dismiss"
            aria-label="Dismiss banner"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Hero */}
      <div className="hero" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <div className="hero-eyebrow">
          <Zap size={14} fill="currentColor" /> Last-Minute Tickets
        </div>
        <h1 className="hero-title">
          Plans changed?
          <br />
          <span>Find your ticket.</span>
        </h1>
        <p className="hero-subtitle">
          Hey {firstName}! Discover last-minute movie tickets from your college community.
        </p>
        <div className="hero-actions">
          <button
            id="home-find-tickets"
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/find')}
          >
            <Search size={18} />
            Find Tickets
          </button>
          <button
            id="home-sell-ticket"
            className="btn btn-secondary btn-lg"
            onClick={() => navigate('/sell')}
          >
            <Plus size={18} />
            Sell a Ticket
          </button>
        </div>
      </div>

      {/* ── SECTION 1: MATCHES FOR YOU (if preferences set) ── */}
      {matchedListings.length > 0 && (
        <section style={{ marginBottom: 'var(--space-6)' }} aria-label="Personalized ticket matches">
          <div className="section-title">
            🎯 Matches For You
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--color-brand-tertiary)' }}
              onClick={() => navigate('/match')}
            >
              Edit Preferences →
            </button>
          </div>
          <div className="tickets-grid">
            {matchedListings.map(({ listing, matchScore }) => (
              <TicketCard key={listing.id} listing={listing} showMatchScore={matchScore} />
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 2: HAPPENING SOON / URGENT ── */}
      {(isLoading || urgentListings.length > 0) && (
        <section style={{ marginBottom: 'var(--space-6)' }} aria-label="Urgent listings">
          <div className="section-title">
            🔥 Happening Soon
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-medium)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              {urgentListings.length} tickets
            </span>
          </div>
          <div className="tickets-grid">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
              : urgentListings.map((l) => <TicketCard key={l.id} listing={l} />)}
          </div>
        </section>
      )}

      {/* ── SECTION 3: JUST POSTED ── */}
      {!isLoading && justPostedListings.length > 0 && (
        <section style={{ marginBottom: 'var(--space-6)' }} aria-label="Recently posted tickets">
          <div className="section-title">
            🆕 Just Posted
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              Fresh listings
            </span>
          </div>
          <div className="tickets-grid">
            {justPostedListings.map((l) => (
              <TicketCard key={`new-${l.id}`} listing={l} />
            ))}
          </div>
        </section>
      )}

      {/* ── SECTION 4: UNDER ₹200 BUDGET ── */}
      {!isLoading && budgetListings.length > 0 && (
        <section style={{ marginBottom: 'var(--space-6)' }} aria-label="Budget friendly tickets">
          <div className="section-title">
            💸 Under ₹200 Deals
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              Budget friendly
            </span>
          </div>
          <div className="tickets-grid">
            {budgetListings.map((l) => (
              <TicketCard key={`budget-${l.id}`} listing={l} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!isLoading && availableListings.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🎟️</div>
          <h3 className="empty-state-title">No tickets available right now</h3>
          <p className="empty-state-subtitle">
            Be the first to list a spare ticket for your college peers!
          </p>
          <button
            id="empty-sell-btn"
            className="btn btn-primary"
            onClick={() => navigate('/sell')}
          >
            <Plus size={18} /> Sell a Ticket
          </button>
        </div>
      )}

      {/* Browse more CTA */}
      {!isLoading && availableListings.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
          <button
            id="home-browse-all"
            className="btn btn-outline"
            onClick={() => navigate('/find')}
          >
            <Search size={16} /> Browse All Tickets ({availableListings.length})
          </button>
        </div>
      )}
    </div>
  );
}
