import { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, X, Trash2, AlertTriangle } from 'lucide-react';
import { useSafetyStore } from '../../stores/safetyStore';
import { useAuthStore } from '../../stores/authStore';

interface PrivacyCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function PrivacyCenterModal({ isOpen, onClose, userId }: PrivacyCenterModalProps) {
  const { requestAccountDeletion } = useSafetyStore();
  const { signOut } = useAuthStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!isOpen) return null;

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError('');

    const res = await requestAccountDeletion(userId);
    setIsDeleting(false);

    if (res.error) {
      setDeleteError(res.error);
    } else {
      await signOut();
      onClose();
      window.location.href = '/';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Close Button */}
        <button
          type="button"
          className="icon-btn"
          style={{ position: 'absolute', top: '16px', right: '16px' }}
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-4)' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(6, 182, 212, 0.15)',
              color: 'var(--color-brand-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Privacy & Trust Center
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
              How your information is protected on Last Minuties
            </p>
          </div>
        </div>

        {/* ── PRIVATE DATA SECTION ── */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', marginBottom: '8px' }}>
            <EyeOff size={14} /> Private & Never Publicly Shared
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { label: 'Phone Number', desc: 'Used strictly for OTP login. Never displayed to buyers or sellers.' },
              { label: 'Student ID / Proof', desc: 'Used solely for campus verification and stored in private vaults.' },
              { label: 'Private Messages', desc: 'End-to-end encrypted between connected students only.' },
              { label: 'Ticket Screenshots', desc: 'Stored in secure private storage and never indexed publicly.' },
            ].map(({ label, desc }) => (
              <div
                key={label}
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '10px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)' }}>
                  <Lock size={12} style={{ color: 'var(--color-success)' }} />
                  {label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PUBLIC DATA SECTION ── */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-brand-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>
            <Eye size={14} /> Visible to Campus Peers
          </div>

          <div
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '10px 12px',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
            }}
          >
            • <strong>Display Name & College:</strong> Rahul Sharma (IIT Madras)<br />
            • <strong>Trust Badges:</strong> Phone Verified, College Verified<br />
            • <strong>Reputation:</strong> ⭐ 4.8 (12 ratings) · 18 completed connections
          </div>
        </div>

        {/* ── PLATFORM BOUNDARY NOTICE ── */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '10px 12px',
            fontSize: '11px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.45,
            marginBottom: 'var(--space-5)',
          }}
        >
          ℹ️ <strong>Platform Disclaimer:</strong> Last Minuties connects college students. We do not hold payments, guarantee tickets, or participate in the direct ticket exchange.
        </div>

        {/* ── ACCOUNT DELETION ── */}
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
          {!showDeleteConfirm ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--color-error)', width: '100%', justifyContent: 'center' }}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={14} /> Deactivate / Delete Account
            </button>
          ) : (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <AlertTriangle size={16} style={{ color: 'var(--color-error)' }} />
                <span style={{ fontWeight: 700, fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>
                  Confirm Account Deletion
                </span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
                Deactivating your account will cancel all your active listings and revoke access.
              </p>

              {deleteError && (
                <div className="form-error-banner" style={{ marginBottom: '8px', fontSize: '11px' }}>
                  {deleteError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm btn-full"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm btn-full"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  {isDeleting ? <span className="spinner" /> : 'Yes, Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
