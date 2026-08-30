// ============================================================
// Last Minuties — Safety, Reputation & Trust Store (Zustand)
// Handles Ratings, Reporting, Blocking & Privacy
// ============================================================
import { create } from 'zustand';
import type { Rating, ReportReason } from '../types';
import { supabase, DEMO_MODE } from '../lib/supabase';

interface SafetyState {
  blockedUserIds: string[];
  ratings: Rating[];
  isLoading: boolean;
  error: string | null;

  submitRating: (
    connectionId: string,
    toUserId: string,
    fromUserId: string,
    rating: number,
    comment?: string
  ) => Promise<{ success?: boolean; error?: string }>;

  submitReport: (data: {
    reporterId: string;
    reportedUserId?: string;
    listingId?: string;
    messageId?: string;
    connectionId?: string;
    reason: ReportReason | string;
    description?: string;
  }) => Promise<{ success?: boolean; error?: string }>;

  blockUser: (blockerId: string, blockedId: string) => Promise<{ success?: boolean; error?: string }>;
  unblockUser: (blockerId: string, blockedId: string) => Promise<{ success?: boolean; error?: string }>;
  fetchBlockedUsers: (userId: string) => Promise<void>;
  isUserBlocked: (targetUserId: string) => boolean;
  requestAccountDeletion: (userId: string) => Promise<{ success?: boolean; error?: string }>;
}

export const useSafetyStore = create<SafetyState>((set, get) => ({
  blockedUserIds: [],
  ratings: [],
  isLoading: false,
  error: null,

  // ── Submit Rating ──────────────────────────────────────────
  submitRating: async (connectionId, toUserId, fromUserId, rating, comment) => {
    if (fromUserId === toUserId) {
      return { error: 'You cannot rate yourself.' };
    }
    if (rating < 1 || rating > 5) {
      return { error: 'Rating must be between 1 and 5 stars.' };
    }

    if (DEMO_MODE || !supabase) {
      const newRating: Rating = {
        id: `rating-${Date.now()}`,
        connectionId,
        fromUserId,
        toUserId,
        rating,
        comment,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ ratings: [newRating, ...state.ratings] }));
      return { success: true };
    }

    try {
      const { error } = await supabase.from('ratings').insert({
        connection_id: connectionId,
        to_user_id: toUserId,
        from_user_id: fromUserId,
        rating,
        comment: comment?.trim() || null,
      });

      if (error) {
        if (error.code === '23505') {
          return { error: 'You have already submitted a rating for this connection.' };
        }
        throw error;
      }

      return { success: true };
    } catch (err: any) {
      console.error('[safetyStore] submitRating error:', err);
      return { error: err?.message || 'Failed to submit rating.' };
    }
  },

  // ── Submit Report ──────────────────────────────────────────
  submitReport: async (data) => {
    if (!data.reporterId) {
      return { error: 'You must be logged in to submit a report.' };
    }

    if (DEMO_MODE || !supabase) {
      return { success: true };
    }

    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: data.reporterId,
        reported_user_id: data.reportedUserId || null,
        listing_id: data.listingId || null,
        message_id: data.messageId || null,
        connection_id: data.connectionId || null,
        reason: data.reason,
        description: data.description?.trim() || null,
        status: 'PENDING',
      });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error('[safetyStore] submitReport error:', err);
      return { error: err?.message || 'Failed to submit report. Please try again later.' };
    }
  },

  // ── Block User ─────────────────────────────────────────────
  blockUser: async (blockerId, blockedId) => {
    if (blockerId === blockedId) {
      return { error: 'You cannot block yourself.' };
    }

    if (DEMO_MODE || !supabase) {
      set((state) => ({
        blockedUserIds: [...new Set([...state.blockedUserIds, blockedId])],
      }));
      return { success: true };
    }

    try {
      const { error } = await supabase.from('blocks').insert({
        blocker_id: blockerId,
        blocked_id: blockedId,
      });

      if (error && error.code !== '23505') throw error;

      set((state) => ({
        blockedUserIds: [...new Set([...state.blockedUserIds, blockedId])],
      }));
      return { success: true };
    } catch (err: any) {
      console.error('[safetyStore] blockUser error:', err);
      return { error: err?.message || 'Failed to block user.' };
    }
  },

  // ── Unblock User ───────────────────────────────────────────
  unblockUser: async (blockerId, blockedId) => {
    if (DEMO_MODE || !supabase) {
      set((state) => ({
        blockedUserIds: state.blockedUserIds.filter((id) => id !== blockedId),
      }));
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId);

      if (error) throw error;

      set((state) => ({
        blockedUserIds: state.blockedUserIds.filter((id) => id !== blockedId),
      }));
      return { success: true };
    } catch (err: any) {
      console.error('[safetyStore] unblockUser error:', err);
      return { error: err?.message || 'Failed to unblock user.' };
    }
  },

  // ── Fetch Blocked Users ────────────────────────────────────
  fetchBlockedUsers: async (userId) => {
    if (DEMO_MODE || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', userId);

      if (error) throw error;
      const ids = (data || []).map((row: any) => row.blocked_id);
      set({ blockedUserIds: ids });
    } catch (err: any) {
      console.error('[safetyStore] fetchBlockedUsers error:', err);
    }
  },

  // ── Check if User is Blocked ───────────────────────────────
  isUserBlocked: (targetUserId) => {
    return get().blockedUserIds.includes(targetUserId);
  },

  // ── Request Account Deletion / Deactivation ────────────────
  requestAccountDeletion: async (userId) => {
    if (DEMO_MODE || !supabase) {
      return { success: true };
    }

    try {
      // Mark account as DEACTIVATED to preserve audit trails while revoking active access
      const { error } = await supabase
        .from('users')
        .update({
          account_status: 'DEACTIVATED',
          name: 'Deactivated User',
          phone_verified: false,
          college_verified: false,
        })
        .eq('id', userId);

      if (error) throw error;

      // Cancel all active listings
      await supabase
        .from('listings')
        .update({ status: 'cancelled' })
        .eq('seller_id', userId)
        .in('status', ['available', 'contacted']);

      return { success: true };
    } catch (err: any) {
      console.error('[safetyStore] requestAccountDeletion error:', err);
      return { error: err?.message || 'Failed to process account deletion.' };
    }
  },
}));
