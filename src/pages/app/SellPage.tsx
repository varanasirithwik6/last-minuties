import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Edit3,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Shield,
  Clock,
  MapPin,
  Calendar,
  X,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../../stores/authStore';
import { useListingsStore } from '../../stores/listingsStore';
import { extractTicketFromImage, checkDuplicateDetailed, type DuplicateCheckResult } from '../../lib/gemini';
import type { CreateListingForm, ExtractedTicket } from '../../types';

type SellStep = 'method' | 'scanning' | 'form' | 'preview' | 'success';

const THEATRE_SUGGESTIONS = [
  'PVR VR Chennai',
  'PVR Forum Mall',
  'PVR Phoenix Market City',
  'PVR Skywalk',
  'INOX GVK One',
  'INOX Citi Centre',
  'IMAX Forum',
  'Cinepolis Nexus',
  'AGS Cinemas OMR',
  'Rohini Silver Screens',
  'SPI Palazzo Chennai',
];

const MOVIE_SUGGESTIONS = [
  'Coolie',
  'F1: The Movie',
  'Jurassic World: Rebirth',
  'Avengers: Doomsday',
  'Interstellar',
  'Pushpa 3',
  'Kalki 2898 AD',
];

export default function SellPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { createListing, listings, fetchListings, isLoading: storeLoading } = useListingsStore();
  const [step, setStep] = useState<SellStep>('method');
  const [ticketFile, setTicketFile] = useState<File | null>(null);
  const [ticketPreviewUrl, setTicketPreviewUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [scanMessage, setScanMessage] = useState('Reading ticket image with AI...');
  const [extractedData, setExtractedData] = useState<ExtractedTicket | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCheckResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch listings for duplicate detection
  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Defaults
  const today = new Date().toISOString().slice(0, 10);
  const nextHourTime = (() => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return d.toTimeString().slice(0, 5);
  })();

  const form = useForm<CreateListingForm>({
    defaultValues: {
      movie: '',
      theatre: '',
      date: today,
      showTime: nextHourTime,
      seats: '',
      quantity: 1,
      originalPrice: 200,
      askingPrice: 180,
    },
  });

  const formValues = form.watch();

  // ── Handle file selection & AI extraction ─────────────────────
  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setError('Please upload an image file (JPG, PNG, WEBP) or PDF.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('File size must be under 8MB.');
      return;
    }

    setTicketFile(file);
    const url = URL.createObjectURL(file);
    setTicketPreviewUrl(url);
    setError('');
    setDuplicateWarning(null);

    // Switch to AI scanning state
    setStep('scanning');
    setScanMessage('Scanning ticket with Gemini Vision AI...');

    const timer1 = setTimeout(() => setScanMessage('Detecting movie, cinema & showtime...'), 500);
    const timer2 = setTimeout(() => setScanMessage('Extracting seat numbers & pricing...'), 1000);

    try {
      const result = await extractTicketFromImage(file);
      clearTimeout(timer1);
      clearTimeout(timer2);

      setExtractedData(result);

      if (result.success) {
        // Pre-fill form fields with extracted data
        if (result.movie.value) form.setValue('movie', result.movie.value);
        if (result.theatre.value) form.setValue('theatre', result.theatre.value);
        if (result.date.value) form.setValue('date', result.date.value);
        if (result.showTime.value) form.setValue('showTime', result.showTime.value);
        if (result.seats.value && result.seats.value.length > 0) {
          form.setValue('seats', result.seats.value.join(', '));
        }
        if (result.quantity.value) form.setValue('quantity', result.quantity.value);
        if (result.originalPrice.value) {
          form.setValue('originalPrice', result.originalPrice.value);
          // Set fair asking price (e.g. 10-15% discount or original)
          const ask = Math.round(result.originalPrice.value * 0.9);
          form.setValue('askingPrice', ask > 0 ? ask : result.originalPrice.value);
        }

        // Run duplicate detection check
        const newListingDraft = {
          movie: result.movie.value || '',
          theatre: result.theatre.value || '',
          date: result.date.value || today,
          showTime: result.showTime.value || nextHourTime,
          seats: result.seats.value || [],
        };
        const dupCheck = checkDuplicateDetailed(newListingDraft, listings);
        if (dupCheck.isDuplicate) {
          setDuplicateWarning(dupCheck);
        }
      } else {
        setError(result.errorMessage || "Couldn't automatically read all details. Please enter them manually.");
      }

      setStep('form');
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setError("Couldn't analyze the image. Please enter the details manually.");
      setStep('form');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleRemoveImage = () => {
    setTicketFile(null);
    setTicketPreviewUrl('');
    setExtractedData(null);
  };

  const handleProceedToPreview = (data: CreateListingForm) => {
    if (Number(data.askingPrice) > Number(data.originalPrice)) {
      setError('Asking price cannot exceed the original ticket price (Fair Pricing Rule).');
      return;
    }

    // Check duplicate detection with current form values
    const seatList = data.seats.split(',').map((s) => s.trim()).filter(Boolean);
    const dupCheck = checkDuplicateDetailed(
      {
        movie: data.movie,
        theatre: data.theatre,
        date: data.date,
        showTime: data.showTime,
        seats: seatList,
      },
      listings
    );

    if (dupCheck.isDuplicate) {
      setDuplicateWarning(dupCheck);
    }

    setError('');
    setStep('preview');
  };

  const handlePublishListing = async () => {
    if (!user) {
      setError('You must be logged in to list a ticket.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const values = form.getValues();
    const result = await createListing(values, user.id, ticketFile);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setStep('success');
    }
  };

  const calculateHoursUntilShow = () => {
    try {
      const showDt = new Date(`${formValues.date}T${formValues.showTime}:00`);
      const diffMs = showDt.getTime() - Date.now();
      if (diffMs <= 0) return 'Show starting now';
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `Starts in ${hours}h ${mins}m`;
    } catch {
      return 'Today';
    }
  };

  return (
    <div className="page">
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        {step !== 'method' && step !== 'scanning' && step !== 'success' && (
          <button
            id="sell-back-btn"
            className="icon-btn"
            onClick={() => {
              if (step === 'preview') setStep('form');
              else if (step === 'form') setStep('method');
            }}
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800 }}>
            {step === 'method' && 'Sell a Ticket'}
            {step === 'scanning' && 'Analyzing Ticket...'}
            {step === 'form' && 'Ticket Details'}
            {step === 'preview' && 'Review & Publish'}
            {step === 'success' && 'Ticket Listed!'}
          </h1>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
            List your spare movie ticket for verified college peers.
          </p>
        </div>
      </div>

      {error && <div className="form-error-banner" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

      {/* ── STEP 1: METHOD SELECTION ── */}
      {step === 'method' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            {/* Upload Option (AI Powered) */}
            <div
              id="sell-method-upload"
              className="card"
              style={{
                border: '1.5px dashed var(--color-brand-primary)',
                textAlign: 'center',
                padding: 'var(--space-6) var(--space-4)',
                cursor: 'pointer',
                background: 'linear-gradient(180deg, rgba(249, 115, 22, 0.08) 0%, rgba(17, 24, 39, 0.6) 100%)',
                transition: 'all 0.2s ease',
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(249, 115, 22, 0.2)',
                  color: 'var(--color-brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-3)',
                }}
              >
                <Sparkles size={26} />
              </div>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 800, marginBottom: '4px' }}>
                AI Ticket Scanner
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
                Upload screenshot or PDF — Gemini extracts movie, time, seats & price automatically
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                <span className="badge badge-soon">✨ Auto-Extract</span>
                <span className="badge badge-verified">🔒 Secure Storage</span>
              </div>
            </div>

            {/* Manual Entry Option */}
            <div
              id="sell-method-manual"
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                cursor: 'pointer',
                border: '1px solid var(--color-border)',
                transition: 'all 0.2s ease',
              }}
              onClick={() => setStep('form')}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-brand-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Edit3 size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Enter Details Manually</h4>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                  Quickly type movie name, theatre, seats, and price
                </p>
              </div>
              <ArrowRight size={18} style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
          </div>

          {/* Policy Card */}
          <div
            style={{
              background: 'rgba(6, 182, 212, 0.06)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-4)',
              display: 'flex',
              gap: 'var(--space-3)',
            }}
          >
            <Shield size={20} style={{ color: 'var(--color-brand-secondary)', flexShrink: 0 }} />
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              <strong>Fair Price Policy:</strong> Tickets cannot be sold above the original price to prevent scalping. Verified college students only.
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 1.5: AI SCANNING ANIMATION ── */}
      {step === 'scanning' && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(249, 115, 22, 0.15)',
              color: 'var(--color-brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
              animation: 'pulse 1.5s infinite',
            }}
          >
            <Sparkles size={32} />
          </div>

          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, marginBottom: '8px' }}>
            Reading your ticket...
          </h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-brand-primary)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
            {scanMessage}
          </p>

          <div style={{ maxWidth: '280px', margin: '0 auto var(--space-6)' }}>
            <div
              style={{
                height: '4px',
                width: '100%',
                background: 'var(--color-surface-2)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: '60%',
                  background: 'var(--color-brand-primary)',
                  borderRadius: '2px',
                  animation: 'pulse 1s infinite alternate',
                }}
              />
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setStep('form')}
          >
            Skip & Enter Manually
          </button>
        </div>
      )}

      {/* ── STEP 2: TICKET DETAILS FORM ── */}
      {step === 'form' && (
        <form onSubmit={form.handleSubmit(handleProceedToPreview)}>
          {/* AI Extracted Banner Notice */}
          {extractedData && extractedData.success && (
            <div
              style={{
                background: 'rgba(249, 115, 22, 0.1)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-3) var(--space-4)',
                marginBottom: 'var(--space-4)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <Sparkles size={18} style={{ color: 'var(--color-brand-primary)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-xs)', color: 'var(--color-text-primary)' }}>
                  ✨ AI Ticket Extraction Active
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Please review and confirm the extracted details below before publishing. All fields can be edited.
                </div>
              </div>
            </div>
          )}

          {/* Duplicate Detection Warning */}
          {duplicateWarning && (
            <div
              style={{
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                borderRadius: 'var(--radius-xl)',
                padding: 'var(--space-3) var(--space-4)',
                marginBottom: 'var(--space-4)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <AlertTriangle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}>
                  ⚠️ Possible Duplicate Listing
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  {duplicateWarning.reason || 'An active listing with matching show details exists. Please ensure this ticket has not already been posted.'}
                </div>
              </div>
            </div>
          )}

          {/* Uploaded File Preview Pill (if any) */}
          {ticketPreviewUrl && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '8px 12px',
                marginBottom: 'var(--space-4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img
                  src={ticketPreviewUrl}
                  alt="Ticket"
                  style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }}
                />
                <div>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Ticket Attached</span>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
                    {ticketFile?.name || 'Image'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleRemoveImage}
                style={{ color: 'var(--color-error)' }}
              >
                <X size={14} /> Remove
              </button>
            </div>
          )}

          {/* Movie Name */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>Movie Name *</label>
              {extractedData?.movie.value && (
                <span className="badge badge-verified" style={{ fontSize: '10px', padding: '1px 6px' }}>
                  ✓ {extractedData.movie.confidence} confidence
                </span>
              )}
            </div>
            <input
              id="sell-movie-input"
              type="text"
              className="form-input"
              placeholder="e.g. Coolie"
              {...form.register('movie', { required: 'Movie name is required' })}
            />
            {/* Suggestions */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {MOVIE_SUGGESTIONS.slice(0, 4).map((m) => (
                <button
                  key={m}
                  type="button"
                  className="chat-chip"
                  onClick={() => form.setValue('movie', m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Theatre Name */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>Theatre Name *</label>
              {extractedData?.theatre.value && (
                <span className="badge badge-verified" style={{ fontSize: '10px', padding: '1px 6px' }}>
                  ✓ {extractedData.theatre.confidence} confidence
                </span>
              )}
            </div>
            <input
              id="sell-theatre-input"
              type="text"
              className="form-input"
              placeholder="e.g. PVR VR Chennai"
              {...form.register('theatre', { required: 'Theatre name is required' })}
            />
            {/* Suggestions */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {THEATRE_SUGGESTIONS.slice(0, 3).map((t) => (
                <button
                  key={t}
                  type="button"
                  className="chat-chip"
                  onClick={() => form.setValue('theatre', t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ margin: 0 }}>Show Date *</label>
              </div>
              <input
                id="sell-date-input"
                type="date"
                className="form-input"
                min={today}
                {...form.register('date', { required: 'Show date is required' })}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ margin: 0 }}>Show Time *</label>
              </div>
              <input
                id="sell-time-input"
                type="time"
                className="form-input"
                {...form.register('showTime', { required: 'Show time is required' })}
              />
            </div>
          </div>

          {/* Seats & Quantity Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ margin: 0 }}>Seat(s) *</label>
                {extractedData?.seats.value && (
                  <span className="badge badge-soon" style={{ fontSize: '10px', padding: '1px 6px' }}>
                    {extractedData.seats.confidence} confidence
                  </span>
                )}
              </div>
              <input
                id="sell-seats-input"
                type="text"
                className="form-input"
                placeholder="e.g. G12, G13"
                {...form.register('seats', { required: 'Seat number(s) required' })}
              />
            </div>
            <div>
              <label className="form-label">Tickets</label>
              <select
                id="sell-quantity-select"
                className="form-input"
                {...form.register('quantity', { valueAsNumber: true })}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'ticket' : 'tickets'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Prices Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            <div>
              <label className="form-label">Original Price (₹) *</label>
              <input
                id="sell-original-price"
                type="number"
                min={0}
                className="form-input"
                placeholder="200"
                {...form.register('originalPrice', {
                  required: 'Original price required',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Price must be greater than 0' },
                })}
              />
            </div>
            <div>
              <label className="form-label">Asking Price (₹) *</label>
              <input
                id="sell-asking-price"
                type="number"
                min={0}
                className="form-input"
                placeholder="180"
                {...form.register('askingPrice', {
                  required: 'Asking price required',
                  valueAsNumber: true,
                  min: { value: 1, message: 'Asking price must be greater than 0' },
                })}
              />
            </div>
          </div>

          <button
            id="sell-preview-btn"
            type="submit"
            className="btn btn-primary btn-full btn-lg"
          >
            Review Ticket Preview <ArrowRight size={18} />
          </button>
        </form>
      )}

      {/* ── STEP 3: TICKET PREVIEW ── */}
      {step === 'preview' && (
        <div>
          {/* Visual Ticket Preview Card */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(17,24,39,0.95))',
              border: '1.5px solid rgba(249,115,22,0.3)',
              borderRadius: 'var(--radius-2xl)',
              padding: 'var(--space-5)',
              marginBottom: 'var(--space-4)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Top Row: Urgency & Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <span className="badge badge-urgent">
                🔥 {calculateHoursUntilShow()}
              </span>
              <span className="badge badge-verified">
                ✓ Phone Verified
              </span>
            </div>

            {/* Movie Title */}
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-3xl)',
                fontWeight: 900,
                color: '#fff',
                marginBottom: '4px',
                letterSpacing: '-0.02em',
              }}
            >
              {formValues.movie.toUpperCase()}
            </h2>

            {/* Theatre & Showtime */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} style={{ color: 'var(--color-brand-primary)' }} />
                {formValues.theatre}
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={14} />
                {formValues.date === today
                  ? 'Today'
                  : formValues.date === (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })()
                  ? 'Tomorrow'
                  : formValues.date}
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} />
                {formValues.showTime}
              </span>
            </div>

            {/* Ticket Seat Info */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3) var(--space-4)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Seats</div>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: '#fff' }}>
                  {formValues.seats.toUpperCase()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Quantity</div>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: '#fff' }}>
                  {formValues.quantity} {formValues.quantity === 1 ? 'Ticket' : 'Tickets'}
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px dashed var(--color-border)', paddingTop: 'var(--space-3)' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>Original Price</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', textDecoration: 'line-through' }}>
                  ₹{formValues.originalPrice}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-brand-primary)', fontWeight: 600 }}>Asking Price</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 900, color: '#fff' }}>
                  ₹{formValues.askingPrice}
                </div>
              </div>
            </div>
          </div>

          {/* Student Transfer Notice */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-3) var(--space-4)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.45,
              marginBottom: 'var(--space-5)',
            }}
          >
            ℹ️ <strong>Direct Transfer Notice:</strong> Last Minuties connects verified students. Payment and ticket handover happen directly between you and the buyer.
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={() => setStep('form')}
              disabled={isSubmitting}
            >
              Edit Details
            </button>
            <button
              id="sell-publish-btn"
              type="button"
              className="btn btn-primary btn-full"
              onClick={handlePublishListing}
              disabled={isSubmitting || storeLoading}
            >
              {isSubmitting || storeLoading ? (
                <span className="spinner" />
              ) : (
                <>
                  <Sparkles size={16} /> Publish Ticket
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: SUCCESS CONFIRMATION ── */}
      {step === 'success' && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.15)',
              color: 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
            }}
          >
            <CheckCircle2 size={36} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800, marginBottom: '8px' }}>
            Ticket Listed!
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', maxWidth: '300px', margin: '0 auto var(--space-6)' }}>
            Your ticket is now live and visible to students on campus searching for last-minute seats.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <button
              id="success-view-activity-btn"
              className="btn btn-primary btn-full btn-lg"
              onClick={() => navigate('/activity')}
            >
              View in My Listings
            </button>
            <button
              className="btn btn-secondary btn-full"
              onClick={() => navigate('/find')}
            >
              Browse All Tickets
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
