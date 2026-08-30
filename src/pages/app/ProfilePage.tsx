import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, AlertCircle, Star, LogOut, Settings,
  ChevronRight, Shield, Bell, Eye, HelpCircle
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useListingsStore } from '../../stores/listingsStore';
import UserAvatar from '../../components/common/UserAvatar';
import PrivacyCenterModal from '../../components/safety/PrivacyCenterModal';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { myListings } = useListingsStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

  if (!user) return null;

  const activeSells = myListings.filter((l) => l.status === 'available' || l.status === 'contacted').length;
  const soldCount = myListings.filter((l) => l.status === 'sold').length;

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const handleMenuClick = (label: string) => {
    if (label === 'Privacy Settings' || label === 'Settings') {
      setShowPrivacyModal(true);
    } else if (label === 'How It Works') {
      setShowHowItWorksModal(true);
    } else if (label === 'Notification Preferences') {
      navigate('/notifications');
    } else if (label === 'College Verification') {
      setShowPrivacyModal(true);
    }
  };

  const menuItems = [
    {
      section: 'Account & Trust',
      items: [
        { icon: Shield, label: 'College Verification', description: user.collegeVerified ? 'Verified Campus Student' : 'Verification Pending' },
        { icon: Eye, label: 'Privacy Settings', description: 'Phone protection, data visibility & deletion' },
        { icon: Bell, label: 'Notification Preferences', description: 'In-app real-time alerts' },
      ],
    },
    {
      section: 'Safety & Support',
      items: [
        { icon: HelpCircle, label: 'How It Works', description: 'Campus rules, fair pricing & safety' },
        { icon: Settings, label: 'Settings', description: 'Account options' },
      ],
    },
  ];

  return (
    <div className="page">
      {/* Profile Header */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-4)',
          background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(139,92,246,0.06))',
          border: '1px solid rgba(249,115,22,0.2)',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <UserAvatar user={user} size="xl" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 'var(--font-bold)',
                color: 'var(--color-text-primary)',
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.name}
            </h1>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
              {user.college}
            </div>

            {/* Trust badges */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {user.phoneVerified && (
                <span className="badge badge-verified">
                  <CheckCircle size={10} /> Phone Verified
                </span>
              )}
              {user.collegeVerified ? (
                <span className="badge badge-verified">
                  <AlertCircle size={10} /> College Verified
                </span>
              ) : (
                <span className="badge badge-pending">⏳ Verification Pending</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--space-3)',
            paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--color-border-subtle)',
          }}
        >
          {[
            { label: 'Rating', value: user.ratingCount > 0 ? `⭐ ${user.rating.toFixed(1)}` : 'New' },
            { label: 'Connections', value: user.connectionCount || 0 },
            { label: 'Listed', value: myListings.length },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 'var(--font-bold)', fontSize: 'var(--text-xl)', color: 'var(--color-text-primary)' }}>
                {value}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}
      >
        <button
          id="profile-active-listings"
          className="card"
          style={{ textAlign: 'center', cursor: 'pointer', border: '1px solid var(--color-border)' }}
          onClick={() => navigate('/activity')}
        >
          <div style={{ fontWeight: 'var(--font-black)', fontSize: 'var(--text-2xl)', color: 'var(--color-brand-primary)' }}>
            {activeSells}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Active Listings</div>
        </button>
        <button
          id="profile-sold-count"
          className="card"
          style={{ textAlign: 'center', cursor: 'pointer', border: '1px solid var(--color-border)' }}
          onClick={() => navigate('/activity')}
        >
          <div style={{ fontWeight: 'var(--font-black)', fontSize: 'var(--text-2xl)', color: 'var(--color-success)' }}>
            {soldCount}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Tickets Sold</div>
        </button>
      </div>

      {/* Ratings detail */}
      {user.ratingCount > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)' }}>Reputation & Feedback</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', fontWeight: 900, color: 'var(--color-text-primary)' }}>
                {user.rating.toFixed(1)}
              </div>
              <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '4px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    fill={i < Math.round(user.rating) ? '#f59e0b' : 'transparent'}
                    style={{ color: i < Math.round(user.rating) ? '#f59e0b' : 'var(--color-surface-3)' }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                {user.ratingCount} peer ratings
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu sections */}
      {menuItems.map(({ section, items }) => (
        <div key={section} style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-2)', paddingLeft: 'var(--space-2)' }}>
            {section}
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {items.map(({ icon: Icon, label, description }, i) => (
              <button
                key={label}
                id={`profile-${label.replace(/\s+/g, '-').toLowerCase()}`}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  padding: 'var(--space-4)', background: 'none', border: 'none',
                  borderBottom: i < items.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                  cursor: 'pointer', transition: 'background var(--transition-fast)', textAlign: 'left',
                }}
                onClick={() => handleMenuClick(label)}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-glass)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <div
                  style={{
                    width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <Icon size={16} style={{ color: 'var(--color-text-secondary)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--color-text-primary)' }}>
                    {label}
                  </div>
                  {description && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                      {description}
                    </div>
                  )}
                </div>
                <ChevronRight size={16} style={{ color: 'var(--color-text-tertiary)' }} />
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Member since */}
      <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-4)' }}>
        Member since {new Date(user.joinedAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
      </p>

      {/* Logout */}
      {!showLogoutConfirm ? (
        <button
          id="logout-btn"
          className="btn btn-danger btn-full"
          onClick={() => setShowLogoutConfirm(true)}
        >
          <LogOut size={16} /> Log Out
        </button>
      ) : (
        <div className="card" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
          <p style={{ textAlign: 'center', marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)', fontWeight: 'var(--font-semibold)' }}>
            Are you sure you want to log out?
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button className="btn btn-secondary btn-full" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </button>
            <button id="confirm-logout-btn" className="btn btn-danger btn-full" onClick={handleLogout}>
              <LogOut size={16} /> Log Out
            </button>
          </div>
        </div>
      )}

      {/* Privacy Center Modal */}
      <PrivacyCenterModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        userId={user.id}
      />

      {/* How It Works Modal */}
      {showHowItWorksModal && (
        <div className="modal-backdrop" onClick={() => setShowHowItWorksModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={20} style={{ color: 'var(--color-brand-primary)' }} />
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800 }}>How Last Minuties Works</h3>
              </div>
              <button className="icon-btn" onClick={() => setShowHowItWorksModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
              {[
                { emoji: '⚡', title: '1. Plans Changed?', desc: 'A student can\'t make it to their movie and lists their ticket with showtime and price.' },
                { emoji: '🔍', title: '2. Instant Discovery', desc: 'Other students on campus find tickets filtered by movie, timing, or smart matches.' },
                { emoji: '💬', title: '3. Direct Connection', desc: 'Buyer sends a request. Once accepted, a private encrypted chat opens.' },
                { emoji: '🤝', title: '4. Direct Handover', desc: 'Students coordinate ticket handover and payment directly between themselves.' },
                { emoji: '⭐', title: '5. Build Reputation', desc: 'After transaction, students rate each other to establish campus trust.' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', background: 'var(--color-surface-2)', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ fontSize: '1.4rem' }}>{item.emoji}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>{item.title}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-4)',
                lineHeight: 1.5,
              }}
            >
              ℹ️ <strong>Platform Boundary:</strong> Last Minuties is a connector. We do not handle payments, escrow, or ticket guarantees.
            </div>

            <button
              type="button"
              className="btn btn-primary btn-full"
              onClick={() => setShowHowItWorksModal(false)}
            >
              Got It
            </button>
          </div>
        </div>
      )}

      <div style={{ height: 'var(--space-8)' }} />
    </div>
  );
}
