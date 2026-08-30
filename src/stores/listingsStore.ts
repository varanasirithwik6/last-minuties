// ============================================================
// Last Minuties — Phase 3: Listings Store (Zustand)
// Supabase Ticket Marketplace & Storage Integration
// ============================================================
import { create } from 'zustand';
import type { Listing, TicketFilters, CreateListingForm, ListingStatus } from '../types';
import { supabase, DEMO_MODE, getFriendlyAuthErrorMessage } from '../lib/supabase';
import { DEMO_LISTINGS, DEMO_MY_LISTINGS } from '../lib/demoData';
import { refreshListingUrgency, sortByUrgency, filterExpired } from '../lib/urgency';

interface ListingsState {
  listings: Listing[];
  myListings: Listing[];
  isLoading: boolean;
  error: string | null;
  filters: TicketFilters;

  // Actions
  fetchListings: () => Promise<void>;
  fetchMyListings: (userId: string) => Promise<void>;
  getListingById: (id: string) => Promise<Listing | null>;
  uploadTicketImage: (file: File, userId: string) => Promise<{ path?: string; error?: string }>;
  createListing: (
    form: CreateListingForm,
    sellerId: string,
    imageFile?: File | null
  ) => Promise<{ id?: string; error?: string }>;
  updateListing: (id: string, data: Partial<Listing>) => Promise<{ error?: string }>;
  cancelListing: (id: string) => Promise<{ error?: string }>;
  markSold: (id: string) => Promise<{ error?: string }>;
  setFilters: (filters: Partial<TicketFilters>) => void;
  getFilteredListings: () => Listing[];
}

const defaultFilters: TicketFilters = {
  sortBy: 'urgency',
};

// Helper to normalize Supabase row to Listing object
function mapDbListingToModel(row: any): Listing {
  const sellerObj = row.seller || (row.users ? row.users : undefined);
  return {
    id: row.id,
    sellerId: row.seller_id,
    seller: sellerObj ? {
      id: sellerObj.id,
      name: sellerObj.name || 'Student Seller',
      college: sellerObj.college || 'Campus Verified',
      profileImage: sellerObj.profile_image || undefined,
      phoneVerified: sellerObj.phone_verified ?? true,
      collegeVerified: sellerObj.college_verified ?? false,
      rating: Number(sellerObj.rating || 0),
      ratingCount: Number(sellerObj.rating_count || 0),
      connectionCount: Number(sellerObj.connection_count || 0),
    } : undefined,
    movie: row.movie || row.movie_name || '',
    theatre: row.theatre || row.theatre_name || '',
    date: row.show_date || row.date,
    showTime: (row.show_time || '').slice(0, 5),
    seats: Array.isArray(row.seats) ? row.seats : typeof row.seats === 'string' ? row.seats.split(',') : [],
    quantity: Number(row.quantity || 1),
    originalPrice: Number(row.original_price || 0),
    askingPrice: Number(row.asking_price || 0),
    ticketImageUrl: row.ticket_image_path || row.ticket_image_url || undefined,
    status: (row.status || 'AVAILABLE').toLowerCase() as ListingStatus,
    urgencyScore: Number(row.urgency_score || 50),
    urgencyLevel: row.urgency_level || 'available',
    createdAt: row.created_at || new Date().toISOString(),
    expiresAt: row.expires_at || new Date().toISOString(),
  };
}

