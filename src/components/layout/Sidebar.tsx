import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Plus, ClipboardList, User, Target, Bell } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import UserAvatar from '../common/UserAvatar';

const navItems = [
  { to: '/home', icon: Home, label: 'Home', id: 'sidebar-home' },
  { to: '/find', icon: Search, label: 'Find Tickets', id: 'sidebar-find' },
  { to: '/activity', icon: ClipboardList, label: 'My Activity', id: 'sidebar-activity' },
  { to: '/match', icon: Target, label: 'My Matches', id: 'sidebar-match' },
  { to: '/notifications', icon: Bell, label: 'Notifications', id: 'sidebar-notifs' },
  { to: '/profile', icon: User, label: 'Profile', id: 'sidebar-profile' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  return (
    <aside className="sidebar" role="complementary" aria-label="Sidebar navigation">
      <div className="sidebar-logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
        Last Minuties
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            id={item.id}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            {item.label}
            {item.to === '/notifications' && unreadCount > 0 && (
              <span className="notif-badge" style={{ position: 'static', marginLeft: 'auto' }}>
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sell CTA */}
      <button
        id="sidebar-sell"
        className="btn btn-primary btn-full sidebar-sell-btn"
        onClick={() => navigate('/sell')}
      >
        <Plus size={18} />
        Sell a Ticket
      </button>

      {/* User info at bottom */}
      {user && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '16px',
            padding: '12px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface-glass)',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/profile')}
        >
          <UserAvatar user={user} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-semibold)',
                color: 'var(--color-text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.name || 'Complete Profile'}
            </div>
            <div
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-tertiary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.college}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
