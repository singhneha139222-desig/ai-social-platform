import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function ForgotPasswordPage() {
  const toast = useToast();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSuccess(true);
      toast.success('Reset email sent successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset email.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-split">
        {/* Left Branding Panel */}
        <div className="auth-brand">
          <div className="shape-1"></div>
          <div className="shape-2"></div>
          <div className="auth-brand__content">
            <div className="auth-brand__logo">AI Social</div>
            <h1 className="auth-brand__title">Reset Password</h1>
            <p className="auth-brand__subtitle">Enter your email and we'll send you a link to get back into your account.</p>
          </div>
        </div>
        
        {/* Right Form Panel */}
        <div className="auth-form-container">
          <div className="auth-card">
            <div className="auth-card__header">
              <h1>Trouble logging in?</h1>
            </div>
            
            {success ? (
              <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                <div style={{ width: 64, height: 64, border: '2px solid var(--accent-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: 'var(--accent-primary)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"></path><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path><path d="m16 19 2 2 4-4"></path></svg>
                </div>
                <h3>Email Sent</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>We sent a link to {email} to reset your password.</p>
                <Link to="/login" className="btn btn--outline btn--full" style={{ padding: '0.8rem', display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                  Back to Log in
                </Link>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <input 
                      id="email" 
                      className="form-input" 
                      type="email" 
                      placeholder="Email address"
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      autoFocus 
                    />
                  </div>
                  
                  <button className="btn btn--primary btn--full" disabled={loading} type="submit" style={{marginTop: '1rem', padding: '0.8rem'}}>
                    {loading ? 'Sending link...' : 'Send login link'}
                  </button>
                </form>
                
                <div className="auth-card__footer" style={{ borderTop: 'none', paddingTop: '1.5rem' }}>
                  <Link to="/login" style={{ fontWeight: '600' }}>Back to Log in</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
