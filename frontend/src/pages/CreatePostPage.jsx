import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { postAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import { Send, AlertTriangle, CheckCircle, Clock, Image as ImageIcon, X } from 'lucide-react';
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
    <div className="feed-container" style={{ maxWidth: '600px', margin: '0 auto', paddingTop: '20px' }}>
      <div className="post-composer-card" style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
          {step === 1 ? (
            <div style={{ width: '24px' }}></div>
          ) : (
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <X size={24} />
            </button>
          )}
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Create new post</h3>
          {step === 1 ? (
            <button 
              onClick={() => setStep(2)} 
              style={{ background: 'none', border: 'none', color: '#0095f6', fontWeight: 'bold', cursor: 'pointer' }}
              disabled={!mediaFile && !content.trim()}
            >
              Next
            </button>
          ) : (
            <button 
              onClick={handleSubmit} 
              disabled={loading || (!content.trim() && !mediaFile)}
              style={{ background: 'none', border: 'none', color: '#0095f6', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Sharing...' : 'Share'}
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          {step === 1 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative' }}>
              {!mediaFile ? (
                <>
                  <ImageIcon size={64} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '24px', fontWeight: '400' }}>Upload photos or videos here</h2>
                  <button 
                    className="btn btn--primary" 
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select from computer
                  </button>
                </>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {mediaFile.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(mediaFile)} alt="Preview" style={{ maxHeight: '400px', maxWidth: '100%', objectFit: 'contain' }} />
                  ) : (
                    <video src={URL.createObjectURL(mediaFile)} style={{ maxHeight: '400px', maxWidth: '100%', objectFit: 'contain' }} controls />
                  )}
                  <div style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '8px', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon size={20} color="white" />
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
              
              {/* Fallback text input if they just want a text post */}
              {!mediaFile && (
                <div style={{ marginTop: '40px', width: '100%' }}>
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>Or just write something</p>
                  <textarea
                    placeholder="What's on your mind?"
                    value={content}
                    onChange={(e) => { setContent(e.target.value); setResult(null); }}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', resize: 'none', height: '100px' }}
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flex: 1, padding: '16px', gap: '16px', alignItems: 'flex-start' }}>
              {mediaFile && (
                <div style={{ width: '100px', height: '100px', flexShrink: 0 }}>
                  {mediaFile.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(mediaFile)} alt="Thumb" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                  ) : (
                    <video src={URL.createObjectURL(mediaFile)} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                  )}
                </div>
              )}
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <textarea
                  placeholder="Write a caption..."
                  value={content}
                  onChange={(e) => { setContent(e.target.value); setResult(null); }}
                  maxLength={MAX_LENGTH}
                  style={{ width: '100%', border: 'none', background: 'transparent', resize: 'none', outline: 'none', minHeight: '100px', fontSize: '1rem', color: 'var(--text-primary)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                  <StickerPicker onSelect={(emoji) => setContent(prev => prev + emoji)} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {content.length}/{MAX_LENGTH}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {result && (
        <div className={`toast ${resultClass()}`} style={{ marginTop: '20px' }}>
          {resultIcon()}
          {result.message}
        </div>
      )}
    </div>
  );
}
