import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';

// Extend window for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_UNTIL_KEY = 'lm-install-dismissed-until';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (isInStandaloneMode()) return;

    // Don't show if dismissed recently (7 days)
    const dismissedUntil = localStorage.getItem(DISMISSED_UNTIL_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    setIsIos(isIOS());

    // Android / Chrome: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after 30s or on page load after a delay
      setTimeout(() => setShowPrompt(true), 15_000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // iOS: show after delay on first visit
    if (isIOS()) {
      setTimeout(() => setShowIOSGuide(true), 20_000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    // Suppress for 7 days
    localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  // Android/Chrome install prompt
  if (showPrompt && deferredPrompt && !isIos) {
    return (
      <div className="install-prompt" role="dialog" aria-label="Install Last Minuties">
        <button
          id="install-dismiss"
          style={{
            position: 'absolute', top: '12px', right: '12px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-tertiary)',
          }}
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
        >
          <X size={18} />
        </button>

        <div className="install-prompt-header">
          <div className="install-prompt-icon">LM</div>
          <div>
            <div className="install-prompt-title">Get Last Minuties on your phone</div>
            <div className="install-prompt-subtitle">Find last-minute tickets faster</div>
          </div>
        </div>

        <div className="install-prompt-actions">
          <button
            id="install-later-btn"
            className="btn btn-ghost btn-sm btn-full"
            onClick={handleDismiss}
          >
            Maybe Later
          </button>
          <button
            id="install-now-btn"
            className="btn btn-primary btn-sm btn-full"
            onClick={handleInstall}
          >
            <Download size={16} /> Install Now
          </button>
        </div>
      </div>
    );
  }

  // iOS guide
  if (showIOSGuide && isIos) {
    return (
      <div className="install-prompt" role="dialog" aria-label="Add to Home Screen">
        <button
          style={{
            position: 'absolute', top: '12px', right: '12px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-tertiary)',
          }}
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>

        <div className="install-prompt-header">
          <div className="install-prompt-icon">LM</div>
          <div>
            <div className="install-prompt-title">Add to Home Screen</div>
            <div className="install-prompt-subtitle">Get the app experience on iOS</div>
          </div>
        </div>

        <ol
          style={{
            paddingLeft: 'var(--space-5)',
            marginBottom: 'var(--space-3)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          {[
            <>Tap the <Share size={14} style={{ display: 'inline', color: 'var(--color-info)', verticalAlign: 'middle' }} /> share button in Safari</>,
            <>Select <strong style={{ color: 'var(--color-text-primary)' }}>"Add to Home Screen"</strong></>,
            <>Tap <strong style={{ color: 'var(--color-text-primary)' }}>"Add"</strong> to confirm</>,
          ].map((step, i) => (
            <li key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              {step}
            </li>
          ))}
        </ol>

        <button id="ios-dismiss" className="btn btn-ghost btn-sm btn-full" onClick={handleDismiss}>
          Got it
        </button>
      </div>
    );
  }

  return null;
}
