import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Clock, Tag, Users, CheckCircle, AlertCircle } from 'lucide-react';
import type { Listing } from '../../types';
import {
  getMinutesUntilShow,
  formatTimeRemaining,
  getUrgencyLabel,
  getUrgencyClass,
} from '../../lib/urgency';
import UserAvatar from '../common/UserAvatar';

interface Props {
  listing: Listing;
  showMatchScore?: number;
  compact?: boolean;
}

export default function TicketCard({ listing, showMatchScore, compact }: Props) {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState(listing.urgencyLevel);

  useEffect(() => {
    function update() {
      const mins = getMinutesUntilShow(listing.date, listing.showTime);
      setTimeLeft(formatTimeRemaining(mins));
      if (mins <= 60) setUrgencyLevel('urgent');
      else if (mins <= 150) setUrgencyLevel('hot');
      else if (mins <= 360) setUrgencyLevel('soon');
      else setUrgencyLevel('available');
    }
    update();
    const interval = setInterval(update, 30_000); // update every 30s
    return () => clearInterval(interval);
  }, [listing.date, listing.showTime]);

  const discountPct =
    listing.originalPrice > 0
      ? Math.round(((listing.originalPrice - listing.askingPrice) / listing.originalPrice) * 100)
      : 0;

  // Format date display
  const showDate = new Date(`${listing.date}T${listing.showTime}:00`);
  const isToday =
    listing.date === new Date().toISOString().slice(0, 10);
  const isTomorrow = (() => {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    return listing.date === tmr.toISOString().slice(0, 10);
  })();
  const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : listing.date;

  const timeLabel = showDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const isSoldOrExpired = listing.status === 'sold' || listing.status === 'expired' || listing.status === 'cancelled';

  return (
    <article
      className={`ticket-card ${urgencyLevel === 'urgent' ? 'ticket-card-urgent' : ''}`}
      onClick={() => navigate(`/ticket/${listing.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/ticket/${listing.id}`)}
      aria-label={`${listing.movie} at ${listing.theatre}, ${dateLabel} ${timeLabel}, ₹${listing.askingPrice}`}
    >
      {/* Accent bar */}
      <div className="ticket-card-accent" />

      <div className="ticket-card-body">
        {/* Match score banner */}
        {showMatchScore != null && showMatchScore >= 50 && (
          <div className="match-banner" style={{ marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: '1.2rem' }}>🎯</span>
            <div>
              <div className="match-score">{showMatchScore}% Match</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                Matches your preference
              </div>
            </div>
          </div>
        )}

        {/* Movie & Status row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-1)' }}>
          <h3 className="ticket-movie">{listing.movie}</h3>
          {isSoldOrExpired ? (
            <span className="badge badge-sold" style={{ marginLeft: '8px', flexShrink: 0 }}>
              {listing.status === 'sold' ? '✓ Sold' : listing.status === 'expired' ? 'Expired' : 'Cancelled'}
            </span>
          ) : (
            <span className={`badge ${getUrgencyClass(urgencyLevel)}`} style={{ marginLeft: '8px', flexShrink: 0 }}>
              {getUrgencyLabel(urgencyLevel)}
            </span>
          )}
        </div>

        {/* Theatre */}
        <div className="ticket-theatre">
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={12} style={{ color: 'var(--color-text-tertiary)' }} />
            {listing.theatre}
          </span>
        </div>

        {!compact && (
          <>
            {/* Meta info */}
            <div className="ticket-meta">
              <span className="ticket-meta-item">
                <Calendar className="icon" />
                {dateLabel}
              </span>
              <span className="ticket-meta-item">
                <Clock className="icon" />
                {timeLabel}
              </span>
              <span className="ticket-meta-item">
                <Tag className="icon" />
                {listing.seats.slice(0, 2).join(', ')}{listing.seats.length > 2 ? ` +${listing.seats.length - 2}` : ''}
              </span>
              {listing.quantity > 1 && (
                <span className="ticket-meta-item">
                  <Users className="icon" />
                  {listing.quantity} tickets
                </span>
              )}
            </div>

            {/* Countdown */}
            {!isSoldOrExpired && (
              <div className={`ticket-countdown ${urgencyLevel === 'urgent' ? 'urgent' : urgencyLevel === 'soon' ? 'soon' : ''}`}>
                <span>{urgencyLevel === 'urgent' ? '⚡' : urgencyLevel === 'hot' ? '🔥' : '⏱'}</span>
                {timeLeft}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="ticket-footer">
          <div>
            <div className="ticket-price">₹{listing.askingPrice.toLocaleString('en-IN')}</div>
            {discountPct > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="ticket-price-original">₹{listing.originalPrice.toLocaleString('en-IN')}</span>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-success)',
                    fontWeight: 'var(--font-semibold)',
                  }}
                >
                  {discountPct}% off
                </span>
              </div>
            )}
          </div>

          {/* Seller */}
          {listing.seller && (
            <div className="ticket-seller">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                  <UserAvatar user={listing.seller} size="sm" />
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'flex-end' }}>
                  {listing.seller.phoneVerified && (
                    <span title="Phone Verified">
                      <CheckCircle size={13} style={{ color: 'var(--color-verified)' }} />
                    </span>
                  )}
                  {listing.seller.collegeVerified && (
                    <span title="College Verified">
                      <AlertCircle size={13} style={{ color: 'var(--color-success)' }} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
