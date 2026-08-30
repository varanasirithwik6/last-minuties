import { NavLink } from 'react-router-dom';
import { Home, Search, Plus, ClipboardList, User } from 'lucide-react';
import { useConnectionStore } from '../../stores/connectionStore';

export default function BottomNav() {
  const { incomingRequests } = useConnectionStore();
  // Badge counts
  const requestBadge = incomingRequests.length;

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      <div className="bottom-nav-inner">
        {/* Home */}
        <NavLink
          to="/home"
          id="nav-home"
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          aria-label="Home"
        >
          <Home size={22} />
          <span className="bottom-nav-label">Home</span>
        </NavLink>

        {/* Find */}
        <NavLink
          to="/find"
          id="nav-find"
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          aria-label="Find tickets"
        >
          <Search size={22} />
          <span className="bottom-nav-label">Find</span>
        </NavLink>

        {/* Sell (center highlight) */}
        <NavLink
          to="/sell"
          id="nav-sell"
          className="bottom-nav-item bottom-nav-sell"
          aria-label="Sell a ticket"
        >
          <div className="bottom-nav-sell-btn">
            <Plus size={26} strokeWidth={2.5} />
          </div>
          <span className="bottom-nav-label" style={{ color: 'var(--color-brand-primary)' }}>
            Sell
          </span>
        </NavLink>

        {/* Activity — with request badge */}
        <NavLink
          to="/activity"
          id="nav-activity"
          className={({ isActive }) =>
            `bottom-nav-item ${isActive || window.location.pathname.startsWith('/requests') ? 'active' : ''}`
          }
          aria-label="My activity"
          style={{ position: 'relative' }}
        >
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <ClipboardList size={22} />
            {requestBadge > 0 && (
              <span
                className="notif-badge"
                style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-10px',
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 3px',
                  fontSize: '10px',
                }}
              >
                {requestBadge > 9 ? '9+' : requestBadge}
              </span>
            )}
          </div>
          <span className="bottom-nav-label">Activity</span>
        </NavLink>

        {/* Profile */}
        <NavLink
          to="/profile"
          id="nav-profile"
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          aria-label="Profile"
        >
          <User size={22} />
          <span className="bottom-nav-label">Profile</span>
        </NavLink>
      </div>
    </nav>
  );
}
