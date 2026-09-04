import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const toast = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      const res = await authAPI.resetPassword(token, { password });
      
      // Auto login user with new token
      localStorage.setItem('token', res.data.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.data.user));
      updateUser(res.data.data.user);
      
      toast.success('Password reset successful! Welcome back.');
      navigate('/feed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired token. Please try again.');
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
            <p className="auth-brand__subtitle">Choose a strong, new password that you haven't used before.</p>
          </div>
        </div>
        
        {/* Right Form Panel */}
        <div className="auth-form-container">
          <div className="auth-card">
            <div className="auth-card__header">
              <h1>Create new password</h1>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ position: 'relative' }}>
                <input 
                  id="password" 
                  className="form-input" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="New password"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  autoFocus
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
              
              <div className="form-group">
                <input 
                  id="confirmPassword" 
                  className="form-input" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Confirm new password"
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                />
              </div>
              
              <button className="btn btn--primary btn--full" disabled={loading} type="submit" style={{marginTop: '1rem', padding: '0.8rem'}}>
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </form>
            
            <div className="auth-card__footer" style={{ borderTop: 'none', paddingTop: '1.5rem' }}>
              <Link to="/login" style={{ fontWeight: '600' }}>Back to Log in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
