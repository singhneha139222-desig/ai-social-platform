import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMediaUrl } from '../utils/mediaUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const BASE_URL = API_URL.replace('/api/v1', '');

export default function UserListModal({ isOpen, onClose, title, fetchUsers }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchUsers()
        .then(res => {
          setUsers(res.data.data.users || []);
        })
        .catch(err => {
          console.error(err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, fetchUsers]);

  if (!isOpen) return null;

  return (
    <>
      <div className="overlay overlay--visible" onClick={onClose} style={{ zIndex: 1000 }}></div>
      <div className="modal" style={{ zIndex: 1001 }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="icon-button"><X size={20} /></button>
        </div>
        <div className="modal-content" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading...</div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No users found.</div>
          ) : (
            <div className="user-list">
              {users.map(user => {
                const initial = user.displayName?.[0] || user.username?.[0] || '?';
                return (
                  <Link to={`/profile/${user.username}`} key={user._id} className="user-list-item" onClick={onClose}>
                    {user.avatar ? (
                      <img src={getMediaUrl(user.avatar, BASE_URL)} alt="Avatar" className="avatar-img avatar--sm" />
                    ) : (
                      <div className="avatar avatar--sm">{initial.toUpperCase()}</div>
                    )}
                    <div className="user-list-info">
                      <span className="user-list-name">{user.displayName || user.username}</span>
                      <span className="user-list-handle">@{user.username}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
