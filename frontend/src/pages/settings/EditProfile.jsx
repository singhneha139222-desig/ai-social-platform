import { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../../utils/cropImage';
import { userAPI } from '../../services/api';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const BASE_URL = API_URL.replace('/api/v1', '');
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useUsernameAvailability from '../../hooks/useUsernameAvailability';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function EditProfile() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  
  const [form, setForm] = useState({
    username: user?.username || '',
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    website: user?.website || '',
    gender: user?.gender || 'Prefer not to say',
    showThreadsBadge: user?.preferences?.showThreadsBadge ?? true,
    isAICreator: user?.preferences?.isAICreator ?? false,
    showAccountSuggestions: user?.preferences?.showAccountSuggestions ?? true
  });
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  // Cropper state
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const { status: usernameStatus, suggestions, error: usernameError } = useUsernameAvailability(form.username, user?.username);

  const handleAvatarChange = (e) => {
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

    const reader = new FileReader();
    reader.addEventListener('load', () => setCropImageSrc(reader.result));
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const uploadCroppedImage = async () => {
    try {
      setUploadingAvatar(true);
      const croppedImageBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      
      const formData = new FormData();
      formData.append('avatar', croppedImageBlob, 'profile.jpg');

      const res = await userAPI.uploadAvatar(formData);
      updateUser(res.data.data.user);
      toast.success('Profile photo updated!');
      setCropImageSrc(null); // Close modal
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await userAPI.updateProfile({
        username: form.username,
        displayName: form.displayName,
        bio: form.bio,
        website: form.website,
        gender: form.gender,
        preferences: {
          showThreadsBadge: form.showThreadsBadge,
          isAICreator: form.isAICreator,
          showAccountSuggestions: form.showAccountSuggestions
        }
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
            <div style={{ position: 'relative' }}>
              <input 
                id="username" 
                name="username" 
                className={`form-input ${usernameStatus === 'invalid' || usernameStatus === 'taken' ? 'input-error' : usernameStatus === 'available' ? 'input-success' : ''}`}
                value={form.username} 
                onChange={handleChange} 
                maxLength={30} 
              />
              <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                {usernameStatus === 'checking' && <Loader2 size={18} className="spin" style={{ color: 'var(--text-muted)' }} />}
                {usernameStatus === 'available' && <CheckCircle2 size={18} style={{ color: 'var(--success-color)' }} />}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <XCircle size={18} style={{ color: 'var(--error-color)' }} />}
              </div>
            </div>

            {usernameStatus === 'invalid' && (
              <div style={{ fontSize: '0.8rem', color: 'var(--error-color)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <XCircle size={14} /> {usernameError}
              </div>
            )}
            
            {usernameStatus === 'available' && (
              <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <CheckCircle2 size={14} /> {form.username === user?.username ? 'This is your current username.' : 'Username is available'}
              </div>
            )}
            
            {usernameStatus === 'taken' && (
              <div style={{ marginTop: '0.4rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
                  <XCircle size={14} /> Username isn't available. Try one of these:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {suggestions.map(sugg => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setForm({ ...form, username: sugg })}
                      style={{
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.8rem',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '1rem',
                        cursor: 'pointer',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
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
            <input id="website" name="website" className="form-input" value={form.website} onChange={handleChange} placeholder="Website" />
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
          <button 
            className="btn btn--primary" 
            disabled={loading || usernameStatus === 'checking' || usernameStatus === 'invalid' || usernameStatus === 'taken'} 
            type="submit"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>

      {/* Cropper Modal */}
      {cropImageSrc && (
        <>
          <div className="overlay overlay--visible" style={{ zIndex: 999 }} onClick={() => setCropImageSrc(null)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'var(--bg-primary)', zIndex: 1000, borderRadius: 'var(--radius-lg)',
            width: '90%', maxWidth: '400px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem'
          }}>
            <h3 style={{ margin: 0 }}>Crop Profile Photo</h3>
            <div style={{ position: 'relative', width: '100%', height: '300px', background: '#333' }}>
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn" onClick={() => setCropImageSrc(null)} disabled={uploadingAvatar}>Cancel</button>
              <button className="btn btn--primary" onClick={uploadCroppedImage} disabled={uploadingAvatar}>
                {uploadingAvatar ? 'Saving...' : 'Save Photo'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
