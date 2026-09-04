import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useUsernameAvailability from '../hooks/useUsernameAvailability';
import { CheckCircle2, XCircle, Loader2, HelpCircle } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({ 
    contact: '', 
    password: '', 
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    displayName: '',
    username: '' 
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { status: usernameStatus, suggestions, error: usernameError } = useUsernameAvailability(form.username);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.contact || !form.password || !form.dobDay || !form.dobMonth || !form.dobYear || !form.username) return;
    
    // Construct YYYY-MM-DD
    const month = String(form.dobMonth).padStart(2, '0');
    const day = String(form.dobDay).padStart(2, '0');
    const dateOfBirth = `${form.dobYear}-${month}-${day}`;
    
    setLoading(true);
    try {
      await register({ ...form, dateOfBirth });
      toast.success('Account created! Welcome!');
      navigate('/feed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'An account with this email or mobile number already exists.');
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
            <h1 className="auth-brand__title">Join a smarter, safer social experience.</h1>
            <p className="auth-brand__subtitle">Create an account to start connecting and discovering today.</p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="auth-form-container">
          <div className="auth-card">
            <div className="auth-card__header" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <div className="auth-card__logo-mobile">AI Social</div>
              <h1>Create an account</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Join AI Social and connect with people around you.
              </p>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <input 
                  id="contact" 
                  name="contact" 
                  className="form-input" 
                  placeholder="Mobile number or email address"
                  value={form.contact} 
                  onChange={handleChange} 
                  required 
                  autoFocus 
                  aria-label="Mobile number or email address"
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  You may receive notifications from us.
                </div>
              </div>
              
              <div className="form-group" style={{ position: 'relative', marginBottom: '1rem' }}>
                <input 
                  id="password" 
                  name="password" 
                  className="form-input" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password"
                  value={form.password} 
                  onChange={handleChange} 
                  required 
                  minLength={6} 
                  aria-label="Password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Date of birth 
                  <HelpCircle size={14} style={{ color: 'var(--text-secondary)', cursor: 'help' }} />
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select 
                    name="dobDay" 
                    className="form-input" 
                    value={form.dobDay} 
                    onChange={handleChange} 
                    required
                    style={{ flex: 1, padding: '0.75rem', appearance: 'none', background: 'var(--bg-primary) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 0.75rem center/16px' }}
                  >
                    <option value="" disabled>Day</option>
                    {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                  </select>
                  
                  <select 
                    name="dobMonth" 
                    className="form-input" 
                    value={form.dobMonth} 
                    onChange={handleChange} 
                    required
                    style={{ flex: 1, padding: '0.75rem', appearance: 'none', background: 'var(--bg-primary) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 0.75rem center/16px' }}
                  >
                    <option value="" disabled>Month</option>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                      <option key={m} value={i+1}>{m}</option>
                    ))}
                  </select>

                  <select 
                    name="dobYear" 
                    className="form-input" 
                    value={form.dobYear} 
                    onChange={handleChange} 
                    required
                    style={{ flex: 1, padding: '0.75rem', appearance: 'none', background: 'var(--bg-primary) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 0.75rem center/16px' }}
                  >
                    <option value="" disabled>Year</option>
                    {[...Array(100)].map((_, i) => {
                      const year = new Date().getFullYear() - i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <input 
                  id="displayName" 
                  name="displayName" 
                  className="form-input" 
                  placeholder="Full name"
                  value={form.displayName} 
                  onChange={handleChange} 
                  maxLength={50} 
                  aria-label="Full name"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative' }}>
                  <input 
                    id="username" 
                    name="username" 
                    className={`form-input ${usernameStatus === 'invalid' || usernameStatus === 'taken' ? 'input-error' : usernameStatus === 'available' ? 'input-success' : ''}`}
                    placeholder="Username"
                    value={form.username} 
                    onChange={handleChange} 
                    required 
                    minLength={3} 
                    maxLength={30} 
                    aria-label="Username"
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
                    <CheckCircle2 size={14} /> Username is available
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
              </div>
              
              <div className="auth-disclaimer">
                By creating an account, you agree to our <Link to="#">Terms</Link> and <Link to="#">Privacy Policy</Link>.
              </div>

              <button 
                className="btn btn--primary btn--full" 
                disabled={loading || usernameStatus === 'checking' || usernameStatus === 'invalid' || usernameStatus === 'taken'} 
                type="submit" 
                style={{ padding: '0.8rem' }}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
            
            <div className="auth-card__footer">
              Already have an account? <Link to="/login">Log in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
