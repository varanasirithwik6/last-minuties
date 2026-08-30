import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Send,
  Shield,
  Lock,
  CheckCircle2,
  Tag,
  MapPin,
  Clock,
  Key,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Check,
  Ban,
  Trash2,
  Flag,
  Star,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useListingsStore } from '../../stores/listingsStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { useSafetyStore } from '../../stores/safetyStore';
import { DEMO_LISTINGS } from '../../lib/demoData';
import { scanForPII } from '../../lib/crypto';
import UserAvatar from '../../components/common/UserAvatar';
import SafetyBanner from '../../components/safety/SafetyBanner';
import RatingModal from '../../components/safety/RatingModal';
import ReportModal from '../../components/safety/ReportModal';
import type { Message } from '../../types';

function formatMsgTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export default function ChatPage() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { listings } = useListingsStore();
  const {
    getConnection,
    fetchMessages,
    sendMessage,
    sendDealOffer,
    respondToDealOffer,
    markAsRead,
    isTyping,
    getSecurityFingerprint,
    privacySettings,
    setPrivacySetting,
    blockUser,
    clearChatHistory,
  } = useChatStore();

  const { blockUser: blockUserStore } = useSafetyStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    type: 'user' | 'message';
    messageId?: string;
    messageText?: string;
  }>({ type: 'user' });
  const [offerPriceInput, setOfferPriceInput] = useState('');
  const [isTicketSummaryExpanded, setIsTicketSummaryExpanded] = useState(true);
  const [securityFingerprint, setSecurityFingerprint] = useState('Loading...');
  const [isFingerprintVerified, setIsFingerprintVerified] = useState(false);
  const [piiWarning, setPiiWarning] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Look up connection from chatStore first, then connectionStore
  const chatStoreConnection = connectionId ? getConnection(connectionId) : undefined;
  const { activeConnections, incomingRequests, outgoingRequests, fetchMyConnections } = useConnectionStore();
  const allConnections = [...activeConnections, ...incomingRequests, ...outgoingRequests];
  const connStoreEntry = allConnections.find((c) => c.id === connectionId);

  // Merge: chat store connection (has crypto metadata) OR connection store entry
  const connection = chatStoreConnection || (connStoreEntry ? {
    id: connStoreEntry.id,
    listingId: connStoreEntry.listingId,
    listing: connStoreEntry.listing as any,
    buyerId: connStoreEntry.buyerId,
    buyer: connStoreEntry.buyer,
    sellerId: connStoreEntry.sellerId,
    seller: connStoreEntry.seller,
    status: connStoreEntry.status,
    createdAt: connStoreEntry.createdAt,
    unreadCount: connStoreEntry.unreadCount || 0,
  } : undefined);

  // Fetch connections from connectionStore if not in chatStore
  useEffect(() => {
    if (!chatStoreConnection && user?.id) {
      fetchMyConnections(user.id);
    }
  }, [chatStoreConnection, user?.id, fetchMyConnections]);

  // Find linked listing
  const linkedListing = connection
    ? (connection.listing ||
        listings.find((l) => l.id === connection.listingId) ||
        DEMO_LISTINGS.find((l) => l.id === connection.listingId))
    : undefined;

  const otherUser = connection
    ? connection.buyerId === user?.id
      ? connection.seller
      : connection.buyer
    : null;

  const peerRelayId = connection
    ? connection.buyerId === user?.id
      ? (connection as any).sellerRelayId || 'RELAY-#SELLER'
      : (connection as any).buyerRelayId || 'RELAY-#BUYER'
    : 'RELAY-#STUDENT';

  // Fetch messages & security fingerprint on load
  useEffect(() => {
    if (connectionId) {
      markAsRead(connectionId);
      fetchMessages(connectionId).then((msgs) => setMessages(msgs));
      getSecurityFingerprint(connectionId).then((fp) => setSecurityFingerprint(fp));
    }
  }, [connectionId, markAsRead, fetchMessages, getSecurityFingerprint]);

  // Subscribe to live message updates from store
  const storeMessages = useChatStore((s) => (connectionId ? s.messages[connectionId] : undefined));
  useEffect(() => {
    if (storeMessages) {
      setMessages(storeMessages);
    }
  }, [storeMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Real-time PII detection when typing
  const handleInputChange = (text: string) => {
    setInput(text);
    if (text.trim().length > 3) {
      const scan = scanForPII(text);
      if (scan.hasPII) {
        setPiiWarning(
          '🛡️ Privacy Guard: Phone number detected! For your safety, phone numbers are masked and hidden.'
        );
      } else {
        setPiiWarning(null);
      }
    } else {
      setPiiWarning(null);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user || !connectionId) return;
    const text = input;
    setInput('');
    setPiiWarning(null);
    await sendMessage(connectionId, text, user.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickChip = async (chipText: string) => {
    if (!user || !connectionId) return;
    await sendMessage(connectionId, chipText, user.id);
  };

  const handleSendOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseInt(offerPriceInput, 10);
    if (!priceNum || isNaN(priceNum) || !user || !connectionId) return;
    const seats = linkedListing?.seats || ['1'];
    await sendDealOffer(connectionId, user.id, priceNum, seats);
    setShowOfferModal(false);
    setOfferPriceInput('');
  };

  const handleAcceptDeal = async (messageId: string) => {
    if (!user || !connectionId) return;
    await respondToDealOffer(connectionId, messageId, user.id, true);
  };

  const handleDeclineDeal = async (messageId: string) => {
    if (!user || !connectionId) return;
    await respondToDealOffer(connectionId, messageId, user.id, false);
  };

  const handleBlockAndExit = async () => {
    if (!connectionId || !otherUser?.id || !user?.id) return;
    if (confirm(`Are you sure you want to block ${otherUser.name || 'this user'}? You will no longer receive requests or messages from them.`)) {
      await blockUserStore(user.id, otherUser.id);
      blockUser(connectionId);
      navigate('/activity');
    }
  };

  const handleClearHistory = () => {
    if (!connectionId) return;
    if (confirm('Clear all encrypted messages on this device?')) {
      clearChatHistory(connectionId);
      setMessages([]);
      setShowOptionsMenu(false);
    }
  };

  const handleReportUser = () => {
    setShowOptionsMenu(false);
    setReportTarget({ type: 'user' });
    setShowReportModal(true);
  };

  const handleReportMessage = (msg: Message) => {
    setReportTarget({
      type: 'message',
      messageId: msg.id,
      messageText: msg.message,
    });
    setShowReportModal(true);
  };

  const peerIsTyping = connectionId ? isTyping[connectionId] : false;

  return (
    <div className="chat-container">
      {/* ── TOP ENCRYPTED HEADER ── */}
      <header className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          <button
            id="chat-back-btn"
            className="icon-btn"
            onClick={() => navigate(-1)}
            aria-label="Back"
            style={{ width: '34px', height: '34px', flexShrink: 0 }}
          >
            <ArrowLeft size={17} />
          </button>

          {otherUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <UserAvatar user={otherUser} size="md" />
                <div className="chat-online-dot" />
              </div>
              <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap' }}>
                  <span className="chat-user-name">{otherUser.name || 'Student Peer'}</span>
                  <span className="chat-relay-badge" title="Zero-Knowledge Privacy Relay Active">
                    <Shield size={9} /> {peerRelayId}
                  </span>
                </div>
                <div className="chat-user-sub">
                  <span style={{ color: 'var(--color-verified)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {otherUser.college || 'Campus Verified'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="chat-user-name">Encrypted Chat</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Security Shield Action */}
          <button
            id="security-shield-btn"
            className="chat-security-btn"
            onClick={() => setShowSecurityModal(true)}
            title="Multi-Layer Encryption Inspector"
            aria-label="Security Shield"
          >
            <Lock size={13} style={{ color: 'var(--color-success)' }} />
            <span className="chat-security-label">256-Bit</span>
          </button>

          {/* More Options */}
          <div style={{ position: 'relative' }}>
            <button
              id="chat-options-btn"
              className="icon-btn"
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              aria-label="More options"
              style={{ width: '34px', height: '34px' }}
            >
              <MoreVertical size={16} />
            </button>

            {showOptionsMenu && (
              <div className="chat-dropdown-menu">
                <button
                  className="chat-dropdown-item"
                  onClick={() => {
                    setShowOptionsMenu(false);
                    setShowRatingModal(true);
                  }}
                >
                  <Star size={14} style={{ color: 'var(--color-warning)' }} /> Rate User
                </button>
                <button
                  className="chat-dropdown-item"
                  onClick={() => {
                    setShowOptionsMenu(false);
                    setShowSecurityModal(true);
                  }}
                >
                  <Key size={14} /> Security Fingerprint
                </button>
                <button
                  className="chat-dropdown-item"
                  onClick={handleClearHistory}
                >
                  <Trash2 size={14} /> Clear Local Messages
                </button>
                <button
                  className="chat-dropdown-item"
                  onClick={handleReportUser}
                  style={{ color: 'var(--color-error)' }}
                >
                  <Flag size={14} /> Report User
                </button>
                <button
                  className="chat-dropdown-item chat-dropdown-item-danger"
                  onClick={handleBlockAndExit}
                >
                  <Ban size={14} /> Block User
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── PRIVACY & SAFETY BANNER ── */}
      <div style={{ padding: '0 var(--space-3) var(--space-2)' }}>
        <SafetyBanner compact style={{ marginTop: 'var(--space-2)' }} />
      </div>

      {/* ── TICKET CONTEXT SUMMARY ACCORDION ── */}
      {linkedListing && (
        <div className="chat-ticket-bar">
          <div
            className="chat-ticket-bar-header"
            onClick={() => setIsTicketSummaryExpanded(!isTicketSummaryExpanded)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div className="chat-ticket-badge">🎟️ {linkedListing.movie}</div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                Asking: ₹{linkedListing.askingPrice}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className="btn btn-xs btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOfferModal(true);
                }}
                style={{ padding: '2px 8px', fontSize: '11px' }}
              >
                <Tag size={10} /> Offer ₹
              </button>
              {isTicketSummaryExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>

          {isTicketSummaryExpanded && (
            <div className="chat-ticket-bar-body">
              <div className="chat-ticket-meta">
                <span>
                  <MapPin size={12} /> {linkedListing.theatre}
                </span>
                <span>
                  <Clock size={12} /> {linkedListing.date} · {linkedListing.showTime}
                </span>
                <span>
                  <Tag size={12} /> Seats: {linkedListing.seats.join(', ')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MESSAGES FEED ── */}
      <div className="chat-messages-area" onClick={() => setShowOptionsMenu(false)}>
        {/* System Encryption Security Handshake Notice */}
        <div className="chat-security-handshake-card">
          <div className="chat-security-handshake-header">
            <Lock size={16} className="chat-security-icon" />
            <span>Multi-Layer Encrypted Channel</span>
          </div>
          <p className="chat-security-handshake-body">
            Messages are end-to-end encrypted with 256-bit AES-GCM and verified with HMAC-SHA256.
            Neither Last Minuties nor third parties can read your messages. Real phone numbers are masked under Student Relay IDs.
          </p>
          <div className="chat-security-handshake-footer">
            <span>Safety Key: {securityFingerprint.slice(0, 9)}••••</span>
            <button
              className="chat-verify-link"
              onClick={() => setShowSecurityModal(true)}
            >
              Inspect Security
            </button>
          </div>
        </div>

        {/* Message Bubbles */}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          const isSystem = msg.senderId === 'system' || msg.messageType === 'system_notice';

          if (isSystem) {
            return (
              <div key={msg.id} className="chat-system-msg">
                <span>{msg.message}</span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`chat-bubble-row ${isMe ? 'chat-row-me' : 'chat-row-them'}`}
            >
              <div className={`chat-bubble ${isMe ? 'chat-bubble-me' : 'chat-bubble-them'}`}>
                {/* Render Deal Offer Card if present */}
                {msg.dealOffer && (
                  <div className="chat-deal-card">
                    <div className="chat-deal-header">
                      <Tag size={14} style={{ color: 'var(--color-brand-primary)' }} />
                      <span style={{ fontWeight: 600 }}>
                        {msg.dealOffer.proposedBy === user?.id
                          ? 'You proposed an offer'
                          : 'Counter-offer received'}
                      </span>
                    </div>
                    <div className="chat-deal-price">₹{msg.dealOffer.price}</div>
                    <div className="chat-deal-seats">
                      Seats: {msg.dealOffer.seats.join(', ') || 'General'}
                    </div>

                    {msg.dealOffer.status === 'pending' ? (
                      msg.dealOffer.proposedBy !== user?.id ? (
                        <div className="chat-deal-actions">
                          <button
                            id={`accept-deal-${msg.id}`}
                            className="btn btn-xs btn-primary"
                            onClick={() => handleAcceptDeal(msg.id)}
                            style={{ flex: 1 }}
                          >
                            <Check size={12} /> Accept ₹{msg.dealOffer.price}
                          </button>
                          <button
                            id={`decline-deal-${msg.id}`}
                            className="btn btn-xs btn-secondary"
                            onClick={() => handleDeclineDeal(msg.id)}
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <div className="chat-deal-pending-status">⏳ Awaiting response...</div>
                      )
                    ) : msg.dealOffer.status === 'accepted' ? (
                      <div className="chat-deal-accepted-badge">
                        <CheckCircle2 size={13} /> Deal Locked at ₹{msg.dealOffer.price}
                      </div>
                    ) : (
                      <div className="chat-deal-declined-badge">Offer declined</div>
                    )}
                  </div>
                )}

                {/* Normal message text */}
                {!msg.dealOffer && <div className="chat-bubble-text">{msg.message}</div>}

                {/* Bubble Footer */}
                <div className="chat-bubble-meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span title="AES-GCM-256 Verified">
                      <Lock size={9} style={{ opacity: 0.7 }} />
                    </span>
                    <span>{formatMsgTime(msg.createdAt)}</span>
                    {isMe && <span className="chat-checkmarks">✓✓</span>}
                  </div>
                  {!isMe && !isSystem && (
                    <button
                      type="button"
                      onClick={() => handleReportMessage(msg)}
                      title="Report inappropriate message"
                      style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: '0 2px', display: 'inline-flex', opacity: 0.6 }}
                    >
                      <Flag size={10} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Peer Typing Indicator */}
        {peerIsTyping && (
          <div className="chat-bubble-row chat-row-them">
            <div className="chat-bubble chat-bubble-them chat-typing-bubble">
              <div className="typing-dots">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginLeft: '6px' }}>
                Typing securely...
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── REAL-TIME PII PRIVACY WARNING ── */}
      {piiWarning && (
        <div className="chat-pii-warning">
          <ShieldAlert size={16} style={{ color: 'var(--color-brand-primary)', flexShrink: 0 }} />
          <span>{piiWarning}</span>
        </div>
      )}

      {/* ── QUICK CAMPUS SUGGESTION CHIPS ── */}
      <div className="chat-quick-chips">
        <button
          className="chat-chip"
          onClick={() => handleQuickChip('Can we meet 15m before show at the ticket counter?')}
        >
          📍 Meet at box office
        </button>
        <button
          className="chat-chip"
          onClick={() => handleQuickChip('Is the seat location good and confirmed?')}
        >
          💺 Confirm seat
        </button>
        <button
          className="chat-chip"
          onClick={() => handleQuickChip('Ready to scan digital pass at the entrance.')}
        >
          🎟️ Ready to scan
        </button>
        <button
          className="chat-chip"
          onClick={() => setShowOfferModal(true)}
        >
          🤝 Make Offer
        </button>
      </div>

      {/* ── INPUT BAR ── */}
      <div className="chat-input-wrapper">
        <button
          id="chat-deal-trigger-btn"
          className="chat-input-tool-btn"
          onClick={() => setShowOfferModal(true)}
          title="Make Price Offer"
          aria-label="Make offer"
        >
          <Tag size={18} />
        </button>

        <textarea
          id="chat-message-input"
          className="chat-textarea"
          placeholder="Type an encrypted message..."
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          aria-label="Type message"
        />

        <button
          id="chat-send-submit-btn"
          className="chat-send-button"
          onClick={handleSend}
          disabled={!input.trim()}
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>

      {/* ── MULTI-ENCRYPTION & SECURITY INSPECTOR MODAL ── */}
      {showSecurityModal && (
        <div className="modal-backdrop" onClick={() => setShowSecurityModal(false)}>
          <div
            className="modal-content security-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', width: '92%' }}
          >
            <div className="security-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="security-shield-icon-wrapper">
                  <Shield size={24} style={{ color: 'var(--color-brand-primary)' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                    Privacy & Multi-Encryption Shield
                  </h3>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)' }}>
                    ● 3 Security Layers Active
                  </div>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setShowSecurityModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="security-modal-body">
              {/* Layer 1 */}
              <div className="security-layer-card">
                <div className="security-layer-icon">🔐</div>
                <div className="security-layer-info">
                  <div className="security-layer-title">Layer 1: 256-Bit AES-GCM (E2EE)</div>
                  <div className="security-layer-desc">
                    Hardware-accelerated client encryption. Messages are encrypted on this device before sending and only decrypted on the recipient's phone.
                  </div>
                </div>
              </div>

              {/* Layer 2 */}
              <div className="security-layer-card">
                <div className="security-layer-icon">🛡️</div>
                <div className="security-layer-info">
                  <div className="security-layer-title">Layer 2: HMAC-SHA256 Anti-Tampering</div>
                  <div className="security-layer-desc">
                    Every message packet is cryptographically signed. Any modification in transit immediately invalidates the envelope.
                  </div>
                </div>
              </div>

              {/* Layer 3 */}
              <div className="security-layer-card">
                <div className="security-layer-icon">🎭</div>
                <div className="security-layer-info">
                  <div className="security-layer-title">Layer 3: Zero-Knowledge Student Relay</div>
                  <div className="security-layer-desc">
                    Real mobile numbers are 100% masked. Counterparties only see your verified college and Student Relay handle ({peerRelayId}).
                  </div>
                </div>
              </div>

              {/* 16-Digit Safety Number Fingerprint */}
              <div className="security-fingerprint-box">
                <div className="security-fingerprint-label">
                  <Key size={14} /> 16-Digit Safety Number Fingerprint
                </div>
                <div className="security-fingerprint-code">{securityFingerprint}</div>
                <p className="security-fingerprint-note">
                  To verify end-to-end encryption with {otherUser?.name || 'this student'}, compare these numbers in person or via college network.
                </p>

                <button
                  className={`btn btn-sm ${isFingerprintVerified ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => setIsFingerprintVerified(!isFingerprintVerified)}
                  style={{ width: '100%', marginTop: 'var(--space-2)' }}
                >
                  {isFingerprintVerified ? (
                    <>
                      <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                      Verified Safety Fingerprint
                    </>
                  ) : (
                    'Mark Safety Number as Verified'
                  )}
                </button>
              </div>

              {/* Privacy Guard Preferences */}
              <div className="security-toggle-group">
                <label className="security-toggle-item">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                      Auto-Mask Phone Numbers (PII Guard)
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                      Prevent accidental exposure of private phone numbers in messages
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={privacySettings.autoMaskPII}
                    onChange={(e) => setPrivacySetting('autoMaskPII', e.target.checked)}
                  />
                </label>
              </div>
            </div>

            <div className="security-modal-footer">
              <button
                className="btn btn-secondary btn-full"
                onClick={() => setShowSecurityModal(false)}
              >
                Close Security Shield
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRICE COUNTER-OFFER MODAL ── */}
      {showOfferModal && (
        <div className="modal-backdrop" onClick={() => setShowOfferModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '380px', width: '90%' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                Propose Deal Offer
              </h3>
              <button className="btn btn-ghost btn-xs" onClick={() => setShowOfferModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSendOfferSubmit}>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>
                  Original / Asking Price: ₹{linkedListing?.askingPrice || 250}
                </div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '6px' }}>
                  Your Offer Amount (₹)
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-tertiary)',
                      fontWeight: 700,
                    }}
                  >
                    ₹
                  </span>
                  <input
                    id="offer-price-input"
                    type="number"
                    min="50"
                    max="5000"
                    className="form-input"
                    style={{ paddingLeft: '28px', fontSize: 'var(--text-xl)', fontWeight: 700 }}
                    placeholder={String(linkedListing?.askingPrice || 200)}
                    value={offerPriceInput}
                    onChange={(e) => setOfferPriceInput(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowOfferModal(false)}
                >
                  Cancel
                </button>
                <button
                  id="send-offer-btn"
                  type="submit"
                  className="btn btn-primary"
                  disabled={!offerPriceInput}
                >
                  Send Encrypted Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RATING MODAL ── */}
      {connectionId && otherUser && user && (
        <RatingModal
          connectionId={connectionId}
          toUserId={otherUser.id || ''}
          toUserName={otherUser.name || 'Student'}
          fromUserId={user.id}
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
        />
      )}

      {/* ── REPORT MODAL ── */}
      {user && (
        <ReportModal
          reporterId={user.id}
          targetType={reportTarget.type}
          reportedUserId={otherUser?.id}
          reportedUserName={otherUser?.name}
          connectionId={connectionId}
          messageId={reportTarget.messageId}
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
