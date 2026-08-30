import { useState, useEffect } from 'react';
import { Clock, Zap, Flame } from 'lucide-react';
import { getMinutesUntilShow, formatTimeRemaining, getUrgencyFromMinutes, getUrgencyClass } from '../../lib/urgency';
import type { UrgencyLevel } from '../../types';

interface UrgencyCountdownProps {
  showDate: string;
  showTime: string;
  showIcon?: boolean;
  className?: string;
  onExpire?: () => void;
}

export default function UrgencyCountdown({
  showDate,
  showTime,
  showIcon = true,
  className = '',
  onExpire,
}: UrgencyCountdownProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [level, setLevel] = useState<UrgencyLevel>('available');

  useEffect(() => {
    function update() {
      const mins = getMinutesUntilShow(showDate, showTime);
      const formatted = formatTimeRemaining(mins);
      setTimeLeft(formatted);
      const newLevel = getUrgencyFromMinutes(mins);
      setLevel(newLevel);

      if (mins <= 0 && onExpire) {
        onExpire();
      }
    }

    update();
    const interval = setInterval(update, 30_000); // 30s precision
    return () => clearInterval(interval);
  }, [showDate, showTime, onExpire]);

  const getIcon = () => {
    switch (level) {
      case 'urgent':
        return <Zap size={13} style={{ color: 'var(--color-urgent)' }} />;
      case 'hot':
        return <Flame size={13} style={{ color: 'var(--color-hot)' }} />;
      default:
        return <Clock size={13} style={{ color: 'var(--color-text-tertiary)' }} />;
    }
  };

  return (
    <span
      className={`urgency-countdown ${getUrgencyClass(level)} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontWeight: 600,
        fontSize: 'var(--text-xs)',
      }}
    >
      {showIcon && getIcon()}
      <span>{timeLeft}</span>
    </span>
  );
}
