import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Compass, Bell, User, Settings, Shield, LogOut, PlusSquare, Menu, X, MessageCircle, MoreHorizontal, Bookmark, AlertCircle, PlaySquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { notificationAPI } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const BASE_URL = API_URL.replace('/api/v1', '');

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    notificationAPI.getNotifications(1).then((res) => {
      setUnreadCount(res.data.data.unreadCount || 0);
    }).catch(() => {});
  }, [location]);

  // Close more menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    { to: '/feed', icon: Home, label: 'Home' },
    { to: '/explore', icon: Search, label: 'Search' },
    { to: '/explore?tab=reels', icon: PlaySquare, label: 'Reels' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
    { to: '/notifications', icon: Bell, label: 'Notifications', badge: unreadCount },
    { to: '/create-post', icon: PlusSquare, label: 'Create' },
    { to: `/profile/${user?.username}`, icon: User, label: 'Profile' }
  ];

  if (user?.role === 'admin') {
    links.push({ to: '/admin', icon: Shield, label: 'Admin' });
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

        <div className="sidebar__user">
            {user?.avatar ? (
              <img src={`${BASE_URL}${user.avatar}`} alt="Avatar" className="avatar-img avatar--md" />
            ) : (
              <div className="avatar avatar--md">{initial}</div>
            )}
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.displayName || user?.username}</span>
              <span className="sidebar__user-handle">@{user?.username}</span>
            </div>
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
              <Icon size={24} />
              <span className="sidebar__link-text">{label}</span>
              {badge > 0 && <span className="sidebar__badge">{badge}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer" ref={moreMenuRef}>
          <div style={{ position: 'relative' }}>
            {moreMenuOpen && (
              <div className="more-menu-popover">
                <button className="more-menu-item" onClick={() => { setMoreMenuOpen(false); navigate('/settings'); }}>
                  <Settings size={18} /> Settings
                </button>
                <button className="more-menu-item" onClick={() => { setMoreMenuOpen(false); navigate('/settings/saved'); }}>
                  <Bookmark size={18} /> Saved
                </button>
                <button className="more-menu-item" onClick={() => { setMoreMenuOpen(false); navigate('/settings/help'); }}>
                  <AlertCircle size={18} /> Report a problem
                </button>
                <div className="more-menu-divider"></div>
                <button className="more-menu-item" onClick={() => { setMoreMenuOpen(false); handleLogout(); }}>
                  Log out
                </button>
              </div>
            )}
            
            <button 
              className={`sidebar__link ${moreMenuOpen ? 'sidebar__link--active' : ''}`} 
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left', marginTop: '1rem' }}
            >
              <MoreHorizontal size={24} />
              <span className="sidebar__link-text">More</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
