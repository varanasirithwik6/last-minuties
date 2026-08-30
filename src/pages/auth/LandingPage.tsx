import { useNavigate } from 'react-router-dom';
import { Ticket, Clock, Shield, ArrowRight, Star } from 'lucide-react';
import { DEMO_LISTINGS } from '../../lib/demoData';
import TicketCard from '../../components/tickets/TicketCard';

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
        <div style={{ paddingTop: 'max(var(--space-12), env(safe-area-inset-top) + 24px)', marginBottom: 'var(--space-8)' }}>
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
              marginBottom: 'var(--space-2)',
            }}
          >
            Last Minuties
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
            Plans changed. Tickets don't have to.
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
              fontSize: 'var(--text-lg)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-6)',
              lineHeight: 'var(--leading-relaxed)',
            }}
          >
            Connect with college students looking for last-minute movie tickets — instantly.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <button
              id="landing-get-started"
              className="btn btn-primary btn-lg btn-full"
              onClick={() => navigate('/auth')}
            >
              Get Started
              <ArrowRight size={20} />
            </button>
            <button
              id="landing-see-tickets"
              className="btn btn-secondary btn-lg btn-full"
              onClick={() => navigate('/auth')}
            >
              <Ticket size={20} />
              Browse Tickets
            </button>
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
          <div className="section-title">
            <span>🔥</span> Happening Right Now
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

        {/* Disclaimer */}
        <div
          style={{
            textAlign: 'center',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-tertiary)',
            paddingBottom: 'max(var(--space-8), env(safe-area-inset-bottom) + 24px)',
            lineHeight: 1.6,
          }}
        >
          Last Minuties connects buyers and sellers — we don't sell, buy, or process payments.
          All transactions happen directly between students.
        </div>
      </div>
    </div>
  );
}
