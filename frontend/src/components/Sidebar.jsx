import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Compass, Bell, User, Settings, Shield, LogOut, PenSquare, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    notificationAPI.getNotifications(1).then((res) => {
      setUnreadCount(res.data.data.unreadCount || 0);
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    { to: '/feed', icon: Home, label: 'Home' },
    { to: '/explore', icon: Compass, label: 'Explore' },
    { to: '/create-post', icon: PenSquare, label: 'Create Post' },
    { to: '/notifications', icon: Bell, label: 'Notifications', badge: unreadCount },
    { to: `/profile/${user?.username}`, icon: User, label: 'Profile' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  if (user?.role === 'admin') {
    links.push({ to: '/admin', icon: Shield, label: 'Admin Dashboard' });
  }

  const initial = user?.displayName?.[0] || user?.username?.[0] || '?';

  return (
    <>
      <button className="hamburger" onClick={() => setOpen(!open)} aria-label="Toggle menu"
        style={{ position: 'fixed', top: 16, left: 16, zIndex: 300 }}>
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>

      {open && <div className="overlay overlay--visible" onClick={() => setOpen(false)} />}

      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar__logo">
          <div className="sidebar__logo-icon">AI</div>
          <span className="sidebar__logo-text">AI Social</span>
        </div>

        <nav className="sidebar__nav">
          {links.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
              onClick={() => setOpen(false)}
            >
              <Icon size={20} />
              {label}
              {badge > 0 && <span className="sidebar__badge">{badge}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user" onClick={() => navigate(`/profile/${user?.username}`)}>
            <div className="avatar avatar--md">{initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.displayName || user?.username}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>@{user?.username}</div>
            </div>
          </div>
          <button className="btn btn--ghost w-full mt-sm" onClick={handleLogout} style={{ justifyContent: 'flex-start', gap: 12 }}>
            <LogOut size={18} /> Log out
          </button>
        </div>
      </aside>
    </>
  );
}
