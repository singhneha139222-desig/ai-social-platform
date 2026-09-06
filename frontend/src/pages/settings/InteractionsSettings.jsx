import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userAPI } from '../../services/api';
import { MessageCircle } from 'lucide-react';

export default function InteractionsSettings() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  
  const [policy, setPolicy] = useState(user?.preferences?.messageRequestPolicy || 'everyone');
  const [loading, setLoading] = useState(false);

  // Sync state if user context updates
  useEffect(() => {
    if (user?.preferences?.messageRequestPolicy) {
      setPolicy(user.preferences.messageRequestPolicy);
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await userAPI.updateProfile({
        preferences: {
          messageRequestPolicy: policy
        }
      });
      updateUser(res.data.data.user);
      toast.success('Message settings updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="settings-header">
        <h2>Messages and story replies</h2>
      </div>

      <div className="settings-section">
        <h3 className="settings-section__title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <MessageCircle size={20} />
          Message requests
        </h3>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          When someone who you don't follow or haven't chatted with before sends you a message, you receive it as a message request.
          <br /><br />
          <strong>Who can send you message requests</strong><br />
          People you follow or have chatted with before can always send you messages unless you block them.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem 0' }}>
            <input 
              type="radio" 
              name="messageRequestPolicy" 
              value="everyone"
              checked={policy === 'everyone'}
              onChange={(e) => setPolicy(e.target.value)}
              style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '1rem' }}>Everyone</span>
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem 0' }}>
            <input 
              type="radio" 
              name="messageRequestPolicy" 
              value="followers"
              checked={policy === 'followers'}
              onChange={(e) => setPolicy(e.target.value)}
              style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '1rem' }}>Your followers</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.5rem 0' }}>
            <input 
              type="radio" 
              name="messageRequestPolicy" 
              value="none"
              checked={policy === 'none'}
              onChange={(e) => setPolicy(e.target.value)}
              style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '1rem' }}>No one</span>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn--primary" 
            onClick={handleSave}
            disabled={loading || policy === (user?.preferences?.messageRequestPolicy || 'everyone')}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
