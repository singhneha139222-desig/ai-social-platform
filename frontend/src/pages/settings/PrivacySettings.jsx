import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userAPI } from '../../services/api';
import { Lock, Users } from 'lucide-react';

export default function PrivacySettings() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  
  const [prefs, setPrefs] = useState({
    privateAccount: user?.preferences?.isPrivate ?? false,
    activityStatus: user?.preferences?.showActivityStatus ?? true
  });

  const handleChange = async (e) => {
    const { name, checked } = e.target;
    const updatedPrefs = { ...prefs, [name]: checked };
    setPrefs(updatedPrefs);
    
    try {
      const res = await userAPI.updateProfile({
        preferences: {
          isPrivate: updatedPrefs.privateAccount,
          showActivityStatus: updatedPrefs.activityStatus
        }
      });
      updateUser(res.data.data.user);
      toast.success('Privacy updated');
    } catch (err) {
      toast.error('Failed to update privacy');
      // Revert local state on failure
      setPrefs(prefs);
    }
  };

  return (
    <div>
      <div className="settings-header">
        <h2>Account privacy</h2>
        <p>Manage who can see your content and follow you.</p>
      </div>

      <div className="settings-section">
        <div className="settings-toggle-row">
          <div className="settings-toggle-info" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Lock size={24} style={{ color: 'var(--text-muted)' }} />
            <div>
              <h4>Private account</h4>
              <p>When your account is public, your profile and posts can be seen by anyone, on or off AI Social.</p>
            </div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" name="privateAccount" checked={prefs.privateAccount} onChange={handleChange} />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="settings-toggle-row">
          <div className="settings-toggle-info" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <Users size={24} style={{ color: 'var(--text-muted)' }} />
            <div>
              <h4>Show activity status</h4>
              <p>Allow accounts you follow and anyone you message to see when you were last active.</p>
            </div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" name="activityStatus" checked={prefs.activityStatus} onChange={handleChange} />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
}
