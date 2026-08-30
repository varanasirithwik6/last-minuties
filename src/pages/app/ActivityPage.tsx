import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  CheckCircle,
  XCircle,
  Edit2,
  AlertTriangle,
  MapPin,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useListingsStore } from '../../stores/listingsStore';
import { useConnectionStore } from '../../stores/connectionStore';
import type { ListingStatus } from '../../types';
import { getMinutesUntilShow, formatTimeRemaining } from '../../lib/urgency';

type ListingTab = 'active' | 'sold' | 'expired' | 'cancelled';

function StatusBadge({ status }: { status: ListingStatus }) {
  const config = {
    available: { class: 'badge-available', label: '🟢 Active' },
    contacted: { class: 'badge-hot', label: '📬 In Negotiation' },
    sold: { class: 'badge-verified', label: '✓ Sold' },
    expired: { class: 'badge-sold', label: '⏰ Expired' },
    cancelled: { class: 'badge-sold', label: '✕ Cancelled' },
  }[status] || { class: 'badge-available', label: status };
  return <span className={`badge ${config.class}`}>{config.label}</span>;
}

export default function ActivityPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { myListings, fetchMyListings, markSold, cancelListing, isLoading } = useListingsStore();
  const { incomingRequests, fetchMyConnections } = useConnectionStore();
  const [selectedTab, setSelectedTab] = useState<ListingTab>('active');

  // Confirmation Modals
  const [soldTargetId, setSoldTargetId] = useState<string | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchMyListings(user.id);
      fetchMyConnections(user.id);
    }
  }, [user?.id, fetchMyListings, fetchMyConnections]);

  // Group listings by status
  const activeListings = myListings.filter(
    (l) => (l.status === 'available' || l.status === 'contacted') && new Date(l.expiresAt) > new Date()
  );
  const soldListings = myListings.filter((l) => l.status === 'sold');
  const expiredListings = myListings.filter(
    (l) => l.status === 'expired' || ((l.status === 'available' || l.status === 'contacted') && new Date(l.expiresAt) <= new Date())
  );
  const cancelledListings = myListings.filter((l) => l.status === 'cancelled');

  const currentTabListings = {
    active: activeListings,
    sold: soldListings,
    expired: expiredListings,
    cancelled: cancelledListings,
  }[selectedTab];

  const handleConfirmSold = async () => {
    if (!soldTargetId) return;
    setActionLoading(true);
    await markSold(soldTargetId);
    if (user?.id) await fetchMyListings(user.id);
    setActionLoading(false);
    setSoldTargetId(null);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetId) return;
    setActionLoading(true);
    await cancelListing(cancelTargetId);
    if (user?.id) await fetchMyListings(user.id);
    setActionLoading(false);
    setCancelTargetId(null);
  };

  return (
    <div className="page">
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h1 className="section-title" style={{ margin: 0 }}>
          📊 My Activity
        </h1>
        <button
          id="activity-sell-btn"
          className="btn btn-primary btn-sm"
          onClick={() => navigate('/sell')}
        >
          <Plus size={16} /> List Ticket
        </button>
      </div>

      {/* ── QUICK LINK: REQUESTS ── */}
      {incomingRequests.length > 0 && (
        <div
          id="activity-requests-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(249, 115, 22, 0.1)',
            border: '1px solid rgba(249, 115, 22, 0.25)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-4)',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/requests')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'rgba(249, 115, 22, 0.2)',
                color: 'var(--color-brand-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <MessageCircle size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                {incomingRequests.length} pending ticket request{incomingRequests.length !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                Students interested in your listings
              </div>
            </div>
          </div>
          <ArrowRight size={18} style={{ color: 'var(--color-brand-primary)' }} />
        </div>
      )}

      {/* ── STATUS TABS ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '4px',
          background: 'var(--color-surface-2)',
          padding: '4px',
          borderRadius: 'var(--radius-xl)',
          marginBottom: 'var(--space-4)',
        }}
      >
        {[
          { id: 'active', label: 'Active', count: activeListings.length },
          { id: 'sold', label: 'Sold', count: soldListings.length },
          { id: 'expired', label: 'Expired', count: expiredListings.length },
          { id: 'cancelled', label: 'Cancelled', count: cancelledListings.length },
        ].map(({ id, label, count }) => {
          const isActive = selectedTab === id;
          return (
            <button
              key={id}
              id={`activity-tab-${id}`}
              type="button"
              style={{
                padding: '8px 4px',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                background: isActive ? 'var(--color-surface)' : 'transparent',
                color: isActive ? 'var(--color-brand-primary)' : 'var(--color-text-tertiary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              }}
              onClick={() => setSelectedTab(id as ListingTab)}
            >
              <span>{label}</span>
              <span style={{ fontSize: '10px', opacity: 0.8 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* ── LISTINGS FEED ── */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12) 0' }}>
          <div className="spinner" style={{ width: '32px', height: '32px' }} />
        </div>
      ) : currentTabListings.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {currentTabListings.map((listing) => {
            const minsLeft = getMinutesUntilShow(listing.date, listing.showTime);
            const timeRemaining = formatTimeRemaining(minsLeft);

            return (
              <div key={listing.id} className="card" style={{ border: '1px solid var(--color-border)' }}>
                {/* Header: Movie & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                  <div>
                    <h3
                      style={{
                        fontSize: 'var(--text-lg)',
                        fontWeight: 800,
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                      }}
                      onClick={() => navigate(`/ticket/${listing.id}`)}
                    >
                      {listing.movie}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      <MapPin size={12} style={{ color: 'var(--color-brand-primary)' }} />
                      <span>{listing.theatre}</span>
                    </div>
                  </div>
                  <StatusBadge status={listing.status} />
                </div>

                {/* Show Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <span>📅 {listing.date}</span>
                  <span>⏰ {listing.showTime}</span>
                  <span>💺 Seat: <strong>{listing.seats.join(', ')}</strong></span>
                  {selectedTab === 'active' && (
                    <span style={{ color: 'var(--color-brand-primary)', fontWeight: 600 }}>
                      🔥 {timeRemaining}
                    </span>
                  )}
                </div>

                {/* Price & Action Footer */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--color-border-subtle)',
                    paddingTop: 'var(--space-3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      ₹{listing.askingPrice}
                    </span>
                    {listing.originalPrice > listing.askingPrice && (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textDecoration: 'line-through' }}>
                        ₹{listing.originalPrice}
                      </span>
                    )}
                  </div>

                  {/* Actions for Active / Contacted */}
                  {selectedTab === 'active' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        id={`edit-listing-${listing.id}`}
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate(`/sell/${listing.id}/edit`)}
                        title="Edit Listing"
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button
                        id={`mark-sold-${listing.id}`}
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSoldTargetId(listing.id)}
                        title="Mark as Sold"
                      >
                        <CheckCircle size={14} /> Sold
                      </button>
                      <button
                        id={`cancel-listing-${listing.id}`}
                        className="btn btn-danger btn-sm"
                        onClick={() => setCancelTargetId(listing.id)}
                        title="Cancel Listing"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  )}

                  {selectedTab === 'sold' && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 700 }}>
                      ✓ SOLD TO PEER
                    </span>
                  )}

                  {selectedTab === 'expired' && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>
                      EXPIRED (Show Passed)
                    </span>
                  )}

                  {selectedTab === 'cancelled' && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', fontWeight: 600 }}>
                      CANCELLED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🎟️</div>
          <h3 className="empty-state-title">No {selectedTab} listings</h3>
          <p className="empty-state-subtitle">
            {selectedTab === 'active'
              ? "You don't have any active ticket listings right now."
              : `No tickets currently in the ${selectedTab} status.`}
          </p>
          {selectedTab === 'active' && (
            <button className="btn btn-primary" onClick={() => navigate('/sell')}>
              <Plus size={16} /> List a Ticket
            </button>
          )}
        </div>
      )}

      {/* ── CONFIRM MARK AS SOLD MODAL ── */}
      {soldTargetId && (
        <div className="modal-backdrop" onClick={() => setSoldTargetId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: 'var(--color-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-3)',
                }}
              >
                <CheckCircle size={28} />
              </div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, marginBottom: '6px' }}>
                Have you found a buyer?
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                Marking this ticket as sold will immediately remove it from active search so other students won't contact you.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={() => setSoldTargetId(null)}
                disabled={actionLoading}
              >
                Not Yet
              </button>
              <button
                id="confirm-sold-btn"
                type="button"
                className="btn btn-primary btn-full"
                onClick={handleConfirmSold}
                disabled={actionLoading}
              >
                {actionLoading ? <span className="spinner" /> : 'Mark as Sold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM CANCEL LISTING MODAL ── */}
      {cancelTargetId && (
        <div className="modal-backdrop" onClick={() => setCancelTargetId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: 'var(--color-error)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-3)',
                }}
              >
                <AlertTriangle size={28} />
              </div>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, marginBottom: '6px' }}>
                Cancel this listing?
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
                This will delist your ticket from the marketplace. You can always post a new listing later.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={() => setCancelTargetId(null)}
                disabled={actionLoading}
              >
                Keep Listing
              </button>
              <button
                id="confirm-cancel-btn"
                type="button"
                className="btn btn-danger btn-full"
                onClick={handleConfirmCancel}
                disabled={actionLoading}
              >
                {actionLoading ? <span className="spinner" /> : 'Cancel Ticket Listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
