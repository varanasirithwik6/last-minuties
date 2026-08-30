import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import UserAvatar from '../common/UserAvatar';

export default function TopBar() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  return (
    <header className="top-bar" role="banner">
      <div className="top-bar-logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
        Last Minuties
      </div>

      <div className="top-bar-actions">
        {/* Notifications */}
        <button
          id="topbar-notifications"
          className="icon-btn"
          onClick={() => navigate('/notifications')}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        {/* Profile */}
        <button
          id="topbar-profile"
          className="icon-btn"
          onClick={() => navigate('/profile')}
          aria-label="Profile"
          style={{ padding: 0, overflow: 'hidden', border: '2px solid var(--color-border)' }}
        >
          <UserAvatar user={user} size="sm" />
        </button>
      </div>
    </header>
  );
}
