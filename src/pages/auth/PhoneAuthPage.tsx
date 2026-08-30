import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, ArrowRight, Phone, Shield, GraduationCap, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { SAMPLE_COLLEGES } from '../../lib/demoData';
import { DEMO_MODE } from '../../lib/supabase';

type Step = 'phone' | 'otp' | 'profile';

interface PhoneForm {
  phone: string;
}

interface ProfileForm {
  name: string;
  college: string;
  studentId: string;
}

export default function PhoneAuthPage() {
  const navigate = useNavigate();
  const { signInWithPhone, verifyOtp, completeProfile, loginAsDemo, isNewUser } = useAuthStore();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const phoneForm = useForm<PhoneForm>();
  const profileForm = useForm<ProfileForm>();

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer((n) => n - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  // Focus first OTP input when reaching OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // ============================================================
  // Phone submit (Send OTP)
  // ============================================================
  const handlePhoneSubmit = async (data: PhoneForm) => {
    setIsLoading(true);
    setError('');
    const rawDigits = data.phone.replace(/\D/g, '');
    if (rawDigits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      setIsLoading(false);
      return;
    }
    const fullPhone = `+91${rawDigits}`;
    const result = await signInWithPhone(fullPhone);
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setPhone(fullPhone);
      setStep('otp');
      setResendTimer(30);
    }
  };

  // ============================================================
  // OTP handling
  // ============================================================
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    if (newOtp.every((d) => d !== '')) {
      verifyOtpCode(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (digits.length === 6) {
      setOtp(digits.split(''));
      verifyOtpCode(digits);
    }
  };

  const verifyOtpCode = async (code: string) => {
    setIsLoading(true);
    setError('');
    const result = await verifyOtp(phone, code);
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
      setOtp(Array(6).fill(''));
      otpRefs.current[0]?.focus();
    } else {
      if (result.isNewUser || isNewUser) {
        setStep('profile');
      } else {
        // Returning user with complete profile -> go straight to Home
        navigate('/home');
      }
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || isLoading) return;
    setIsLoading(true);
    setError('');
    const result = await signInWithPhone(phone);
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setResendTimer(30);
      setOtp(Array(6).fill(''));
      otpRefs.current[0]?.focus();
    }
  };

  // ============================================================
  // Profile submit (New User Setup)
  // ============================================================
  const handleProfileSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    setError('');
    const result = await completeProfile({
      name: data.name,
      college: data.college,
      studentId: data.studentId,
    });
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      navigate('/home');
    }
  };

  const stepIndex = step === 'phone' ? 0 : step === 'otp' ? 1 : 2;

  // Masked phone for privacy display
  const maskedPhone = phone.length >= 10
    ? `+91 ••••• •••${phone.slice(-2)}`
    : phone;

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-circle auth-bg-circle-1" />
        <div className="auth-bg-circle auth-bg-circle-2" />
        <div className="auth-bg-circle auth-bg-circle-3" />
      </div>

      <div className="auth-container">
        {/* Back button */}
        {step !== 'phone' ? (
          <button
            id="auth-back"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setStep(step === 'otp' ? 'phone' : 'otp');
              setError('');
            }}
            style={{ alignSelf: 'flex-start', marginBottom: 'var(--space-4)' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
        ) : (
          <button
            id="auth-to-landing"
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/')}
            style={{ alignSelf: 'flex-start', marginBottom: 'var(--space-4)' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}

        {/* Logo */}
        <div className="auth-logo">Last Minuties</div>
        <div className="auth-tagline">Plans changed. Tickets don't have to.</div>

        {/* Demo mode banner (only when Supabase credentials not yet supplied) */}
        {DEMO_MODE && (
          <div
            style={{
              background: 'rgba(249, 115, 22, 0.1)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-3) var(--space-4)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-brand-primary)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <strong>Supabase Setup Mode</strong> — Use test OTP <strong>123456</strong> or{' '}
            <button
              id="demo-login-btn"
              onClick={loginAsDemo}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-brand-primary)',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontWeight: 'var(--font-semibold)',
              }}
            >
              quick preview ↗
            </button>
          </div>
        )}

        {/* Progress steps */}
        <div className="auth-steps">
          {['Phone', 'Verify OTP', 'Profile'].map((label, i) => (
            <div key={label} className="auth-step-indicator">
              <div
                className={`auth-step-circle ${
                  i < stepIndex ? 'completed' : i === stepIndex ? 'active' : ''
                }`}
              >
                {i < stepIndex ? '✓' : i + 1}
              </div>
              <span className="auth-step-label">{label}</span>
            </div>
          ))}
        </div>

        {/* Main card */}
        <div className="auth-card">
          {/* ============================================================
              Step 1: Phone
              ============================================================ */}
          {step === 'phone' && (
            <div>
              <div className="auth-icon-badge">
                <Phone size={24} />
              </div>
              <h2 className="auth-step-title">Enter your mobile number</h2>
              <p className="auth-step-desc">
                We'll send you a 6-digit OTP to verify your account.
              </p>

              {/* Privacy Shield Notice */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(6, 182, 212, 0.08)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '8px 12px',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <Shield size={14} style={{ color: 'var(--color-brand-secondary)', flexShrink: 0 }} />
                <span>
                  <strong>Privacy Rule:</strong> Your phone number will never be shown to other students.
                </span>
              </div>

              {error && <div className="form-error-banner">{error}</div>}

              <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)}>
                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <label htmlFor="phone-input" className="form-label">
                    Mobile Number
                  </label>
                  <div className="phone-input-wrapper">
                    <span className="phone-prefix">+91</span>
                    <input
                      id="phone-input"
                      type="tel"
                      className="phone-input-field"
                      placeholder="98765 43210"
                      maxLength={10}
                      autoFocus
                      {...phoneForm.register('phone', {
                        required: 'Phone number is required',
                        pattern: {
                          value: /^[6-9]\d{9}$/,
                          message: 'Enter a valid 10-digit Indian mobile number',
                        },
                      })}
                    />
                  </div>
                  {phoneForm.formState.errors.phone && (
                    <span className="form-error">
                      {phoneForm.formState.errors.phone.message}
                    </span>
                  )}
                </div>

                <button
                  id="phone-submit-btn"
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="spinner" />
                  ) : (
                    <>
                      Send OTP <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ============================================================
              Step 2: OTP
              ============================================================ */}
          {step === 'otp' && (
            <div>
              <div className="auth-icon-badge">
                <Shield size={24} />
              </div>
              <h2 className="auth-step-title">Enter Verification Code</h2>
              <p className="auth-step-desc">
                Sent to <strong style={{ color: 'var(--color-text-primary)' }}>{maskedPhone}</strong>
              </p>

              {error && <div className="form-error-banner">{error}</div>}

              <div style={{ marginBottom: 'var(--space-5)' }}>
                <div className="otp-inputs" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className={`otp-digit ${digit ? 'filled' : ''}`}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      autoComplete="one-time-code"
                      aria-label={`OTP digit ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              <button
                id="otp-verify-btn"
                type="button"
                className="btn btn-primary btn-full btn-lg"
                onClick={() => verifyOtpCode(otp.join(''))}
                disabled={isLoading || otp.some((d) => !d)}
                style={{ marginBottom: 'var(--space-4)' }}
              >
                {isLoading ? <span className="spinner" /> : 'Verify Code'}
              </button>

              <div style={{ textAlign: 'center' }}>
                {resendTimer > 0 ? (
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
                    Resend code in <strong>{resendTimer}s</strong>
                  </span>
                ) : (
                  <button
                    id="resend-otp-btn"
                    className="btn btn-ghost btn-sm"
                    onClick={handleResend}
                    disabled={isLoading}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ============================================================
              Step 3: Profile Setup (New User)
              ============================================================ */}
          {step === 'profile' && (
            <div>
              <div className="auth-icon-badge">
                <GraduationCap size={24} />
              </div>
              <h2 className="auth-step-title">Set up your student profile</h2>
              <p className="auth-step-desc">
                Your college identity builds trust with other students on campus.
              </p>

              {/* Status Preview Card */}
              <div
                style={{
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-3) var(--space-4)',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                  Privacy & Verification Status:
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="badge badge-verified">
                    <CheckCircle2 size={11} /> Phone Verified
                  </span>
                  <span className="badge badge-pending">
                    <AlertCircle size={11} /> Verification Pending
                  </span>
                </div>
              </div>

              {error && <div className="form-error-banner">{error}</div>}

              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)}>
                {/* Full name */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label htmlFor="profile-name" className="form-label">
                    Full Name *
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rahul Sharma"
                    autoFocus
                    {...profileForm.register('name', {
                      required: 'Name is required',
                      minLength: { value: 2, message: 'Name must be at least 2 characters' },
                    })}
                  />
                  {profileForm.formState.errors.name && (
                    <span className="form-error">
                      {profileForm.formState.errors.name.message}
                    </span>
                  )}
                </div>

                {/* College */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label htmlFor="profile-college" className="form-label">
                    College / University *
                  </label>
                  <select
                    id="profile-college"
                    className="form-input"
                    {...profileForm.register('college', {
                      required: 'Please select your college',
                    })}
                  >
                    <option value="">Select your college</option>
                    {SAMPLE_COLLEGES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {profileForm.formState.errors.college && (
                    <span className="form-error">
                      {profileForm.formState.errors.college.message}
                    </span>
                  )}
                </div>

                {/* Student ID (Optional for MVP) */}
                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <label htmlFor="profile-student-id" className="form-label">
                    Student ID Number (Optional)
                  </label>
                  <input
                    id="profile-student-id"
                    type="text"
                    className="form-input"
                    placeholder="e.g. CS21B045"
                    {...profileForm.register('studentId')}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                    Used solely for future verification against college registries. Kept 100% confidential.
                  </div>
                </div>

                <button
                  id="profile-submit-btn"
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={isLoading}
                >
                  {isLoading ? <span className="spinner" /> : 'Complete Setup & Enter App'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
