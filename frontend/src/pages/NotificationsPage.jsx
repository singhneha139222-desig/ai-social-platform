import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI, userAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Heart, MessageCircle, UserPlus, Shield, CheckCheck } from 'lucide-react';

const ICONS = { follow: UserPlus, like: Heart, comment: MessageCircle, moderation: Shield };
const COLORS = { follow: 'var(--accent-primary)', like: '#ed4956', comment: 'var(--text-secondary)', moderation: 'var(--warning)' };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [followRequests, setFollowRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const toast = useToast();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  const BASE_URL = API_URL.replace('/api/v1', '');

  useEffect(() => {
    Promise.all([
      notificationAPI.getNotifications(1),
      userAPI.getFollowRequests()
    ]).then(([notifRes, reqRes]) => {
      setNotifications(notifRes.data.data.notifications || []);
      setUnreadCount(notifRes.data.data.unreadCount || 0);
      setFollowRequests(reqRes.data.data.requests || []);
    }).catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewNotification = (notification) => {
      setNotifications(prev => {
        // Prevent duplicates
        if (prev.some(n => n._id === notification._id)) return prev;
        return [notification, ...prev];
      });
      setUnreadCount(prev => prev + 1);
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket]);

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All marked as read');
    } catch { toast.error('Failed'); }
  };

  const markRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  };

  const handleNotificationClick = (n) => {
    if (!n.read) markRead(n._id);
    
    if (n.type === 'follow' && n.sender) {
      navigate(`/profile/${n.sender.username}`);
    } else if (n.post && n.post._id) {
      navigate(`/post/${n.post._id}`);
    } else if (n.post) {
      navigate(`/post/${n.post}`); // In case it's just an ID
    }
  };

  const handleAvatarClick = (e, username) => {
    e.stopPropagation();
    if (username) navigate(`/profile/${username}`);
  };

  const handleFollowBack = async (e, senderId) => {
    e.stopPropagation();
    try {
      await userAPI.followUser(senderId);
      setNotifications((prev) => prev.map(n => {
        if (n.sender?._id === senderId) {
          return { ...n, sender: { ...n.sender, isFollowing: true } };
        }
        return n;
      }));
      toast.success('Followed user');
    } catch (err) {
      toast.error('Failed to follow');
    }
  };

  const handleAcceptRequest = async (e, requesterId) => {
    e.stopPropagation();
    try {
      await userAPI.acceptFollowRequest(requesterId);
      setFollowRequests(prev => prev.filter(r => r.user._id !== requesterId));
      toast.success('Follow request accepted');
    } catch {
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async (e, requesterId) => {
    e.stopPropagation();
    try {
      await userAPI.rejectFollowRequest(requesterId);
      setFollowRequests(prev => prev.filter(r => r.user._id !== requesterId));
      toast.success('Follow request rejected');
    } catch {
      toast.error('Failed to reject request');
    }
  };

  return (
    <div className="feed-container" style={{ maxWidth: '600px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Notifications</h2>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn--secondary" onClick={markAllRead} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
            <CheckCheck size={16} style={{ marginRight: '0.5rem' }} /> Mark all read
          </button>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        {!loading && followRequests.length > 0 && (
          <div className="post-card" style={{ padding: '0.5rem 0', overflow: 'hidden', marginBottom: '1rem' }}>
            <h4 style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', margin: 0 }}>Follow Requests</h4>
            {followRequests.map((req) => (
              <div key={req._id} style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', gap: '1rem' }}>
                  {req.user?.avatar ? (
                    <img 
                      src={`${BASE_URL}${req.user.avatar}`} 
                      alt="Avatar" 
                      className="avatar-img avatar--md" 
                      onClick={(e) => handleAvatarClick(e, req.user?.username)}
                      style={{ cursor: 'pointer' }}
                    />
                  ) : (
                    <div className="avatar avatar--md" onClick={(e) => handleAvatarClick(e, req.user?.username)} style={{ cursor: 'pointer' }}>
                      {req.user?.displayName?.[0] || req.user?.username?.[0] || '?'}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <strong 
                      style={{ fontWeight: 600, cursor: 'pointer' }}
                      onClick={(e) => handleAvatarClick(e, req.user?.username)}
                    >
                      {req.user?.displayName || req.user?.username}
                    </strong>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>@{req.user?.username}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn--primary btn--sm" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={(e) => handleAcceptRequest(e, req.user._id)}>Accept</button>
                    <button className="btn btn--secondary btn--sm" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={(e) => handleRejectRequest(e, req.user._id)}>Reject</button>
                  </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="feed-list">{[1, 2, 3].map(i => <div key={i} className="post-card"><div className="skeleton" style={{ height: 60 }} /></div>)}</div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <h3>Activity On Your Posts</h3>
            <p>When someone likes or comments on one of your posts, you'll see it here.</p>
          </div>
        ) : (
          <div className="post-card" style={{ padding: '0.5rem 0', overflow: 'hidden' }}>
            {notifications.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              const iconColor = COLORS[n.type] || 'var(--text-muted)';
              return (
                <div
                  key={n._id}
                  className={`notification-item ${!n.read ? 'notification-item--unread' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1rem 1.5rem',
                    gap: '1rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  {!n.read && (
                    <div style={{ position: 'absolute', left: '0.5rem', width: '8px', height: '8px', backgroundColor: 'var(--accent-primary)', borderRadius: '50%' }} />
                  )}
                  {n.sender?.avatar ? (
                    <img 
                      src={`${BASE_URL}${n.sender.avatar}`} 
                      alt="Avatar" 
                      className="avatar-img avatar--md" 
                      onClick={(e) => handleAvatarClick(e, n.sender?.username)}
                    />
                  ) : (
                    <div className="avatar avatar--md" onClick={(e) => handleAvatarClick(e, n.sender?.username)}>
                      {n.sender?.displayName?.[0] || n.sender?.username?.[0] || '?'}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                      <strong 
                        style={{ fontWeight: 600, marginRight: '0.25rem', cursor: 'pointer' }}
                        onClick={(e) => handleAvatarClick(e, n.sender?.username)}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        {n.sender?.displayName || n.sender?.username}
                      </strong>
                      {n.message}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  
                  {n.type === 'follow' && !n.sender?.isFollowing && (
                    <button 
                      className="btn btn--secondary btn--sm" 
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.8125rem' }}
                      onClick={(e) => handleFollowBack(e, n.sender?._id)}
                    >
                      Follow Back
                    </button>
                  )}
                  
                  {n.type !== 'follow' && (
                    <Icon size={20} style={{ color: iconColor }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
