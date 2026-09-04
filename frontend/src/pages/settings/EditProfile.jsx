import { useState, useRef } from 'react';
import { userAPI } from '../../services/api';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const BASE_URL = API_URL.replace('/api/v1', '');
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function EditProfile() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  
  const [form, setForm] = useState({
    username: user?.username || '',
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    website: '',
    gender: 'Prefer not to say',
    showThreadsBadge: true,
    isAICreator: false,
    showAccountSuggestions: true
  });
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await userAPI.uploadAvatar(formData);
      updateUser(res.data.data.user);
      toast.success('Profile photo updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo');
    }
    setUploadingAvatar(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await userAPI.updateProfile({
        username: form.username,
        displayName: form.displayName,
        bio: form.bio
      });
      updateUser(res.data.data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  return (
    <div>
      <div className="settings-header">
        <h2>Edit profile</h2>
      </div>

      <div className="settings-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user?.avatar ? (
            <img src={`${BASE_URL}${user.avatar}`} alt="Avatar" className="avatar-img avatar--lg" />
          ) : (
            <div className="avatar avatar--lg">{user?.displayName?.[0] || user?.username?.[0] || '?'}</div>
          )}
          <div>
            <div style={{ fontWeight: 600 }}>{user?.username}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{user?.displayName}</div>
          </div>
        </div>
        <div>
          <input 
            type="file" 
            accept="image/*" 
            style={{ display: 'none' }} 
            ref={fileInputRef}
            onChange={handleAvatarChange}
          />
          <button 
            className="btn btn--primary" 
            style={{ padding: '0.5rem 1rem' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? 'Uploading...' : 'Change photo'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="settings-section">
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input id="username" name="username" className="form-input" value={form.username} onChange={handleChange} maxLength={30} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Usernames can only contain letters, numbers, and underscores.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="displayName">Name</label>
            <input id="displayName" name="displayName" className="form-input" value={form.displayName} onChange={handleChange} maxLength={50} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Help people discover your account by using the name you're known by: either your full name, nickname, or business name.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="website">Website</label>
            <input id="website" name="website" className="form-input" value={form.website} onChange={handleChange} placeholder="Website" disabled />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Editing your links is only available on mobile.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bio">Bio</label>
            <textarea id="bio" name="bio" className="form-input" value={form.bio} onChange={handleChange} maxLength={150} rows={3} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>
              {form.bio.length} / 150
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="gender">Gender</label>
            <select id="gender" name="gender" className="form-input" value={form.gender} onChange={handleChange}>
              <option>Prefer not to say</option>
              <option>Male</option>
              <option>Female</option>
              <option>Custom</option>
            </select>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              This won't be part of your public profile.
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section__title">Preferences</h3>
          
          <div className="settings-toggle-row">
            <div className="settings-toggle-info">
              <h4>Show Threads badge</h4>
              <p>Display a Threads badge on your profile</p>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" name="showThreadsBadge" checked={form.showThreadsBadge} onChange={handleChange} />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="settings-toggle-row">
            <div className="settings-toggle-info">
              <h4>AI creator</h4>
              <p>Label your account as an AI content creator</p>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" name="isAICreator" checked={form.isAICreator} onChange={handleChange} />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="settings-toggle-row">
            <div className="settings-toggle-info">
              <h4>Show account suggestions on profiles</h4>
              <p>Choose whether people can see similar account suggestions on your profile</p>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" name="showAccountSuggestions" checked={form.showAccountSuggestions} onChange={handleChange} />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn--primary" disabled={loading} type="submit">
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
