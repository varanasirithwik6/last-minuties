import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  MessageCircle,
  Share2,
  Shield,
  CheckCircle2,
  Edit2,
  XCircle,
  Clock3,
  Ban,
  Send,
  Flag,
} from 'lucide-react';
import { useListingsStore } from '../../stores/listingsStore';
import { useAuthStore } from '../../stores/authStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { DEMO_USER } from '../../lib/demoData';
import { formatTimeRemaining, getMinutesUntilShow, getUrgencyClass } from '../../lib/urgency';
import type { Listing } from '../../types';
import UserAvatar from '../../components/common/UserAvatar';
import SafetyBanner from '../../components/safety/SafetyBanner';
import ReportModal from '../../components/safety/ReportModal';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getListingById, markSold, cancelListing } = useListingsStore();
  const {
    getConnectionForListing,
    createRequest,
    fetchMyConnections,
  } = useConnectionStore();

  const [listing, setListing] = useState<Listing | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');

  const currentUser = user || (DEMO_USER as any);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setIsLoading(true);
      const found = await getListingById(id);
      if (found) setListing(found);
      setIsLoading(false);
    }
    load();
  }, [id, getListingById]);

  // Fetch connections when user is available
  useEffect(() => {
    if (currentUser?.id) {
      fetchMyConnections(currentUser.id);
    }
  }, [currentUser?.id, fetchMyConnections]);

  useEffect(() => {
    if (!listing) return;
    function update() {
      const mins = getMinutesUntilShow(listing!.date, listing!.showTime);
      setTimeLeft(formatTimeRemaining(mins));
    }
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [listing]);

  if (isLoading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 'var(--space-12)' }}>
        <div className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="page">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="empty-state">
          <div className="empty-state-icon">🎟️</div>
          <h3 className="empty-state-title">Ticket not found</h3>
          <p className="empty-state-subtitle">This listing may have been sold or expired.</p>
          <button className="btn btn-primary" onClick={() => navigate('/find')}>
            Browse Available Tickets
          </button>
        </div>
      </div>
    );
  }

  const isOwn = currentUser?.id === listing.sellerId;
  const isAvailable = listing.status === 'available' || listing.status === 'contacted';

  // Get existing connection state for this buyer+listing
  const existingConnection = listing.id
    ? getConnectionForListing(listing.id, currentUser?.id || '')
    : undefined;

  const showDate = new Date(`${listing.date}T${listing.showTime}:00`);
  const dateLabel =
    listing.date === new Date().toISOString().slice(0, 10)
      ? 'Today'
      : listing.date ===
        (() => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          return d.toISOString().slice(0, 10);
        })()
      ? 'Tomorrow'
      : listing.date;

  const timeLabel = showDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const discountPct =
    listing.originalPrice > 0
      ? Math.round(((listing.originalPrice - listing.askingPrice) / listing.originalPrice) * 100)
      : 0;

  // ── Contact handler ─────────────────────────────────────────
  const handleSendRequest = async () => {
    setContactLoading(true);
    setContactError('');

    const result = await createRequest(
      listing.id,
      currentUser.id,
      listing.sellerId,
      initialMessage.trim() || undefined
    );

    setContactLoading(false);
    setShowRequestModal(false);

    if (result.error) {
      setContactError(result.error);
    } else {
      await fetchMyConnections(currentUser.id);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${listing.movie} ticket — ₹${listing.askingPrice}`,
          text: `${listing.theatre} · ${dateLabel} ${timeLabel}\nSeats: ${listing.seats.join(', ')}`,
          url: window.location.href,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleQuickMarkSold = async () => {
    if (confirm('Mark this ticket as sold? All pending requests will be cancelled.')) {
      await markSold(listing.id);
      navigate('/activity');
    }
  };

  const handleQuickCancel = async () => {
    if (confirm('Cancel this ticket listing?')) {
      await cancelListing(listing.id);
      navigate('/activity');
    }
  };

  const seller = listing.seller || {
    id: listing.sellerId,
    name: 'Student Seller',
    college: 'Campus Verified',
    phoneVerified: true,
    collegeVerified: false,
    rating: 0,
    ratingCount: 0,
    connectionCount: 0,
  };

  // ── Contact Button rendering ────────────────────────────────
  const renderContactButton = () => {
    if (isOwn) {
      return (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            id="ticket-edit-btn"
            className="btn btn-secondary btn-full"
            onClick={() => navigate(`/sell/${listing.id}/edit`)}
          >
            <Edit2 size={16} /> Edit
          </button>
          {isAvailable && (
            <>
              <button
                id="ticket-sold-btn"
                className="btn btn-primary btn-full"
                onClick={handleQuickMarkSold}
              >
                <CheckCircle2 size={16} /> Sold
              </button>
              <button
                id="ticket-cancel-btn"
                className="btn btn-danger btn-sm"
                onClick={handleQuickCancel}
                title="Cancel Listing"
              >
                <XCircle size={16} />
              </button>
            </>
          )}
        </div>
      );
    }

    // Listing not available
    if (!isAvailable) {
      const statusMsg =
        listing.status === 'sold'
          ? '🎫 This ticket has been sold'
          : listing.status === 'cancelled'
          ? '✕ This listing was cancelled'
          : '⏰ This listing has expired';
      return (
        <button className="btn btn-secondary btn-full btn-lg" disabled>
          <Ban size={18} /> {statusMsg}
        </button>
      );
    }

    // Existing connection states
    if (existingConnection) {
      if (existingConnection.status === 'pending') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <button className="btn btn-secondary btn-full btn-lg" disabled>
              <Clock3 size={18} /> Request Pending — Waiting for Seller
            </button>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
              The seller will accept or decline your request.
            </p>
          </div>
        );
      }

      if (existingConnection.status === 'accepted') {
        return (
          <button
            id="ticket-open-chat-btn"
            className="btn btn-primary btn-full btn-lg"
            onClick={() => navigate(`/chat/${existingConnection.id}`)}
          >
            <MessageCircle size={18} /> Open Chat — You're Connected!
          </button>
        );
      }

      if (existingConnection.status === 'declined') {
        return (
          <button className="btn btn-secondary btn-full btn-lg" disabled>
            <XCircle size={18} /> Request Declined
          </button>
        );
      }

      if (existingConnection.status === 'cancelled') {
        return (
          <button className="btn btn-secondary btn-full btn-lg" disabled>
            <Ban size={18} /> Request Cancelled
          </button>
        );
      }

      if (existingConnection.status === 'completed') {
        return (
          <button className="btn btn-secondary btn-full btn-lg" disabled>
            <CheckCircle2 size={18} /> Connection Completed
          </button>
        );
      }
    }

    // No connection yet — show Contact Seller
    return (
      <div>
        {contactError && (
          <div className="form-error-banner" style={{ marginBottom: 'var(--space-3)' }}>
            {contactError}
          </div>
        )}
        <button
          id="ticket-contact-seller-btn"
          className="btn btn-primary btn-full btn-lg"
          onClick={() => setShowRequestModal(true)}
          disabled={contactLoading}
        >
          {contactLoading ? (
            <span className="spinner" />
          ) : (
            <>
              <MessageCircle size={18} /> Contact Seller
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="page" style={{ paddingBottom: 'var(--space-12)' }}>
      {/* ── TOP NAV ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <button id="ticket-back-btn" className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="icon-btn" onClick={handleShare} aria-label="Share ticket">
            <Share2 size={18} />
          </button>
          {!isOwn && (
            <button
              id="report-ticket-btn"
              className="icon-btn"
              onClick={() => setShowReportModal(true)}
              title="Report this listing"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <Flag size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ── STATUS BANNER ── */}
      {!isAvailable && (
        <div
          style={{
            background: listing.status === 'sold' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${listing.status === 'sold' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-3) var(--space-4)',
            marginBottom: 'var(--space-4)',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: 'var(--text-sm)',
            color: listing.status === 'sold' ? 'var(--color-success)' : 'var(--color-error)',
          }}
        >
          {listing.status === 'sold' ? '✓ THIS TICKET HAS BEEN SOLD' : '✕ THIS LISTING IS NO LONGER ACTIVE'}
        </div>
      )}

      {/* ── MAIN TICKET CARD ── */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(17,24,39,0.98))',
          border: '1.5px solid rgba(249,115,22,0.3)',
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-4)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {/* Urgency Pill */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <span className={`badge ${getUrgencyClass(listing.urgencyLevel)}`}>
            🔥 {timeLeft || `${dateLabel} ${timeLabel}`}
          </span>
          <span className="badge badge-verified">
            <Shield size={11} /> Campus Protected
          </span>
        </div>

        {/* Movie Title */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.75rem, 6vw, 2.5rem)',
            fontWeight: 900,
            lineHeight: 1.1,
            color: '#fff',
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}
        >
          {listing.movie}
        </h1>

        {/* Theatre & Showtime */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={15} style={{ color: 'var(--color-brand-primary)' }} />
            {listing.theatre}
          </span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={15} /> {dateLabel}
          </span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={15} /> {timeLabel}
          </span>
        </div>

        {/* Seat Breakdown */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-4)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Seat Number(s)</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: '#fff', marginTop: '2px' }}>
              {listing.seats.join(', ').toUpperCase()}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Quantity</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 900, color: '#fff', marginTop: '2px' }}>
              {listing.quantity} {listing.quantity === 1 ? 'Ticket' : 'Tickets'}
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px dashed var(--color-border)', paddingTop: 'var(--space-4)' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>Original Ticket Price</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', textDecoration: 'line-through' }}>
              ₹{listing.originalPrice}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
              {discountPct > 0 && (
                <span className="badge badge-hot" style={{ fontSize: '10px', padding: '1px 6px' }}>
                  {discountPct}% OFF
                </span>
              )}
              <span style={{ fontSize: '11px', color: 'var(--color-brand-primary)', fontWeight: 600 }}>Asking Price</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', fontWeight: 900, color: '#fff' }}>
              ₹{listing.askingPrice}
            </div>
          </div>
        </div>
      </div>

      {/* ── SELLER TRUST CARD ── */}
      <div className="card" style={{ marginBottom: 'var(--space-4)', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <h3 style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
            🛡️ Seller Trust Profile
          </h3>
          <span className="badge badge-soon" style={{ fontSize: '10px' }}>Campus Member</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <UserAvatar user={seller as any} size="lg" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-text-primary)' }}>
                {isOwn ? 'You (Seller)' : seller.name}
              </span>
              {isOwn && <span className="badge badge-soon" style={{ fontSize: '10px' }}>Your Listing</span>}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              {seller.college}
            </div>
          </div>
        </div>

        {/* Reputation & Badges Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            background: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 8px',
            marginBottom: 'var(--space-3)',
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {seller.ratingCount > 0 ? `⭐ ${seller.rating.toFixed(1)}` : 'New member'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
              {seller.ratingCount > 0 ? `${seller.ratingCount} ratings` : 'Reputation'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {seller.connectionCount || 0}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>Connections</div>
          </div>

          <div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--color-success)' }}>
              ✓ Verified
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>Phone OTP</div>
          </div>
        </div>

        {/* Verification Badges */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {seller.phoneVerified && (
            <span className="badge badge-verified" style={{ fontSize: '10px' }}>
              <CheckCircle2 size={10} /> Phone Verified
            </span>
          )}
          {seller.collegeVerified ? (
            <span className="badge badge-verified" style={{ fontSize: '10px' }}>
              <CheckCircle2 size={10} /> College ID Verified
            </span>
          ) : (
            <span className="badge badge-pending" style={{ fontSize: '10px' }}>
              ⏳ College ID Pending
            </span>
          )}
        </div>

        {/* Trust disclaimer */}
        <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>
          * Verification and reputation metrics are informational community signals and do not guarantee ticket authenticity.
        </div>
      </div>

      {/* ── SAFETY BANNER ── */}
      <SafetyBanner style={{ marginBottom: 'var(--space-5)' }} />

      {/* ── ACTION BUTTONS ── */}
      {renderContactButton()}

      {/* ── REQUEST MODAL ── */}
      {showRequestModal && (
        <div className="modal-backdrop" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
              Contact Seller
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.45 }}>
              Send a request to <strong>{seller.name}</strong> for <strong>{listing.movie}</strong> ({dateLabel} {timeLabel} · ₹{listing.askingPrice}).
            </p>

            {/* Optional initial message */}
            <label className="form-label">Message (optional)</label>
            <textarea
              id="request-message-input"
              className="form-input"
              placeholder={`Hi, I'm interested in your ${listing.movie} ticket!`}
              rows={3}
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              style={{ resize: 'none', marginBottom: 'var(--space-4)' }}
            />

            {/* Privacy reminder */}
            <div
              style={{
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-4)',
              }}
            >
              🔒 Phone numbers are never shared. The seller will only see your name, college, and verification badges.
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={() => setShowRequestModal(false)}
                disabled={contactLoading}
              >
                Cancel
              </button>
              <button
                id="send-request-btn"
                type="button"
                className="btn btn-primary btn-full"
                onClick={handleSendRequest}
                disabled={contactLoading}
              >
                {contactLoading ? <span className="spinner" /> : <><Send size={16} /> Send Request</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REPORT MODAL ── */}
      <ReportModal
        reporterId={currentUser?.id || ''}
        targetType="listing"
        listingId={listing.id}
        listingTitle={`${listing.movie} (${listing.theatre})`}
        reportedUserId={seller.id}
        reportedUserName={seller.name}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </div>
  );
}
