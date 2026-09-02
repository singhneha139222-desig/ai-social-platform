import { useState } from 'react';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await userAPI.updateProfile(form);
      updateUser(res.data.data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
    setLoading(false);
  };

  return (
    <div className="feed-container">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your profile and account preferences.</p>
      </div>

      <div className="post-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="set-display">Display Name</label>
            <input id="set-display" className="form-input" value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })} maxLength={50} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="set-bio">Bio</label>
            <textarea id="set-bio" className="form-input" value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={500}
              placeholder="Tell us about yourself..." />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>{form.bio.length}/500</div>
          </div>
          <button className="btn btn--primary" disabled={loading} type="submit">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="post-card" style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Account Info</h3>
        <p style={{ fontSize: '0.9375rem', marginBottom: '0.5rem' }}><strong>Username:</strong> @{user?.username}</p>
        <p style={{ fontSize: '0.9375rem', marginBottom: '0.5rem' }}><strong>Email:</strong> {user?.email}</p>
        <p style={{ fontSize: '0.9375rem' }}><strong>Role:</strong> <span className="badge badge--ai">{user?.role}</span></p>
      </div>
    </div>
  );
}
