import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Check,
  X,
  Clock3,
  ArrowRight,
  Inbox,
  Send,
  MapPin,
  Calendar,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useConnectionStore } from '../../stores/connectionStore';
import type { ConnectionRequest, ConnectionStatus } from '../../types';
import UserAvatar from '../../components/common/UserAvatar';

type RequestTab = 'incoming' | 'outgoing' | 'active';

// ── Status display helper ─────────────────────────────────
function StatusPill({ status }: { status: ConnectionStatus }) {
  const config: Record<ConnectionStatus, { label: string; cls: string }> = {
    pending: { label: '⏳ Pending', cls: 'badge-hot' },
    accepted: { label: '✓ Connected', cls: 'badge-verified' },
    declined: { label: '✕ Declined', cls: 'badge-sold' },
    cancelled: { label: '✕ Cancelled', cls: 'badge-sold' },
    completed: { label: '✓ Completed', cls: 'badge-verified' },
  };
  const c = config[status] || config.pending;
  return <span className={`badge ${c.cls}`}>{c.label}</span>;
}

// ── Request Card ─────────────────────────────────────────
function RequestCard({
  request,
  viewAs,
  onAccept,
  onDecline,
  onOpenChat,
  actionLoading,
}: {
  request: ConnectionRequest;
  viewAs: 'seller' | 'buyer';
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onOpenChat?: (id: string) => void;
  actionLoading: string | null;
}) {
  const listing = request.listing;
  const peer = viewAs === 'seller' ? request.buyer : request.seller;
  const isActioning = actionLoading === request.id;

  const showDate = listing
    ? new Date(`${listing.date}T${listing.showTime}:00`).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  const dateLabel = listing?.date === new Date().toISOString().slice(0, 10) ? 'Today' : listing?.date || '';

  return (
    <div className="card" style={{ border: '1px solid var(--color-border)', marginBottom: 'var(--space-3)' }}>
      {/* Ticket Info */}
      {listing && (
        <div
          style={{
            background: 'rgba(249,115,22,0.06)',
            border: '1px solid rgba(249,115,22,0.15)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-3)',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            {listing.movie}
          </div>
          <div style={{ display: 'flex', gap: '10px', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <MapPin size={11} style={{ color: 'var(--color-brand-primary)' }} />
              {listing.theatre}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Calendar size={11} /> {dateLabel}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={11} /> {showDate}
            </span>
            <span style={{ fontWeight: 700, color: 'var(--color-brand-primary)' }}>₹{listing.askingPrice}</span>
          </div>
        </div>
      )}

      {/* Peer Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        {peer ? (
          <>
            <UserAvatar user={peer as any} size="md" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                {peer.name || 'Student'}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                {peer.college}
              </div>
              {/* Privacy-safe verification badges — NEVER show phone */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                {peer.phoneVerified && (
                  <span className="badge badge-verified" style={{ fontSize: '10px', padding: '1px 6px' }}>
                    ✓ Phone
                  </span>
                )}
                {peer.collegeVerified && (
                  <span className="badge badge-verified" style={{ fontSize: '10px', padding: '1px 6px' }}>
                    ✓ College
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
            {viewAs === 'seller' ? 'Interested student' : 'Seller'}
          </span>
        )}
        <StatusPill status={request.status} />
      </div>

      {/* Initial message (if any) */}
      {request.initialMessage && (
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            fontStyle: 'italic',
            background: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2) var(--space-3)',
            marginBottom: 'var(--space-3)',
          }}
        >
          "{request.initialMessage}"
        </div>
      )}

      {/* Action Row */}
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {/* Seller actions on PENDING requests */}
        {viewAs === 'seller' && request.status === 'pending' && (
          <>
            <button
              id={`decline-${request.id}`}
              className="btn btn-secondary btn-sm btn-full"
              onClick={() => onDecline?.(request.id)}
              disabled={isActioning}
              style={{ color: 'var(--color-error)' }}
            >
              <X size={14} /> Decline
            </button>
            <button
              id={`accept-${request.id}`}
              className="btn btn-primary btn-sm btn-full"
              onClick={() => onAccept?.(request.id)}
              disabled={isActioning}
            >
              {isActioning ? <span className="spinner" /> : <><Check size={14} /> Accept</>}
            </button>
          </>
        )}

        {/* Open chat for ACCEPTED connections */}
        {request.status === 'accepted' && (
          <button
            id={`chat-${request.id}`}
            className="btn btn-primary btn-sm btn-full"
            onClick={() => onOpenChat?.(request.id)}
          >
            <MessageCircle size={14} /> Open Chat <ArrowRight size={14} />
          </button>
        )}

        {/* Buyer: view ticket for non-accepted states */}
        {viewAs === 'buyer' && request.status === 'pending' && request.listingId && (
          <button
            className="btn btn-ghost btn-sm btn-full"
            onClick={() => onOpenChat?.(request.id)}
          >
            <Clock3 size={14} /> Waiting for Seller
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function RequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    incomingRequests,
    outgoingRequests,
    activeConnections,
    fetchMyConnections,
    acceptRequest,
    declineRequest,
    isLoading,
  } = useConnectionStore();

  const [activeTab, setActiveTab] = useState<RequestTab>('incoming');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchMyConnections(user.id);
    }
  }, [user?.id, fetchMyConnections]);

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    setActionError('');
    const result = await acceptRequest(id);
    setActionLoading(null);
    if (result.error) setActionError(result.error);
    else if (user?.id) fetchMyConnections(user.id);
  };

  const handleDecline = async (id: string) => {
    setActionLoading(id);
    setActionError('');
    const result = await declineRequest(id);
    setActionLoading(null);
    if (result.error) setActionError(result.error);
    else if (user?.id) fetchMyConnections(user.id);
  };

  const handleOpenChat = (id: string) => {
    navigate(`/chat/${id}`);
  };

  const tabs: { id: RequestTab; label: string; count: number; icon: React.ReactNode }[] = [
    { id: 'incoming', label: 'Requests', count: incomingRequests.length, icon: <Inbox size={14} /> },
    { id: 'outgoing', label: 'Sent', count: outgoingRequests.length, icon: <Send size={14} /> },
    { id: 'active', label: 'Chats', count: activeConnections.length, icon: <MessageCircle size={14} /> },
  ];

  const currentItems = {
    incoming: incomingRequests,
    outgoing: outgoingRequests,
    active: activeConnections,
  }[activeTab];

  return (
    <div className="page">
      {/* ── HEADER ── */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h1 className="section-title" style={{ marginBottom: '4px' }}>
          🤝 Connections
        </h1>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
          Manage requests from interested buyers and your own ticket requests.
        </p>
      </div>

      {/* ── TABS ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '4px',
          background: 'var(--color-surface-2)',
          padding: '4px',
          borderRadius: 'var(--radius-xl)',
          marginBottom: 'var(--space-5)',
        }}
      >
        {tabs.map(({ id, label, count, icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              id={`requests-tab-${id}`}
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
              onClick={() => setActiveTab(id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {icon}
                <span>{label}</span>
              </div>
              <span style={{ fontSize: '10px', opacity: 0.7 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {actionError && (
        <div className="form-error-banner" style={{ marginBottom: 'var(--space-4)' }}>
          {actionError}
        </div>
      )}

      {/* ── PRIVACY NOTICE ── */}
      <div
        style={{
          background: 'rgba(6, 182, 212, 0.06)',
          border: '1px solid rgba(6, 182, 212, 0.15)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-3) var(--space-4)',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--space-4)',
        }}
      >
        🔒 Phone numbers are never visible. Only verified names and college info are shared between connected students.
      </div>

      {/* ── CONTENT ── */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12) 0' }}>
          <div className="spinner" style={{ width: '32px', height: '32px' }} />
        </div>
      ) : currentItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            {activeTab === 'incoming' ? '📬' : activeTab === 'outgoing' ? '📤' : '💬'}
          </div>
          <h3 className="empty-state-title">
            {activeTab === 'incoming'
              ? 'No connection requests yet'
              : activeTab === 'outgoing'
              ? 'No sent requests'
              : 'No active chats'}
          </h3>
          <p className="empty-state-subtitle">
            {activeTab === 'incoming'
              ? 'When students contact you about your listings, requests will appear here.'
              : activeTab === 'outgoing'
              ? 'Find a ticket and tap "Contact Seller" to send a request.'
              : 'Accepted connections with open chats will appear here.'}
          </p>
          {activeTab !== 'incoming' && (
            <button className="btn btn-primary" onClick={() => navigate('/find')}>
              Find Tickets
            </button>
          )}
          {activeTab === 'incoming' && (
            <button className="btn btn-primary" onClick={() => navigate('/sell')}>
              List a Ticket
            </button>
          )}
        </div>
      ) : (
        <div>
          {activeTab === 'incoming' && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-3)' }}>
              {incomingRequests.length} student{incomingRequests.length !== 1 ? 's' : ''} interested in your listings
            </p>
          )}
          {currentItems.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              viewAs={activeTab === 'incoming' ? 'seller' : 'buyer'}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onOpenChat={handleOpenChat}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
