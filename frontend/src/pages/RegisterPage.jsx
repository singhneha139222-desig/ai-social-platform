import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({ 
    contact: '', 
    password: '', 
    dateOfBirth: '',
    displayName: '',
    username: '' 
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.contact || !form.password || !form.dateOfBirth || !form.username) return;
    setLoading(true);
    try {
      await register(form);
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
                <label className="form-label" htmlFor="dateOfBirth" style={{ fontSize: '0.85rem' }}>Date of birth</label>
                <input 
                  id="dateOfBirth" 
                  name="dateOfBirth" 
                  className="form-input" 
                  type="date"
                  max={new Date().toISOString().split("T")[0]}
                  value={form.dateOfBirth} 
                  onChange={handleChange} 
                  required 
                />
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
                <input 
                  id="username" 
                  name="username" 
                  className="form-input" 
                  placeholder="Username"
                  value={form.username} 
                  onChange={handleChange} 
                  required 
                  minLength={3} 
                  maxLength={30} 
                  aria-label="Username"
                />
              </div>
              
              <div className="auth-disclaimer">
                By creating an account, you agree to our <Link to="#">Terms</Link> and <Link to="#">Privacy Policy</Link>.
              </div>

              <button className="btn btn--primary btn--full" disabled={loading} type="submit" style={{ padding: '0.8rem' }}>
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
