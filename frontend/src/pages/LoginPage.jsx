import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setLoading(true);
    try {
      await login(identifier, password);
      toast.success('Welcome back!');
      navigate('/feed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid login credentials.');
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
            <h1 className="auth-brand__title">Connect.<br/>Discover.<br/>Share safely.</h1>
            <p className="auth-brand__subtitle">A smarter, safer social experience powered by AI.</p>
          </div>
        </div>
        
        {/* Right Form Panel */}
        <div className="auth-form-container">
          <div className="auth-card">
            <div className="auth-card__header">
              <h1>Log in</h1>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <input 
                  id="identifier" 
                  className="form-input" 
                  type="text" 
                  placeholder="Mobile number, username or email address"
                  value={identifier} 
                  onChange={(e) => setIdentifier(e.target.value)} 
                  required 
                  autoFocus 
                  aria-label="Mobile number, username or email address"
                />
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <input 
                  id="password" 
                  className="form-input" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
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
              
              <button className="btn btn--primary btn--full" disabled={loading} type="submit" style={{marginTop: '1rem', padding: '0.8rem'}}>
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>
            
            <div className="auth-forgot-password">
              <Link to="#">Forgot password?</Link>
            </div>

            <div className="auth-card__footer">
              Don&apos;t have an account? <Link to="/register">Sign up</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
