import { useState, useEffect } from 'react';
import { notificationAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Heart, MessageCircle, UserPlus, Shield, CheckCheck } from 'lucide-react';

const ICONS = { follow: UserPlus, like: Heart, comment: MessageCircle, moderation: Shield };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const toast = useToast();

  useEffect(() => {
    notificationAPI.getNotifications(1).then((res) => {
      setNotifications(res.data.data.notifications || []);
      setUnreadCount(res.data.data.unreadCount || 0);
    }).catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="feed-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Notifications</h1>
          {unreadCount > 0 ? (
            <p>{unreadCount} unread messages</p>
          ) : (
            <p>You're all caught up!</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="btn btn--secondary" onClick={markAllRead}>
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="feed-list">{[1, 2, 3].map(i => <div key={i} className="post-card"><div className="skeleton" style={{ height: 40 }} /></div>)}</div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <Bell size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>No notifications</h3>
          <p>You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="post-card" style={{ padding: 0, overflow: 'hidden' }}>
          {notifications.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <div
                key={n._id}
                className={`notification-item ${!n.read ? 'notification-item--unread' : ''}`}
                onClick={() => !n.read && markRead(n._id)}
              >
                <div className="avatar avatar--md">
                  {n.sender?.displayName?.[0] || n.sender?.username?.[0] || '?'}
                </div>
                <div className="notification-item__content">
                  <div className="notification-item__text">
                    <strong>{n.sender?.displayName || n.sender?.username}</strong>{' '}
                    {n.message}
                  </div>
                  <div className="notification-item__time">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </div>
                </div>
                <Icon size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
