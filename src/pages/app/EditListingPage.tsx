import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useListingsStore } from '../../stores/listingsStore';
import { useAuthStore } from '../../stores/authStore';
import type { CreateListingForm, Listing } from '../../types';

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getListingById, updateListing } = useListingsStore();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');

  const form = useForm<CreateListingForm>();

  useEffect(() => {
    async function load() {
      if (!id) return;
      setIsFetching(true);
      const found = await getListingById(id);
      if (found) {
        setListing(found);
        form.reset({
          movie: found.movie,
          theatre: found.theatre,
          date: found.date,
          showTime: found.showTime,
          seats: found.seats.join(', '),
          quantity: found.quantity,
          originalPrice: found.originalPrice,
          askingPrice: found.askingPrice,
        });
      }
      setIsFetching(false);
    }
    load();
  }, [id, getListingById, form]);

  if (isFetching) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 'var(--space-12)' }}>
        <div className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="page">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <h3 className="empty-state-title">Listing not found</h3>
          <p className="empty-state-subtitle">This ticket listing does not exist or has been removed.</p>
          <button className="btn btn-primary" onClick={() => navigate('/activity')}>
            My Activity
          </button>
        </div>
      </div>
    );
  }

  // Authorization check
  if (user && listing.sellerId !== user.id) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <h3 className="empty-state-title">Not Authorized</h3>
          <p className="empty-state-subtitle">You can only edit tickets that you have listed.</p>
          <button className="btn btn-primary" onClick={() => navigate('/activity')}>
            Return to Activity
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async (data: CreateListingForm) => {
    if (Number(data.askingPrice) > Number(data.originalPrice)) {
      setError('Asking price cannot exceed the original ticket price.');
      return;
    }

    setIsLoading(true);
    setError('');

    const seatsArr = data.seats.split(',').map((s) => s.trim()).filter(Boolean);
    const result = await updateListing(id!, {
      movie: data.movie.trim(),
      theatre: data.theatre.trim(),
      date: data.date,
      showTime: data.showTime,
      seats: seatsArr,
      quantity: Number(data.quantity),
      originalPrice: Number(data.originalPrice),
      askingPrice: Number(data.askingPrice),
    });

    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      navigate('/activity');
    }
  };

  return (
    <div className="page">
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <button id="edit-back-btn" className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 800 }}>
            Edit Ticket Listing
          </h1>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
            Update movie information, showtime, or your asking price.
          </p>
        </div>
      </div>

      {error && <div className="form-error-banner" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

      <form onSubmit={form.handleSubmit(handleSave)}>
        {/* Movie Name */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <label className="form-label">Movie Name *</label>
          <input
            id="edit-movie"
            type="text"
            className="form-input"
            {...form.register('movie', { required: 'Movie name is required' })}
          />
        </div>

        {/* Theatre Name */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <label className="form-label">Theatre Name *</label>
          <input
            id="edit-theatre"
            type="text"
            className="form-input"
            {...form.register('theatre', { required: 'Theatre name is required' })}
          />
        </div>

        {/* Date & Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div>
            <label className="form-label">Show Date *</label>
            <input
              id="edit-date"
              type="date"
              className="form-input"
              {...form.register('date', { required: 'Date is required' })}
            />
          </div>
          <div>
            <label className="form-label">Show Time *</label>
            <input
              id="edit-time"
              type="time"
              className="form-input"
              {...form.register('showTime', { required: 'Time is required' })}
            />
          </div>
        </div>

        {/* Seats & Quantity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div>
            <label className="form-label">Seats *</label>
            <input
              id="edit-seats"
              type="text"
              className="form-input"
              {...form.register('seats', { required: 'Seat number is required' })}
            />
          </div>
          <div>
            <label className="form-label">Quantity</label>
            <select
              id="edit-quantity"
              className="form-input"
              {...form.register('quantity', { valueAsNumber: true })}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? 'ticket' : 'tickets'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Pricing */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <div>
            <label className="form-label">Original Price (₹) *</label>
            <input
              id="edit-original-price"
              type="number"
              min={0}
              className="form-input"
              {...form.register('originalPrice', { required: true, valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="form-label">Asking Price (₹) *</label>
            <input
              id="edit-asking-price"
              type="number"
              min={0}
              className="form-input"
              {...form.register('askingPrice', { required: true, valueAsNumber: true })}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button
            type="button"
            className="btn btn-secondary btn-full"
            onClick={() => navigate('/activity')}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            id="edit-save-btn"
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isLoading}
          >
            {isLoading ? <span className="spinner" /> : <>Save Changes <Save size={16} /></>}
          </button>
        </div>
      </form>
    </div>
  );
}
