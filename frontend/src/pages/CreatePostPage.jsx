import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Send, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function CreatePostPage() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();
  const MAX_LENGTH = 2000;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await postAPI.create({ content });
      const data = res.data.data;
      setResult(data.moderation);

      if (data.moderation.decision === 'publish') {
        toast.success(data.moderation.message);
        setTimeout(() => navigate('/feed'), 1500);
      } else if (data.moderation.decision === 'flag') {
        toast.warning(data.moderation.message);
      } else if (data.moderation.decision === 'reject') {
        toast.error(data.moderation.message);
      } else {
        // Pending (AI unavailable case)
        toast.info(data.moderation.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create post');
    }
    setLoading(false);
  };

  const resultIcon = () => {
    if (!result) return null;
    if (result.decision === 'publish') return <CheckCircle size={20} />;
    if (result.decision === 'flag' || result.status === 'pending') return <Clock size={20} />;
    return <AlertTriangle size={20} />;
  };

  const resultClass = () => {
    if (!result) return '';
    if (result.decision === 'publish') return 'toast--success';
    if (result.decision === 'flag' || result.status === 'pending') return 'toast--warning';
    return 'toast--error';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Create Post</h1>
        <p>Share your thoughts with the community</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <textarea
              className="form-input form-textarea"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => { setContent(e.target.value); setResult(null); }}
              maxLength={MAX_LENGTH}
              style={{ minHeight: 160 }}
              required
              aria-label="Post content"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span className="text-sm text-muted">
                Posts are analyzed by AI for content safety
              </span>
              <span className={`text-sm ${content.length > MAX_LENGTH * 0.9 ? 'text-muted' : 'text-muted'}`}
                style={{ color: content.length > MAX_LENGTH * 0.9 ? 'var(--warning)' : undefined }}>
                {content.length}/{MAX_LENGTH}
              </span>
            </div>
          </div>

          <button className="btn btn--primary btn--full" disabled={loading || !content.trim()} type="submit">
            {loading ? (
              <><div className="spinner" style={{ width: 18, height: 18 }} /> Analyzing &amp; posting...</>
            ) : (
              <><Send size={18} /> Publish Post</>
            )}
          </button>
        </form>

        {result && (
          <div className={`toast ${resultClass()}`} style={{ marginTop: 16, animation: 'none' }}>
            {resultIcon()}
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}
