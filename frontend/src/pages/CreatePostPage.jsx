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
    <div className="feed-container">
      <div className="page-header">
        <h1>Create Post</h1>
        <p>Share your thoughts safely with the community.</p>
      </div>

      <div className="post-composer">
        <form onSubmit={handleSubmit}>
          <textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => { setContent(e.target.value); setResult(null); }}
            maxLength={MAX_LENGTH}
            required
            aria-label="Post content"
          />
          
          <div className="post-composer__footer">
            <span className={`post-composer__chars ${content.length > MAX_LENGTH * 0.9 ? 'error' : ''}`}>
              {content.length}/{MAX_LENGTH}
            </span>
            
            <button className="btn btn--primary" disabled={loading || !content.trim()} type="submit">
              {loading ? 'Analyzing...' : <><Send size={16} /> Publish Post</>}
            </button>
          </div>
        </form>
      </div>
      
      {result && (
        <div className={`toast ${resultClass()}`} style={{ animation: 'none' }}>
          {resultIcon()}
          {result.message}
        </div>
      )}
    </div>
  );
}
