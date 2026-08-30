import { useState } from 'react';
import { Star, X, CheckCircle2 } from 'lucide-react';
import { useSafetyStore } from '../../stores/safetyStore';

interface RatingModalProps {
  connectionId: string;
  toUserId: string;
  toUserName: string;
  fromUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor / Problematic',
  2: 'Unresponsive / Late',
  3: 'Average interaction',
  4: 'Good & on time',
  5: 'Smooth & friendly!',
};

export default function RatingModal({
  connectionId,
  toUserId,
  toUserName,
  fromUserId,
  isOpen,
  onClose,
  onSuccess,
}: RatingModalProps) {
  const { submitRating } = useSafetyStore();
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const currentDisplayRating = hoverRating || selectedRating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const res = await submitRating(connectionId, toUserId, fromUserId, selectedRating, comment);
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSubmitted(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1400);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '380px', textAlign: 'center' }}
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
          <div style={{ padding: 'var(--space-6) 0' }}>
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
              Rating Submitted!
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              Thank you for helping keep campus exchanges trustworthy.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, marginBottom: '6px' }}>
              Rate Interaction
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
              How was your experience connecting with <strong>{toUserName}</strong>?
            </p>

            {error && (
              <div className="form-error-banner" style={{ marginBottom: 'var(--space-3)' }}>
                {error}
              </div>
            )}

            {/* Interactive Star Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                margin: 'var(--space-3) 0',
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer',
                    transform: currentDisplayRating >= star ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => setSelectedRating(star)}
                  aria-label={`${star} star`}
                >
                  <Star
                    size={28}
                    fill={currentDisplayRating >= star ? '#f59e0b' : 'transparent'}
                    style={{
                      color: currentDisplayRating >= star ? '#f59e0b' : 'var(--color-surface-3)',
                      transition: 'color 0.15s ease',
                    }}
                  />
                </button>
              ))}
            </div>

            {/* Rating text label */}
            <div
              style={{
                fontSize: 'var(--text-xs)',
                fontWeight: 700,
                color: 'var(--color-warning)',
                minHeight: '18px',
                marginBottom: 'var(--space-4)',
              }}
            >
              {RATING_LABELS[currentDisplayRating]}
            </div>

            {/* Optional Comment */}
            <textarea
              className="form-input"
              rows={2}
              placeholder="Optional comment about the handover..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ resize: 'none', marginBottom: 'var(--space-4)', fontSize: 'var(--text-xs)' }}
              maxLength={500}
            />

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                type="button"
                className="btn btn-secondary btn-full"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Skip
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? <span className="spinner" /> : 'Submit Rating'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
