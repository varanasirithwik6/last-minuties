// ============================================================
// Last Minuties — Notification Store (Zustand) — Phase 4
// Supabase backend + Realtime subscriptions
// ============================================================
import { create } from 'zustand';
import type { AppNotification, NotificationType } from '../types';
import { DEMO_NOTIFICATIONS } from '../lib/demoData';
import { DEMO_MODE, supabase } from '../lib/supabase';

// Map DB row (snake_case) → AppNotification (camelCase)
function mapDbNotification(row: any): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: (row.type || 'new_message') as NotificationType,
    title: row.title || '',
    message: row.body || row.message || '',
    body: row.body,
    read: row.is_read ?? row.read ?? false,
    is_read: row.is_read,
    data: row.data || {},
    createdAt: row.created_at || new Date().toISOString(),
    created_at: row.created_at,
  };
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;

  fetchNotifications: (userId: string) => Promise<void>;
  markAllRead: () => void;
  markRead: (id: string) => void;
  addNotification: (notif: AppNotification) => void;
  subscribeToNotifications: (userId: string) => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async (userId: string) => {
    if (DEMO_MODE || !supabase) {
      set({
        notifications: DEMO_NOTIFICATIONS,
        unreadCount: DEMO_NOTIFICATIONS.filter((n) => !n.read).length,
      });
      return;
    }

    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      const notifs = (data || []).map(mapDbNotification);
      set({
        notifications: notifs,
        unreadCount: notifs.filter((n) => !n.read).length,
      });
    } catch (err) {
      console.error('[notificationStore] fetchNotifications error:', err);
    }
  },

  markAllRead: () => {
    const { notifications } = get();
    set({
      notifications: notifications.map((n) => ({ ...n, read: true, is_read: true })),
      unreadCount: 0,
    });

    // Persist to Supabase in background
    if (!DEMO_MODE && supabase) {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        void supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', unreadIds)
          .then(() => {});
      }
    }
  },

  markRead: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    if (!DEMO_MODE && supabase) {
      void supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .then(() => {});
    }
  },

  addNotification: (notif: AppNotification) => {
    set((state) => ({
      notifications: [notif, ...state.notifications],
      unreadCount: state.unreadCount + (notif.read ? 0 : 1),
    }));
  },

  subscribeToNotifications: (userId: string) => {
    if (DEMO_MODE || !supabase) return () => {};

    const sb = supabase;
    if (!sb) return () => {};

    const channel = sb
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = mapDbNotification(payload.new);
          get().addNotification(newNotif);
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  },
}));
