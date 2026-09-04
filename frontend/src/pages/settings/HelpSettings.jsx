import { AlertCircle, Shield, Link as LinkIcon, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HelpSettings() {
  return (
    <div>
      <div className="settings-header">
        <h2>Help & Support</h2>
        <p>Get help, report issues, and read our policies.</p>
      </div>

      <div className="settings-section">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <button className="more-menu-item" style={{ padding: '1rem', border: '1px solid var(--border-subtle)' }} onClick={() => alert("Help Center is coming soon!")}>
            <Info size={20} />
            <div style={{ textAlign: 'left', marginLeft: '0.5rem' }}>
              <div style={{ fontWeight: 600 }}>Help Center</div>
            </div>
          </button>
          
          <button className="more-menu-item" style={{ padding: '1rem', border: '1px solid var(--border-subtle)' }} onClick={() => alert("Reporting system is coming soon!")}>
            <AlertCircle size={20} />
            <div style={{ textAlign: 'left', marginLeft: '0.5rem' }}>
              <div style={{ fontWeight: 600 }}>Report a Problem</div>
            </div>
          </button>
          
          <Link to="/privacy" className="more-menu-item" style={{ padding: '1rem', border: '1px solid var(--border-subtle)', textDecoration: 'none' }}>
            <Shield size={20} />
            <div style={{ textAlign: 'left', marginLeft: '0.5rem' }}>
              <div style={{ fontWeight: 600 }}>Privacy and Security Help</div>
            </div>
          </Link>
          
          <button className="more-menu-item" style={{ padding: '1rem', border: '1px solid var(--border-subtle)' }} onClick={() => alert("Account status is currently active.")}>
            <LinkIcon size={20} />
            <div style={{ textAlign: 'left', marginLeft: '0.5rem' }}>
              <div style={{ fontWeight: 600 }}>Account Status</div>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}