export const useListingsStore = create<ListingsState>((set, get) => ({
  listings: [],
  myListings: [],
  isLoading: false,
  error: null,
  filters: defaultFilters,

  fetchListings: async () => {
    set({ isLoading: true, error: null });

    if (DEMO_MODE || !supabase) {
      await new Promise((r) => setTimeout(r, 400));
      const activeSeed = DEMO_LISTINGS.map(refreshListingUrgency);
      const filtered = filterExpired(activeSeed);
      set({ listings: sortByUrgency(filtered), isLoading: false });
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          seller:users!seller_id (
            id, name, college, profile_image,
            phone_verified, college_verified,
            rating, rating_count, connection_count
          )
        `)
        .in('status', ['AVAILABLE', 'available'])
        .gt('expires_at', nowIso)
        .order('expires_at', { ascending: true });

      if (error) throw error;

      const mappedListings = (data || []).map(mapDbListingToModel).map(refreshListingUrgency);
      const activeUnexpired = filterExpired(mappedListings);
      set({ listings: sortByUrgency(activeUnexpired), isLoading: false });
    } catch (err) {
      console.error('Fetch listings error:', err);
      // Fallback to local active items
      const localListings = DEMO_LISTINGS.map(refreshListingUrgency);
      set({ listings: sortByUrgency(filterExpired(localListings)), isLoading: false, error: null });
    }
  },

  fetchMyListings: async (userId: string) => {
    set({ isLoading: true });

    if (DEMO_MODE || !supabase) {
      await new Promise((r) => setTimeout(r, 300));
      set({ myListings: DEMO_MY_LISTINGS, isLoading: false });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(mapDbListingToModel).map(refreshListingUrgency);
      set({ myListings: mapped, isLoading: false });
    } catch (err) {
      console.error('Fetch my listings error:', err);
      set({ myListings: DEMO_MY_LISTINGS, isLoading: false });
    }
  },

  getListingById: async (id: string) => {
    // Check in-memory store first
    const existing = get().listings.find((l) => l.id === id) || get().myListings.find((l) => l.id === id);
    if (existing) return existing;

    if (DEMO_MODE || !supabase) {
      const demoFound = DEMO_LISTINGS.find((l) => l.id === id) || DEMO_MY_LISTINGS.find((l) => l.id === id);
      return demoFound ? refreshListingUrgency(demoFound) : null;
    }

    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          seller:users!seller_id (
            id, name, college, profile_image,
            phone_verified, college_verified,
            rating, rating_count, connection_count
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;
      return refreshListingUrgency(mapDbListingToModel(data));
    } catch (err) {
      console.error('Get listing error:', err);
      return null;
    }
  },

  uploadTicketImage: async (file: File, userId: string) => {
    if (DEMO_MODE || !supabase) {
      // Return local object URL for preview in demo mode
      const localUrl = URL.createObjectURL(file);
      return { path: localUrl };
    }

    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${userId}/${Date.now()}_${sanitizedName}`;

      const { data, error } = await supabase.storage
        .from('ticket-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;
      return { path: data?.path || filePath };
    } catch (err: any) {
      console.error('Ticket upload error:', err);
      return { error: 'Failed to upload ticket image. Please try again.' };
    }
  },

  createListing: async (form, sellerId, imageFile) => {
    set({ isLoading: true, error: null });

    let imagePath: string | undefined = form.ticketImageUrl;
    if (imageFile) {
      const uploadRes = await get().uploadTicketImage(imageFile, sellerId);
      if (uploadRes.error) {
        set({ isLoading: false });
        return { error: uploadRes.error };
      }
      imagePath = uploadRes.path;
    }

    const seatsArr = form.seats.split(',').map((s) => s.trim()).filter(Boolean);
    const showDateTime = new Date(`${form.date}T${form.showTime}:00`);

    if (DEMO_MODE || !supabase) {
      await new Promise((r) => setTimeout(r, 600));
      const newListing: Listing = {
        id: `listing-${Date.now()}`,
        sellerId,
        movie: form.movie.trim(),
        theatre: form.theatre.trim(),
        date: form.date,
        showTime: form.showTime,
        seats: seatsArr,
        quantity: Number(form.quantity),
        originalPrice: Number(form.originalPrice),
        askingPrice: Number(form.askingPrice),
        ticketImageUrl: imagePath,
        status: 'available',
        urgencyScore: 50,
        urgencyLevel: 'soon',
        createdAt: new Date().toISOString(),
        expiresAt: showDateTime.toISOString(),
        isDemo: true,
      };

      set((state) => ({
        myListings: [newListing, ...state.myListings],
        listings: sortByUrgency([newListing, ...state.listings]),
        isLoading: false,
      }));
      return { id: newListing.id };
    }

    try {
      const { data, error } = await supabase
        .from('listings')
        .insert({
          seller_id: sellerId,
          movie: form.movie.trim(),
          theatre: form.theatre.trim(),
          show_date: form.date,
          show_time: form.showTime,
          seats: seatsArr,
          quantity: Number(form.quantity),
          original_price: Number(form.originalPrice),
          asking_price: Number(form.askingPrice),
          ticket_image_path: imagePath || null,
          status: 'AVAILABLE',
          urgency_score: 50,
          urgency_level: 'available',
          expires_at: showDateTime.toISOString(),
        })
        .select(`
          *,
          seller:users!seller_id (
            id, name, college, profile_image,
            phone_verified, college_verified,
            rating, rating_count, connection_count
          )
        `)
        .single();

      if (error) {
        set({ isLoading: false });
        return { error: getFriendlyAuthErrorMessage(error) };
      }

      const createdListing = refreshListingUrgency(mapDbListingToModel(data));
      set((state) => ({
        myListings: [createdListing, ...state.myListings],
        listings: sortByUrgency([createdListing, ...state.listings]),
        isLoading: false,
      }));

      return { id: createdListing.id };
    } catch (err: any) {
      set({ isLoading: false });
      return { error: 'Failed to create listing. Please check the fields and try again.' };
    }
  },

  updateListing: async (id, data) => {
    set({ isLoading: true });

    if (DEMO_MODE || !supabase) {
      set((state) => ({
        myListings: state.myListings.map((l) => (l.id === id ? { ...l, ...data } : l)),
        listings: state.listings.map((l) => (l.id === id ? { ...l, ...data } : l)),
        isLoading: false,
      }));
      return {};
    }

    try {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (data.movie) updatePayload.movie = data.movie.trim();
      if (data.theatre) updatePayload.theatre = data.theatre.trim();
      if (data.date) updatePayload.show_date = data.date;
      if (data.showTime) updatePayload.show_time = data.showTime;
      if (data.seats) updatePayload.seats = data.seats;
      if (data.quantity) updatePayload.quantity = Number(data.quantity);
      if (data.originalPrice !== undefined) updatePayload.original_price = Number(data.originalPrice);
      if (data.askingPrice !== undefined) updatePayload.asking_price = Number(data.askingPrice);
      if (data.status) updatePayload.status = data.status.toUpperCase();
      if (data.date && data.showTime) {
        updatePayload.expires_at = new Date(`${data.date}T${data.showTime}:00`).toISOString();
      }

      const { error } = await supabase.from('listings').update(updatePayload).eq('id', id);

      if (error) throw error;

      set((state) => ({
        myListings: state.myListings.map((l) => (l.id === id ? { ...l, ...data } : l)),
        listings: state.listings.map((l) => (l.id === id ? { ...l, ...data } : l)),
        isLoading: false,
      }));
      return {};
    } catch (err: any) {
      set({ isLoading: false });
      return { error: 'Failed to update listing.' };
    }
  },

  cancelListing: async (id) => {
    return get().updateListing(id, { status: 'cancelled' });
  },

  markSold: async (id) => {
    return get().updateListing(id, { status: 'sold' });
  },

  setFilters: (newFilters) => {
    set((state) => ({ filters: { ...state.filters, ...newFilters } }));
  },

  getFilteredListings: () => {
    const { listings, filters } = get();
    let result = [...listings];

    // Filter unexpired and available only
    result = filterExpired(result).filter((l) => l.status === 'available' || l.status === 'contacted');

    if (filters.movie) {
      const q = filters.movie.toLowerCase();
      result = result.filter(
        (l) =>
          l.movie.toLowerCase().includes(q) ||
          l.theatre.toLowerCase().includes(q) ||
          l.showTime.toLowerCase().includes(q)
      );
    }

    if (filters.theatre) {
      result = result.filter((l) => l.theatre.toLowerCase().includes(filters.theatre!.toLowerCase()));
    }

    if (filters.date) {
      result = result.filter((l) => l.date === filters.date);
    }

    if (filters.timeRange === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      result = result.filter((l) => l.date === today);
    } else if (filters.timeRange === 'tomorrow') {
      const tmr = new Date();
      tmr.setDate(tmr.getDate() + 1);
      result = result.filter((l) => l.date === tmr.toISOString().slice(0, 10));
    } else if (filters.timeRange === 'starting_soon') {
      result = result.filter((l) => l.urgencyLevel === 'urgent' || l.urgencyLevel === 'hot' || l.urgencyLevel === 'soon');
    }

    if (filters.maxPrice != null && !isNaN(filters.maxPrice)) {
      result = result.filter((l) => l.askingPrice <= filters.maxPrice!);
    }

    switch (filters.sortBy) {
      case 'urgency':
        result.sort((a, b) => b.urgencyScore - a.urgencyScore);
        break;
      case 'price_asc':
        result.sort((a, b) => a.askingPrice - b.askingPrice);
        break;
      case 'recently_listed':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return result;
  },
}));
