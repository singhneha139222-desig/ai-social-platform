import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { postAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import { Send, AlertTriangle, CheckCircle, Clock, Image as ImageIcon, X } from 'lucide-react';

export default function CreatePostPage() {
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [pendingPostId, setPendingPostId] = useState(null);
  const fileInputRef = useRef(null);
  const toast = useToast();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const MAX_LENGTH = 2000;

  useEffect(() => {
    if (!socket) return;

    const handleModerationUpdate = (data) => {
      if (pendingPostId && data.postId === pendingPostId) {
        setResult({
          status: data.status,
          decision: data.decision,
          message: getModerationMessage(data.decision, data.status)
        });
        setLoading(false);
        setPendingPostId(null);
        
        if (data.decision === 'publish') {
          toast.success('Post published successfully');
          setTimeout(() => navigate('/feed'), 1500);
        } else if (data.decision === 'flag') {
          toast.warning('Your post is pending review.');
        } else if (data.decision === 'reject') {
          toast.error('Your post was rejected because it violated content guidelines.');
        } else if (data.decision === 'failed') {
          toast.info(data.message || 'Content moderation is temporarily unavailable. Your post is pending review.');
        }
      }
    };

    socket.on('moderation:update', handleModerationUpdate);
    return () => socket.off('moderation:update', handleModerationUpdate);
  }, [socket, pendingPostId, navigate, toast]);

  const getModerationMessage = (decision, status) => {
    if (decision === 'publish') return 'Your post has been published.';
    if (decision === 'flag') return 'Your post is pending review.';
    if (decision === 'reject') return 'Your post could not be published because it did not meet our content guidelines.';
    if (decision === 'failed') return 'Content moderation is temporarily unavailable. Your post is pending review.';
    if (status === 'pending') return 'Checking content with AI...';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !mediaFile) return;
    setLoading(true);
    setResult({ status: 'pending', decision: 'pending', message: 'Submitting post...' });
    
    try {
      let mediaData = null;
      if (mediaFile) {
        const formData = new FormData();
        formData.append('media', mediaFile);
        const uploadRes = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        mediaData = uploadRes.data.data;
      }

      const payload = { content };
      if (mediaData) {
        payload.mediaUrl = mediaData.filename;
        payload.mediaType = mediaData.type;
        payload.mimeType = mediaData.mimeType;
        payload.mediaSize = mediaData.sizeBytes;
      }

      const res = await postAPI.create(payload);
      const data = res.data.data;
      
      // Keep loading state true because AI moderation is running asynchronously
      setResult({ status: 'pending', decision: 'pending', message: 'Checking content with AI...' });
      setPendingPostId(data.post._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create post');
      setLoading(false);
      setResult(null);
      setPendingPostId(null);
    }
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
          
          {mediaFile && (
            <div className="media-preview" style={{ position: 'relative', marginTop: '10px', display: 'inline-block' }}>
              {mediaFile.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(mediaFile)} alt="Preview" style={{ maxHeight: '150px', borderRadius: '8px' }} />
              ) : (
                <video src={URL.createObjectURL(mediaFile)} style={{ maxHeight: '150px', borderRadius: '8px' }} controls />
              )}
              <button 
                type="button" 
                onClick={() => { setMediaFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'red', color: 'white', borderRadius: '50%', border: 'none', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
          )}
          
          <div className="post-composer__footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn--outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <ImageIcon size={16} /> Add Media
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setMediaFile(e.target.files[0]);
                    setResult(null);
                  }
                }} 
                accept="image/*,video/*" 
                style={{ display: 'none' }} 
              />
              <span className={`post-composer__chars ${content.length > MAX_LENGTH * 0.9 ? 'error' : ''}`}>
                {content.length}/{MAX_LENGTH}
              </span>
            </div>
            
            <button className="btn btn--primary" disabled={loading || (!content.trim() && !mediaFile)} type="submit">
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
