export default function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
        gap: 'var(--space-4)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-3xl)',
          fontWeight: 900,
          background: 'linear-gradient(135deg, #f97316, #f59e0b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.03em',
          animation: 'glow-pulse 2s ease infinite',
        }}
      >
        Last Minuties
      </div>
      <div className="spinner spinner-lg" />
      <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
        Loading...
      </p>
    </div>
  );
}
