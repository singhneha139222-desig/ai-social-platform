import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) return;
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome!');
      navigate('/feed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">
          <h1>AI Social</h1>
          <p>Create your account</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input id="username" name="username" className="form-input" placeholder="johndoe"
              value={form.username} onChange={handleChange} required autoFocus minLength={3} maxLength={30} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="displayName">Display Name</label>
            <input id="displayName" name="displayName" className="form-input" placeholder="John Doe"
              value={form.displayName} onChange={handleChange} maxLength={50} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email</label>
            <input id="reg-email" name="email" className="form-input" type="email" placeholder="you@example.com"
              value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <input id="reg-password" name="password" className="form-input" type="password" placeholder="At least 6 characters"
              value={form.password} onChange={handleChange} required minLength={6} />
          </div>
          <button className="btn btn--primary btn--full" disabled={loading} type="submit">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-card__footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
