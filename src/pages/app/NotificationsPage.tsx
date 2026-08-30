import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Ticket, MessageCircle, Star, Clock, Target, ArrowRight } from 'lucide-react';
import { useNotificationStore } from '../../stores/notificationStore';
import { useAuthStore } from '../../stores/authStore';
import type { AppNotification, NotificationType } from '../../types';

function NotifIcon({ type }: { type: NotificationType }) {
  const map: Partial<Record<NotificationType, React.ReactNode>> = {
    match_found:          <Target size={18} style={{ color: 'var(--color-brand-tertiary)' }} />,
    contact_request:      <MessageCircle size={18} style={{ color: 'var(--color-info)' }} />,
    contact_accepted:     <MessageCircle size={18} style={{ color: 'var(--color-success)' }} />,
    connection_request:   <MessageCircle size={18} style={{ color: 'var(--color-info)' }} />,
    request_accepted:     <MessageCircle size={18} style={{ color: 'var(--color-success)' }} />,
    request_declined:     <MessageCircle size={18} style={{ color: 'var(--color-error)' }} />,
    request_cancelled:    <MessageCircle size={18} style={{ color: 'var(--color-text-tertiary)' }} />,
    listing_expiring:     <Clock size={18} style={{ color: 'var(--color-warning)' }} />,
    listing_expired:      <Clock size={18} style={{ color: 'var(--color-text-tertiary)' }} />,
    listing_sold:         <Ticket size={18} style={{ color: 'var(--color-success)' }} />,
    new_message:          <MessageCircle size={18} style={{ color: 'var(--color-brand-primary)' }} />,
    rating_received:      <Star size={18} style={{ color: 'var(--color-warning)' }} />,
  };
  const icon = map[type] || <Bell size={18} style={{ color: 'var(--color-text-tertiary)' }} />;
  return (
    <div
      style={{
        width: '36px',
        height: '36px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-surface-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
  );
}

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

// Determine navigation target based on notification type and data
function getNotifTarget(notif: AppNotification): string | null {
  const data = notif.data || {};
  switch (notif.type) {
    case 'connection_request':
    case 'contact_request':
      return '/requests';
    case 'request_accepted':
    case 'contact_accepted':
    case 'new_message':
      return data.connection_id ? `/chat/${data.connection_id}` : '/requests';
    case 'request_declined':
    case 'request_cancelled':
      return '/requests';
    case 'listing_sold':
    case 'listing_expiring':
    case 'listing_expired':
      return data.listing_id ? `/ticket/${data.listing_id}` : '/activity';
    default:
      return null;
  }
}

function NotifCard({
  notif,
  onRead,
  onClick,
}: {
  notif: AppNotification;
  onRead: (id: string) => void;
  onClick: (notif: AppNotification) => void;
}) {
  const target = getNotifTarget(notif);
  const isClickable = !!target;

  return (
    <div
      className="card"
      id={`notif-${notif.id}`}
      style={{
        marginBottom: 'var(--space-2)',
        cursor: isClickable ? 'pointer' : 'default',
        opacity: notif.read ? 0.7 : 1,
        borderLeft: notif.read ? 'none' : '3px solid var(--color-brand-primary)',
        transition: 'all var(--transition-base)',
      }}
      onClick={() => {
        if (!notif.read) onRead(notif.id);
        if (isClickable) onClick(notif);
      }}
    >
      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
        <NotifIcon type={notif.type} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 'var(--font-semibold)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-primary)',
              marginBottom: '4px',
            }}
          >
            {notif.title}
          </div>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
            }}
          >
            {notif.message || notif.body}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginTop: '6px' }}>
            {timeAgo(notif.createdAt || notif.created_at || new Date().toISOString())}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {!notif.read && (
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--color-brand-primary)',
              }}
            />
          )}
          {isClickable && (
            <ArrowRight size={14} style={{ color: 'var(--color-text-tertiary)' }} />
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [
    isLoading, setIsLoading
  ] = useState(true);
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAllRead,
    markRead,
    subscribeToNotifications,
  } = useNotificationStore();

  useEffect(() => {
    if (!user?.id) return;
    setIsLoading(true);
    fetchNotifications(user.id).finally(() => setIsLoading(false));
    const unsubscribe = subscribeToNotifications(user.id);
    return unsubscribe;
  }, [user?.id, fetchNotifications, subscribeToNotifications]);

  const handleNotifClick = (notif: AppNotification) => {
    const target = getNotifTarget(notif);
    if (target) navigate(target);
  };

  return (
    <div className="page">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-5)',
        }}
      >
        <h1 className="section-title" style={{ marginBottom: 0 }}>
          <Bell size={22} /> Notifications
          {unreadCount > 0 && (
            <span
              className="notif-badge"
              style={{ position: 'static', marginLeft: 'var(--space-2)' }}
            >
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            id="mark-all-read"
            className="btn btn-ghost btn-sm"
            onClick={markAllRead}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: '72px', borderRadius: 'var(--radius-xl)' }}
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <h3 className="empty-state-title">No notifications</h3>
          <p className="empty-state-subtitle">
            You'll get notified about connection requests, accepted chats, new messages, and listing updates.
          </p>
        </div>
      ) : (
        notifications.map((n) => (
          <NotifCard
            key={n.id}
            notif={n}
            onRead={markRead}
            onClick={handleNotifClick}
          />
        ))
      )}
    </div>
  );
}
