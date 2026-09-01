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
    <div className="page-container">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your profile</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="set-display">Display Name</label>
            <input id="set-display" className="form-input" value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })} maxLength={50} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="set-bio">Bio</label>
            <textarea id="set-bio" className="form-input form-textarea" value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={500}
              placeholder="Tell us about yourself..." />
            <div className="text-sm text-muted mt-sm">{form.bio.length}/500</div>
          </div>
          <button className="btn btn--primary" disabled={loading} type="submit">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="card mt-lg">
        <h3 style={{ marginBottom: 12 }}>Account Info</h3>
        <p className="text-sm"><strong>Username:</strong> @{user?.username}</p>
        <p className="text-sm mt-sm"><strong>Email:</strong> {user?.email}</p>
        <p className="text-sm mt-sm"><strong>Role:</strong> {user?.role}</p>
      </div>
    </div>
  );
}
