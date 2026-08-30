import { useNavigate } from 'react-router-dom';
import { Ticket, Clock, Shield, ArrowRight, Star, Zap } from 'lucide-react';
import { DEMO_LISTINGS } from '../../lib/demoData';
import TicketCard from '../../components/tickets/TicketCard';

const FLOW_STEPS = [
  { emoji: '😬', label: 'Plans changed', sub: 'Can\'t make the show' },
  { emoji: '📸', label: 'List in 60s', sub: 'AI scans your ticket' },
  { emoji: '🔍', label: 'Buyer finds it', sub: 'Smart discovery' },
  { emoji: '💬', label: 'Connect', sub: 'Private in-app chat' },
  { emoji: '🤝', label: 'Exchange', sub: 'Directly between you' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const sampleListings = DEMO_LISTINGS.slice(0, 3);

  return (
    <div className="auth-page">
      {/* Animated background */}
      <div className="auth-bg">
        <div className="auth-bg-circle auth-bg-circle-1" />
        <div className="auth-bg-circle auth-bg-circle-2" />
        <div className="auth-bg-circle auth-bg-circle-3" />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', padding: '0 var(--space-5)' }}>
        {/* Header */}
        <div style={{ paddingTop: 'max(var(--space-10), env(safe-area-inset-top) + 24px)', marginBottom: 'var(--space-6)' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(249, 115, 22, 0.12)',
              border: '1px solid rgba(249, 115, 22, 0.25)',
              borderRadius: 'var(--radius-full)',
              padding: '4px 14px',
              marginBottom: 'var(--space-4)',
            }}
          >
            <Zap size={12} fill="currentColor" style={{ color: 'var(--color-brand-primary)' }} />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-brand-primary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              College Ticket Exchange
            </span>
          </div>
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
              marginBottom: 'var(--space-1)',
            }}
          >
            Last Minuties
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
            Plans changed. Tickets don't have to go to waste.
          </p>
        </div>

        {/* Hero */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 8vw, 3rem)',
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              marginBottom: 'var(--space-4)',
            }}
          >
            Can't make it
            <br />
            to the{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #f97316, #f59e0b)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              show?
            </span>
          </h1>
          <p
            style={{
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-6)',
              lineHeight: 'var(--leading-relaxed)',
            }}
          >
            Connect with college students who have spare tickets — or need one — right now.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <button
              id="landing-find-ticket"
              className="btn btn-primary btn-lg btn-full"
              onClick={() => navigate('/auth')}
            >
              <ArrowRight size={20} />
              Find a Ticket Now
            </button>
            <button
              id="landing-list-ticket"
              className="btn btn-secondary btn-lg btn-full"
              onClick={() => navigate('/auth')}
            >
              <Ticket size={20} />
              List Your Spare Ticket
            </button>
          </div>
        </div>

        {/* HOW IT WORKS flow */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div className="section-title" style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-base)' }}>
            ⚡ How it works
          </div>
          <div
            style={{
              background: 'rgba(249, 115, 22, 0.04)',
              border: '1px solid rgba(249, 115, 22, 0.12)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {FLOW_STEPS.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'rgba(249, 115, 22, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      flexShrink: 0,
                    }}
                  >
                    {step.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                      {step.sub}
                    </div>
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <ArrowRight size={14} style={{ color: 'var(--color-text-tertiary)', opacity: 0.5, marginLeft: 'auto' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-8)',
          }}
        >
          {[
            { icon: Ticket, title: 'List in 60s', desc: 'AI scans your ticket' },
            { icon: Clock, title: 'Last Minute', desc: 'Live urgency feed' },
            { icon: Shield, title: 'Verified', desc: 'College community' },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="card"
              style={{ textAlign: 'center', padding: 'var(--space-4) var(--space-3)' }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'rgba(249, 115, 22, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-2)',
                }}
              >
                <Icon size={18} style={{ color: 'var(--color-brand-primary)' }} />
              </div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-bold)',
                  color: 'var(--color-text-primary)',
                  marginBottom: '2px',
                }}
              >
                {title}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>{desc}</div>
            </div>
          ))}
        </div>

        {/* Sample tickets */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div className="section-title" style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-base)' }}>
            🔥 Happening Right Now
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {sampleListings.map((l) => (
              <div
                key={l.id}
                onClick={() => navigate('/auth')}
                style={{ cursor: 'pointer' }}
              >
                <TicketCard listing={l} />
              </div>
            ))}
          </div>
        </div>

        {/* Social proof */}
        <div
          className="card"
          style={{
            textAlign: 'center',
            marginBottom: 'var(--space-6)',
            background: 'rgba(249, 115, 22, 0.06)',
            border: '1px solid rgba(249, 115, 22, 0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginBottom: 'var(--space-2)' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={16} fill="#f59e0b" style={{ color: '#f59e0b' }} />
            ))}
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', fontWeight: 'var(--font-semibold)' }}>
            "Found a Coolie ticket 45 mins before show. Absolute lifesaver!"
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
            — IIT Madras student
          </div>
        </div>

        {/* Platform boundary disclaimer */}
        <div
          style={{
            background: 'rgba(6, 182, 212, 0.06)',
            border: '1px solid rgba(6, 182, 212, 0.15)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-info)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ℹ️ About Last Minuties
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            We're a <strong style={{ color: 'var(--color-text-primary)' }}>connector, not a seller</strong>.
            Last Minuties helps buyers and sellers find each other.
            All payments and ticket transfers happen <strong style={{ color: 'var(--color-text-primary)' }}>directly between students</strong>.
            We do not process payments, hold money, or guarantee transactions.
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', paddingBottom: 'max(var(--space-10), env(safe-area-inset-bottom) + 32px)' }}>
          <button
            id="landing-get-started-bottom"
            className="btn btn-primary btn-full"
            onClick={() => navigate('/auth')}
            style={{ marginBottom: 'var(--space-3)' }}
          >
            Get Started — It's Free
            <ArrowRight size={18} />
          </button>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
            Verified college students only • Phone OTP login
          </p>
        </div>
      </div>
    </div>
  );
}
