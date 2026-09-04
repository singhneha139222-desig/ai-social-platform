import { useState } from 'react';
import { useToast } from '../../context/ToastContext';

export default function NotificationsSettings() {
  const toast = useToast();
  const [prefs, setPrefs] = useState({
    pauseAll: false,
    likes: true,
    comments: true,
    follows: true,
    messages: true,
    live: false
  });

  const handleChange = (e) => {
    const { name, checked } = e.target;
    setPrefs({ ...prefs, [name]: checked });
    toast.success('Preference updated');
  };

  return (
    <div>
      <div className="settings-header">
        <h2>Notifications</h2>
      </div>

      <div className="settings-section">
        <div className="settings-toggle-row">
          <div className="settings-toggle-info">
            <h4>Pause all</h4>
            <p>Temporarily pause all notifications</p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" name="pauseAll" checked={prefs.pauseAll} onChange={handleChange} />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section__title">Push notifications</h3>
        
        {['likes', 'comments', 'follows', 'messages', 'live'].map(key => (
          <div key={key} className="settings-toggle-row">
            <div className="settings-toggle-info">
              <h4 style={{ textTransform: 'capitalize' }}>{key}</h4>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" name={key} checked={prefs[key]} onChange={handleChange} disabled={prefs.pauseAll} />
              <span className="toggle-slider"></span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
