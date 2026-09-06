import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Compass, Bell, User, Settings, Shield, LogOut, PlusSquare, Menu, X, MessageCircle, MoreHorizontal, Bookmark, AlertCircle, Heart, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { useState, useEffect, useRef } from 'react';
import { notificationAPI } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const BASE_URL = API_URL.replace('/api/v1', '');
import { getMediaUrl } from '../utils/mediaUtils';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const moreMenuRef = useRef(null);
  const { socket } = useSocket();
  const toast = useToast();

  useEffect(() => {
    notificationAPI.getNotifications(1).then((res) => {
      setUnreadCount(res.data.data.unreadCount || 0);
    }).catch(() => {});
  }, [location]);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewNotification = (notification) => {
      setUnreadCount(prev => prev + 1);
      
      const actorName = notification.sender?.displayName || notification.sender?.username || 'Someone';
      const messages = {
        like: 'liked your post',
        comment: 'commented on your post',
        follow: 'started following you',
        moderation: 'moderation update'
      };
      
      toast.success(`${actorName} ${messages[notification.type] || 'sent a notification'}`, { duration: 3000 });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, toast]);

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
    { to: '/explore', icon: Compass, label: 'Explore' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
    { to: '/notifications', icon: Heart, label: 'Notifications', badge: unreadCount },
    { to: '/create-post', icon: Plus, label: 'Create' },
    { to: `/profile/${user?.username}`, isAvatar: true, label: 'Profile' }
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



        <nav className="sidebar__nav">
          {links.map(({ to, icon: Icon, label, badge, isAvatar }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
              onClick={() => setOpen(false)}
            >
              {isAvatar ? (
                user?.avatar ? (
                  <img src={getMediaUrl(user.avatar, BASE_URL)} alt="Profile" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                    {initial}
                  </div>
                )
              ) : (
                <Icon size={24} />
              )}
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
