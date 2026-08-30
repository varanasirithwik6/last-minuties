// ============================================================
// Last Minuties — Phase 4: Connection Store (Zustand)
// Buyer–Seller Connection System via Supabase
// ============================================================
import { create } from 'zustand';
import type { ConnectionRequest, ConnectionStatus } from '../types';
import { supabase, DEMO_MODE } from '../lib/supabase';

// ── Demo seed data ──────────────────────────────────────────
const DEMO_REQUESTS: ConnectionRequest[] = [
  {
    id: 'req-demo-1',
    listingId: 'listing-1',
    listing: {
      id: 'listing-1',
      movie: 'F1: The Movie',
      theatre: 'PVR VR Chennai',
      date: new Date().toISOString().slice(0, 10),
      showTime: '21:30',
      askingPrice: 240,
      originalPrice: 280,
      seats: ['D7', 'D8'],
      status: 'contacted',
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    },
    buyerId: 'user-demo-buyer',
    buyer: {
      id: 'user-demo-buyer',
      name: 'Rahul M',
      college: 'IIT Madras',
      phoneVerified: true,
      collegeVerified: true,
      rating: 4.9,
      ratingCount: 14,
      connectionCount: 14,
    },
    sellerId: 'demo-user',
    seller: {
      id: 'demo-user',
      name: 'You',
      college: 'SRM University',
      phoneVerified: true,
      collegeVerified: true,
      rating: 4.8,
      ratingCount: 12,
      connectionCount: 12,
    },
    status: 'pending',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    unreadCount: 1,
  },
];

// ── Helper: map DB row → ConnectionRequest ──────────────────
function mapDbToConnectionRequest(row: any): ConnectionRequest {
  const buyer = row.buyer_profile || row.buyer || undefined;
  const seller = row.seller_profile || row.seller || undefined;
  const listing = row.listing || undefined;

  return {
    id: row.id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    status: (row.status || 'PENDING').toLowerCase() as ConnectionStatus,
    initialMessage: row.initial_message || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    unreadCount: row.unread_count || 0,
    listing: listing
      ? {
          id: listing.id,
          movie: listing.movie || listing.movie_name,
          theatre: listing.theatre || listing.theatre_name,
          date: listing.show_date || listing.date,
          showTime: (listing.show_time || listing.showTime || '').slice(0, 5),
          askingPrice: Number(listing.asking_price || listing.askingPrice || 0),
          originalPrice: Number(listing.original_price || listing.originalPrice || 0),
          seats: Array.isArray(listing.seats)
            ? listing.seats
            : typeof listing.seats === 'string'
            ? listing.seats.split(',')
            : [],
          status: (listing.status || 'available').toLowerCase() as any,
          expiresAt: listing.expires_at || listing.expiresAt || new Date().toISOString(),
        }
      : undefined,
    buyer: buyer
      ? {
          id: buyer.id,
          name: buyer.name || 'Student',
          college: buyer.college || 'Campus',
          profileImage: buyer.profile_image || buyer.profileImage,
          phoneVerified: buyer.phone_verified ?? buyer.phoneVerified ?? false,
          collegeVerified: buyer.college_verified ?? buyer.collegeVerified ?? false,
          rating: Number(buyer.rating || 0),
          ratingCount: Number(buyer.rating_count || buyer.ratingCount || 0),
          connectionCount: Number(buyer.connection_count || buyer.connectionCount || 0),
        }
      : undefined,
    seller: seller
      ? {
          id: seller.id,
          name: seller.name || 'Student',
          college: seller.college || 'Campus',
          profileImage: seller.profile_image || seller.profileImage,
          phoneVerified: seller.phone_verified ?? seller.phoneVerified ?? false,
          collegeVerified: seller.college_verified ?? seller.collegeVerified ?? false,
          rating: Number(seller.rating || 0),
          ratingCount: Number(seller.rating_count || seller.ratingCount || 0),
          connectionCount: Number(seller.connection_count || seller.connectionCount || 0),
        }
      : undefined,
  };
}

// ── Store interface ─────────────────────────────────────────
interface ConnectionState {
  // Incoming (as seller)
  incomingRequests: ConnectionRequest[];
  // Outgoing (as buyer)
  outgoingRequests: ConnectionRequest[];
  // Accepted connections (both directions)
  activeConnections: ConnectionRequest[];

