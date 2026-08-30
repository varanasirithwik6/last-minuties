import { useState } from 'react';
import { ShieldAlert, X, CheckCircle2 } from 'lucide-react';
import { useSafetyStore } from '../../stores/safetyStore';
import type { ReportReason } from '../../types';

interface ReportModalProps {
  reporterId: string;
  targetType: 'user' | 'listing' | 'message';
  reportedUserId?: string;
  reportedUserName?: string;
  listingId?: string;
  listingTitle?: string;
  messageId?: string;
  connectionId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_REASONS: Array<{ value: ReportReason; label: string; appliesTo: ('user' | 'listing' | 'message')[] }> = [
  { value: 'fake_ticket', label: 'Fake or invalid ticket', appliesTo: ['listing', 'user'] },
  { value: 'misleading_price', label: 'Asking above original ticket price', appliesTo: ['listing', 'user'] },
  { value: 'duplicate_listing', label: 'Suspected duplicate ticket', appliesTo: ['listing'] },
  { value: 'harassment_or_spam', label: 'Harassment, abuse, or spam', appliesTo: ['user', 'message'] },
  { value: 'inappropriate_message', label: 'Inappropriate or offensive message', appliesTo: ['message', 'user'] },
  { value: 'suspicious_behavior', label: 'Suspicious or untrustworthy behavior', appliesTo: ['user', 'listing'] },
  { value: 'no_show', label: 'Agreed but did not show up', appliesTo: ['user'] },
  { value: 'other', label: 'Other violation', appliesTo: ['user', 'listing', 'message'] },
];

export default function ReportModal({
  reporterId,
  targetType,
  reportedUserId,
  reportedUserName,
  listingId,
  listingTitle,
  messageId,
  connectionId,
  isOpen,
  onClose,
  onSuccess,
}: ReportModalProps) {
  const { submitReport } = useSafetyStore();
  const [selectedReason, setSelectedReason] = useState<ReportReason>('suspicious_behavior');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const applicableReasons = REPORT_REASONS.filter((r) => r.appliesTo.includes(targetType));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const res = await submitReport({
      reporterId,
      reportedUserId,
      listingId,
      messageId,
      connectionId,
      reason: selectedReason,
      description,
    });

    setIsSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSubmitted(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    }
  };

  const getTargetTitle = () => {
    if (targetType === 'user') return `Report ${reportedUserName || 'Student'}`;
    if (targetType === 'listing') return `Report Listing: ${listingTitle || 'Ticket'}`;
    return 'Report Message';
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px' }}
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

        {submitted ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-3)',
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, marginBottom: '4px' }}>
              Report Submitted
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
              Thanks. Your report has been submitted to campus safety moderation.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldAlert size={20} style={{ color: 'var(--color-error)' }} />
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {getTargetTitle()}
              </h3>
            </div>

            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.4 }}>
              Help maintain a fair and safe exchange. Reports are reviewed by campus moderators.
            </p>

            {error && (
              <div className="form-error-banner" style={{ marginBottom: 'var(--space-3)' }}>
                {error}
              </div>
            )}

            {/* Reason Radio Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 'var(--space-4)' }}>
              {applicableReasons.map((r) => {
                const isSelected = selectedReason === r.value;
                return (
                  <label
                    key={r.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-lg)',
                      background: isSelected ? 'rgba(239, 68, 68, 0.1)' : 'var(--color-surface-2)',
                      border: `1px solid ${isSelected ? 'rgba(239, 68, 68, 0.4)' : 'var(--color-border)'}`,
                      cursor: 'pointer',
                      fontSize: 'var(--text-xs)',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? 'var(--color-error)' : 'var(--color-text-primary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.value}
                      checked={isSelected}
                      onChange={() => setSelectedReason(r.value)}
                      style={{ accentColor: 'var(--color-error)' }}
                    />
                    <span>{r.label}</span>
                  </label>
                );
              })}
            </div>

            {/* Optional Description */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label" style={{ fontSize: '11px' }}>
                Additional Details (Optional)
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Provide any relevant context..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ resize: 'none', fontSize: 'var(--text-xs)' }}
                maxLength={1000}
              />
            </div>

            {/* Privacy Assurance */}
            <div
              style={{
                fontSize: '11px',
                color: 'var(--color-text-tertiary)',
                background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 10px',
                marginBottom: 'var(--space-4)',
                lineHeight: 1.4,
              }}
            >
              🔒 <strong>Anonymous:</strong> Your identity will not be shared with the reported student.
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-danger btn-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? <span className="spinner" /> : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
