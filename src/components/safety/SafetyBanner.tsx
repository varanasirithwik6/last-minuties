import { ShieldAlert, Info } from 'lucide-react';

interface SafetyBannerProps {
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function SafetyBanner({ compact = false, className = '', style }: SafetyBannerProps) {
  if (compact) {
    return (
      <div
        className={`safety-banner-compact ${className}`}
        style={{
          background: 'rgba(6, 182, 212, 0.08)',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.4,
          ...style,
        }}
      >
        <Info size={14} style={{ color: 'var(--color-brand-secondary)', flexShrink: 0 }} />
        <span>
          <strong>Campus Safety:</strong> Meet in public places on campus. Last Minuties does not handle payments or guarantee tickets.
        </span>
      </div>
    );
  }

  return (
    <div
      className={`safety-banner-full ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(17, 24, 39, 0.8) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-3) var(--space-4)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-secondary)',
        lineHeight: 1.45,
        ...style,
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'rgba(6, 182, 212, 0.15)',
          color: 'var(--color-brand-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px',
        }}
      >
        <ShieldAlert size={16} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '2px' }}>
          🛡️ Student Safety & Direct Exchange
        </div>
        <div>
          Always meet in well-lit public campus locations (e.g. food courts, main gates) when exchanging tickets. Never share bank PINs or passwords.
        </div>
      </div>
    </div>
  );
}
