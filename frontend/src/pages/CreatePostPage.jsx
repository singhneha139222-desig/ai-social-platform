import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { postAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, CheckCircle, Clock, Image as ImageIcon, X } from 'lucide-react';
import StickerPicker from '../components/StickerPicker';

export default function CreatePostPage() {
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [pendingPostId, setPendingPostId] = useState(null);
  const [step, setStep] = useState(1);
  const fileInputRef = useRef(null);
  const toast = useToast();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();
  const MAX_LENGTH = 2000;

  useEffect(() => {
    if (!socket) return;

    const handleModerationUpdate = (data) => {
      if (pendingPostId && data.postId === pendingPostId) {
        setResult({
          status: data.status,
          decision: data.decision,
          message: getModerationMessage(data.decision, data.status, data.toxicity)
        });
        setLoading(false);
        setPendingPostId(null);
        
        const scoreStr = data.toxicity !== undefined ? ` (Toxicity: ${(data.toxicity * 100).toFixed(1)}%)` : '';

        if (data.decision === 'publish') {
          toast.success(`Post published successfully${scoreStr}`);
          setTimeout(() => navigate('/feed'), 1500);
        } else if (data.decision === 'flag') {
          toast.warning(`Your post is pending review.${scoreStr}`);
        } else if (data.decision === 'reject') {
          toast.error(`Your post was rejected because it violated content guidelines.${scoreStr}`);
        } else if (data.decision === 'failed') {
          toast.info(data.message || 'Content moderation is temporarily unavailable. Your post is pending review.');
        }
      }
    };

    socket.on('moderation:update', handleModerationUpdate);
    return () => socket.off('moderation:update', handleModerationUpdate);
  }, [socket, pendingPostId, navigate, toast]);

  const getModerationMessage = (decision, status, toxicity) => {
    const scoreStr = toxicity !== undefined ? ` (Toxicity: ${(toxicity * 100).toFixed(1)}%)` : '';
    if (decision === 'publish') return `Your post has been published.${scoreStr}`;
    if (decision === 'flag') return `Your post is pending review.${scoreStr}`;
    if (decision === 'reject') return `Your post could not be published because it did not meet our content guidelines.${scoreStr}`;
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
    <div className="create-post-container" style={{ width: '100%', padding: '2rem 1rem', display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
      <div className="create-post-workspace" style={{ 
        width: '100%', 
        maxWidth: step === 1 ? '700px' : '950px', 
        backgroundColor: 'var(--bg-primary)', 
        borderRadius: 'var(--radius-lg)', 
        overflow: 'hidden', 
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-lg)',
        transition: 'max-width 0.3s ease'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border-default)' }}>
          {step === 1 ? (
            <div style={{ width: '24px' }}></div>
          ) : (
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
              <X size={24} />
            </button>
          )}
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>Create new post</h3>
          {step === 1 ? (
            <button 
              onClick={() => setStep(2)} 
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: '600', cursor: (!mediaFile && !content.trim()) ? 'not-allowed' : 'pointer', opacity: (!mediaFile && !content.trim()) ? 0.5 : 1, fontSize: '0.95rem' }}
              disabled={!mediaFile && !content.trim()}
            >
              Next
            </button>
          ) : (
            <button 
              onClick={handleSubmit} 
              disabled={loading || (!content.trim() && !mediaFile)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: '600', cursor: loading || (!content.trim() && !mediaFile) ? 'not-allowed' : 'pointer', opacity: loading || (!content.trim() && !mediaFile) ? 0.5 : 1, fontSize: '0.95rem' }}
            >
              {loading ? 'Sharing...' : 'Share'}
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
          {step === 1 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px', position: 'relative', gap: '30px', alignItems: 'center', justifyContent: 'center' }}>
              
              {!mediaFile ? (
                <>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ 
                      width: '100%',
                      maxWidth: '500px',
                      aspectRatio: '16/9',
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      border: '2px dashed var(--border-default)', 
                      borderRadius: 'var(--radius-lg)', 
                      padding: '40px',
                      cursor: 'pointer',
                      background: 'var(--bg-secondary)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                  >
                    <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '50%', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
                      <ImageIcon size={32} style={{ color: 'var(--text-primary)' }} />
                    </div>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: '600', color: 'var(--text-primary)' }}>Upload photos or videos</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>Drag and drop or click to browse</p>
                    <button style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-md)', fontWeight: '600', cursor: 'pointer' }}>
                      Select from computer
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', maxWidth: '500px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }}></div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-default)' }}></div>
                  </div>

                  <div style={{ width: '100%', maxWidth: '500px' }}>
                    <textarea
                      placeholder="Write a text post instead..."
                      value={content}
                      onChange={(e) => { setContent(e.target.value); setResult(null); }}
                      style={{ width: '100%', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', background: 'var(--bg-primary)', resize: 'none', height: '120px', fontSize: '1rem', outline: 'none', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-default)'}
                    />
                  </div>
                </>
              ) : (
                <div style={{ width: '100%', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
                  {mediaFile.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(mediaFile)} alt="Preview" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  ) : (
                    <video src={URL.createObjectURL(mediaFile)} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} controls />
                  )}
                  <div style={{ position: 'absolute', bottom: '16px', right: '16px', display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setMediaFile(null); }}
                      style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '8px 16px', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem', backdropFilter: 'blur(4px)' }}
                    >
                      Clear
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '8px 16px', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem', backdropFilter: 'blur(4px)' }}
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    if (file.type.startsWith('video/')) {
                      const video = document.createElement('video');
                      video.preload = 'metadata';
                      video.onloadedmetadata = function() {
                        window.URL.revokeObjectURL(video.src);
                        if (video.duration > 60) {
                          toast.error('Video must be 60 seconds or less');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          return;
                        }
                        setMediaFile(file);
                        setResult(null);
                      };
                      video.src = URL.createObjectURL(file);
                    } else {
                      setMediaFile(file);
                      setResult(null);
                    }
                  }
                }} 
                accept="image/*,video/*" 
                style={{ display: 'none' }} 
              />
            </div>
          )}

          {step === 2 && (
            <div className="create-post-step2" style={{ display: 'flex', flex: 1, minHeight: '500px' }}>
              {/* Left Column (Media Preview) */}
              <div className="create-post-media-col" style={{ flex: '1 1 60%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border-default)', overflow: 'hidden', position: 'relative' }}>
                {mediaFile ? (
                  mediaFile.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(mediaFile)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <video src={URL.createObjectURL(mediaFile)} style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} controls />
                  )
                ) : (
                  <div style={{ width: '100%', height: '100%', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
                    <div style={{ fontSize: '1.5rem', color: 'var(--text-primary)', textAlign: 'center', wordBreak: 'break-word', whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontWeight: '500', maxWidth: '80%' }}>
                      {content || 'Your text post preview...'}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right Column (Details) */}
              <div className="create-post-details-col" style={{ flex: '1 1 40%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
                {/* User Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' }}>
                  <div className="avatar avatar--md">
                    {user?.displayName?.[0] || user?.username?.[0] || '?'}
                  </div>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.95rem' }}>{user?.username || 'user'}</span>
                </div>

                {/* Caption Area */}
                <textarea
                  placeholder="Write a caption..."
                  value={content}
                  onChange={(e) => { setContent(e.target.value); setResult(null); }}
                  maxLength={MAX_LENGTH}
                  style={{ 
                    flex: 1, 
                    border: 'none', 
                    background: 'transparent', 
                    resize: 'none', 
                    outline: 'none', 
                    padding: '0 16px', 
                    fontSize: '1rem', 
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
                />
                
                {/* Footer Toolbar */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <StickerPicker onSelect={(emoji) => setContent(prev => prev + emoji)} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {content.length.toLocaleString()}/{MAX_LENGTH.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {result && (
        <div className={`toast ${resultClass()}`} style={{ marginTop: '20px', alignSelf: 'center', width: '100%', maxWidth: step === 1 ? '700px' : '950px' }}>
          {resultIcon()}
          {result.message}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .create-post-step2 {
            flex-direction: column !important;
          }
          .create-post-media-col {
            flex: none !important;
            width: 100% !important;
            height: 350px !important;
            border-right: none !important;
            border-bottom: 1px solid var(--border-default) !important;
          }
          .create-post-details-col {
            flex: none !important;
            width: 100% !important;
            height: 350px !important;
          }
        }
      `}</style>
    </div>
  );
}