  isLoading: boolean;
  error: string | null;

  // Actions
  fetchMyConnections: (userId: string) => Promise<void>;
  createRequest: (
    listingId: string,
    buyerId: string,
    sellerId: string,
    initialMessage?: string
  ) => Promise<{ id?: string; error?: string }>;
  acceptRequest: (connectionId: string) => Promise<{ error?: string }>;
  declineRequest: (connectionId: string) => Promise<{ error?: string }>;
  cancelRequest: (connectionId: string) => Promise<{ error?: string }>;
  markCompleted: (connectionId: string) => Promise<{ error?: string }>;
  getConnectionForListing: (listingId: string, buyerId: string) => ConnectionRequest | undefined;
  subscribeToUpdates: (userId: string) => () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  incomingRequests: [],
  outgoingRequests: [],
  activeConnections: [],
  isLoading: false,
  error: null,

  // ── Fetch all connections for a user ──────────────────────
  fetchMyConnections: async (userId: string) => {
    set({ isLoading: true, error: null });

    if (DEMO_MODE || !supabase) {
      await new Promise((r) => setTimeout(r, 300));
      set({
        incomingRequests: DEMO_REQUESTS.filter((r) => r.sellerId === userId || r.sellerId === 'demo-user'),
        outgoingRequests: DEMO_REQUESTS.filter((r) => r.buyerId === userId),
        activeConnections: DEMO_REQUESTS.filter((r) => r.status === 'accepted'),
        isLoading: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          listing:listings!listing_id (
            id, movie, theatre, show_date, show_time,
            asking_price, original_price, seats, status, expires_at
          ),
          buyer_profile:users!buyer_id (
            id, name, college, profile_image, phone_verified, college_verified
          ),
          seller_profile:users!seller_id (
            id, name, college, profile_image, phone_verified, college_verified
          )
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const all = (data || []).map(mapDbToConnectionRequest);

      set({
        incomingRequests: all.filter((c) => c.sellerId === userId && c.status === 'pending'),
        outgoingRequests: all.filter((c) => c.buyerId === userId),
        activeConnections: all.filter((c) => c.status === 'accepted'),
        isLoading: false,
      });
    } catch (err: any) {
      console.error('[connectionStore] fetchMyConnections error:', err);
      set({ isLoading: false, error: 'Failed to load connections.' });
    }
  },

  // ── Create a new PENDING connection request ───────────────
  createRequest: async (listingId, buyerId, sellerId, initialMessage) => {
    // Check for existing connection
    const existing = get().getConnectionForListing(listingId, buyerId);
    if (existing) {
      return { id: existing.id };
    }

    if (DEMO_MODE || !supabase) {
      const newReq: ConnectionRequest = {
        id: `req-${Date.now()}`,
        listingId,
        buyerId,
        sellerId,
        status: 'pending',
        initialMessage,
        createdAt: new Date().toISOString(),
        unreadCount: 0,
      };
      set((state) => ({
        outgoingRequests: [newReq, ...state.outgoingRequests],
      }));
      return { id: newReq.id };
    }

    try {
      const { data, error } = await supabase
        .from('connections')
        .insert({
          listing_id: listingId,
          buyer_id: buyerId,
          seller_id: sellerId,
          status: 'PENDING',
          initial_message: initialMessage || null,
        })
        .select(`
          *,
          listing:listings!listing_id (
            id, movie, theatre, show_date, show_time,
            asking_price, original_price, seats, status, expires_at
          ),
          buyer_profile:users!buyer_id (
            id, name, college, profile_image, phone_verified, college_verified
          ),
          seller_profile:users!seller_id (
            id, name, college, profile_image, phone_verified, college_verified
          )
        `)
        .single();

      if (error) {
        // Handle duplicate request gracefully
        if (error.code === '23505') {
          return { error: 'You have already sent a request for this ticket.' };
        }
        if (error.message?.includes('Cannot create')) {
          return { error: error.message };
        }
        throw error;
      }

      const newReq = mapDbToConnectionRequest(data);
      set((state) => ({
        outgoingRequests: [newReq, ...state.outgoingRequests],
      }));
      return { id: newReq.id };
    } catch (err: any) {
      console.error('[connectionStore] createRequest error:', err);
      const msg = err?.message?.includes('expired')
        ? 'This listing has expired.'
        : err?.message?.includes('status')
        ? 'This ticket is no longer available.'
        : 'Failed to send request. Please try again.';
      return { error: msg };
    }
  },

  // ── Update connection status helpers ──────────────────────
  acceptRequest: async (connectionId) => {
    return updateConnectionStatus(connectionId, 'ACCEPTED', set, get);
  },
  declineRequest: async (connectionId) => {
    return updateConnectionStatus(connectionId, 'DECLINED', set, get);
  },
  cancelRequest: async (connectionId) => {
    return updateConnectionStatus(connectionId, 'CANCELLED', set, get);
  },
  markCompleted: async (connectionId) => {
    return updateConnectionStatus(connectionId, 'COMPLETED', set, get);
  },

  // ── Look up connection by listingId + buyerId ─────────────
  getConnectionForListing: (listingId, buyerId) => {
    const { incomingRequests, outgoingRequests, activeConnections } = get();
    return [...incomingRequests, ...outgoingRequests, ...activeConnections].find(
      (c) => c.listingId === listingId && c.buyerId === buyerId
    );
  },

  // ── Subscribe to realtime updates ────────────────────────
  subscribeToUpdates: (userId: string) => {
    if (DEMO_MODE || !supabase) return () => {};

    const sb = supabase;
    const channel = sb
      .channel(`connections-user-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `seller_id=eq.${userId}`,
        },
        () => {
          get().fetchMyConnections(userId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `buyer_id=eq.${userId}`,
        },
        () => {
          get().fetchMyConnections(userId);
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  },
}));

// ── Shared status update helper ───────────────────────────────
async function updateConnectionStatus(
  connectionId: string,
  newStatus: 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED',
  set: any,
  _get: any
): Promise<{ error?: string }> {
  if (DEMO_MODE || !supabase) {
    const statusLower = newStatus.toLowerCase() as ConnectionStatus;
    set((state: any) => ({
      incomingRequests: state.incomingRequests.map((r: ConnectionRequest) =>
        r.id === connectionId ? { ...r, status: statusLower } : r
      ),
      outgoingRequests: state.outgoingRequests.map((r: ConnectionRequest) =>
        r.id === connectionId ? { ...r, status: statusLower } : r
      ),
      activeConnections:
        newStatus === 'ACCEPTED'
          ? [
              ...(state.incomingRequests.find((r: ConnectionRequest) => r.id === connectionId)
                ? [
                    {
                      ...(state.incomingRequests.find((r: ConnectionRequest) => r.id === connectionId) as ConnectionRequest),
                      status: 'accepted' as ConnectionStatus,
                    },
                  ]
                : []),
              ...state.activeConnections,
            ]
          : state.activeConnections.filter((c: ConnectionRequest) => c.id !== connectionId),
    }));
    return {};
  }

  try {
    const { error } = await supabase
      .from('connections')
      .update({ status: newStatus })
      .eq('id', connectionId);

    if (error) throw error;

    // Locally update state to reflect change
    const statusLower = newStatus.toLowerCase() as ConnectionStatus;
    set((state: any) => {
      const all = [
        ...state.incomingRequests,
        ...state.outgoingRequests,
        ...state.activeConnections,
      ];
      const unique = Array.from(new Map(all.map((c) => [c.id, c])).values());
      const updated = unique.map((c: ConnectionRequest) =>
        c.id === connectionId ? { ...c, status: statusLower } : c
      );

      return {
        incomingRequests: updated.filter(
          (c: ConnectionRequest) => c.status === 'pending'
        ),
        outgoingRequests: updated.filter(
          (c: ConnectionRequest) => c.status !== 'accepted'
        ),
        activeConnections: updated.filter((c: ConnectionRequest) => c.status === 'accepted'),
      };
    });

    return {};
  } catch (err: any) {
    console.error('[connectionStore] updateStatus error:', err);
    return { error: err?.message || 'Failed to update request status.' };
  }
}
