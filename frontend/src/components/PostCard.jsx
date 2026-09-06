import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Trash2, Bookmark, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { postAPI } from '../services/api';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StickerPicker from './StickerPicker';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const BASE_URL = API_URL.replace('/api/v1', '');
import { getMediaUrl } from '../utils/mediaUtils';

export default function PostCard({ post, onDelete, onLikeToggle }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(post.isLiked || false);
  const [saved, setSaved] = useState(post.isSaved || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComment, setLoadingComment] = useState(false);

  useEffect(() => {
    setLiked(post.isLiked || false);
    setSaved(post.isSaved || false);
    setLikesCount(post.likesCount || 0);
  }, [post.isLiked, post.isSaved, post.likesCount]);

  const isAuthor = user?.id === (post.author?._id || post.author);
  const initial = post.author?.displayName?.[0] || post.author?.username?.[0] || '?';

  const handleLike = async () => {
    try {
      if (liked) {
        await postAPI.unlikePost(post._id);
        setLiked(false);
        setLikesCount((c) => c - 1);
      } else {
        await postAPI.likePost(post._id);
        setLiked(true);
        setLikesCount((c) => c + 1);
      }
      onLikeToggle?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update like');
    }
  };

  const handleSave = async () => {
    try {
      if (saved) {
        setSaved(false);
        await postAPI.unsavePost(post._id);
      } else {
        setSaved(true);
        await postAPI.savePost(post._id);
      }
    } catch (err) {
      setSaved(!saved); // revert on error
      toast.error('Failed to update save status');
    }
  };

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/post/${post._id}`;
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
      await postAPI.sharePost(post._id);
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    try {
      await postAPI.deletePost(post._id);
      toast.success('Post deleted');
      onDelete?.(post._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete post');
    }
  };

  const toggleComments = async () => {
    if (!showComments && comments.length === 0) {
      try {
        const res = await postAPI.getComments(post._id);
        setComments(res.data.data.comments || []);
      } catch {
        // ignore
      }
    }
    setShowComments(!showComments);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setLoadingComment(true);
    try {
      const res = await postAPI.createComment(post._id, { content: commentText });
      const result = res.data.data;
      if (result.moderation?.decision === 'reject') {
        toast.error(result.moderation.message);
      } else if (result.moderation?.decision === 'flag') {
        toast.warning(result.moderation.message);
      } else {
        setComments((prev) => [...prev, result.comment]);
        toast.success('Comment posted');
      }
      setCommentText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post comment');
    }
    setLoadingComment(false);
  };



  const moderationBadge = () => {
    if (!isAuthor && user?.role !== 'admin') return null;
    const status = post.moderationStatus;
    if (status === 'published' || status === 'approved_by_admin') return null;
    const map = {
      pending: 'pending', flagged: 'flagged', rejected: 'rejected',
      removed: 'rejected', rejected_by_admin: 'rejected',
    };
    const label = {
      pending: 'Pending Review', flagged: 'Under Review', rejected: 'Rejected',
      removed: 'Removed', rejected_by_admin: 'Rejected by Admin',
    };
    // Use badge styling from posts.css
    return <span className="badge badge--ai" style={{ marginLeft: 'auto' }}>{label[status] || status}</span>;
  };

  const sentimentBadge = () => {
    if (!post.sentiment || post.sentiment === 'neutral') return null;
    return (
      <span className={`badge badge--sentiment-${post.sentiment}`} style={{ marginLeft: 'auto' }}>
        {post.sentiment}
      </span>
    );
  };

  return (
    <div className="post-card">
      <div className="post-card__header">
        {post.author?.avatar ? (
          <img src={getMediaUrl(post.author.avatar, BASE_URL)} alt="Avatar" className="avatar-img avatar--md" onClick={() => navigate(`/profile/${post.author?.username}`)} style={{ cursor: 'pointer' }} />
        ) : (
          <div className="avatar avatar--md" onClick={() => navigate(`/profile/${post.author?.username}`)} style={{ cursor: 'pointer' }}>
            {initial}
          </div>
        )}
        <div className="post-card__meta">
          <div className="post-card__author" onClick={() => navigate(`/profile/${post.author?.username}`)} style={{ cursor: 'pointer' }}>
            {post.author?.displayName || post.author?.username}
            <span className="post-card__handle">@{post.author?.username}</span>
          </div>
          <div className="post-card__time">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </div>
        </div>
        
        {moderationBadge()}

        {(isAuthor || user?.role === 'admin') && (
          <button className="btn btn--ghost btn--icon" onClick={handleDelete} title="Delete post">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {post.media && post.media.url && post.media.type !== 'none' && (
        <div className="post-card__media" style={{ marginLeft: '-16px', marginRight: '-16px', marginTop: '12px', overflow: 'hidden' }}>
          {post.media.type === 'image' ? (
            <img src={getMediaUrl(post.media.url, `${API_URL}/media`)} alt="Post media" style={{ width: '100%', maxHeight: '500px', objectFit: 'contain', backgroundColor: '#f0f2f5' }} />
          ) : (
            <video src={getMediaUrl(post.media.url, `${API_URL}/media`)} controls style={{ width: '100%', maxHeight: '500px', backgroundColor: '#000' }} />
          )}
        </div>
      )}

      {post.stickerUrl && (
        <div className="post-card__media" style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', padding: '10px' }}>
          <img src={post.stickerUrl} alt="Post sticker" style={{ width: '150px', height: '150px', objectFit: 'contain', backgroundColor: 'transparent' }} />
        </div>
      )}

      <div className="post-card__actions" style={{ display: 'flex', alignItems: 'center', marginTop: '8px', marginBottom: '8px' }}>
        <button className={`action-btn ${liked ? 'active' : ''}`} onClick={handleLike} style={{ padding: '8px', marginLeft: '-8px' }}>
          <Heart size={24} fill={liked ? 'currentColor' : 'none'} />
        </button>

        <button className="action-btn" onClick={toggleComments} style={{ padding: '8px' }}>
          <MessageCircle size={24} />
        </button>

        <button className="action-btn" onClick={handleShare} style={{ padding: '8px' }}>
          <Send size={24} />
        </button>
        
        {sentimentBadge()}

        <div style={{ flex: 1 }} />
        
        <button className={`action-btn ${saved ? 'active' : ''}`} onClick={handleSave} style={{ padding: '8px', marginRight: '-8px' }}>
          <Bookmark size={24} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '0.95rem' }}>
        {likesCount} likes
      </div>

      {post.content && (
        <div className="post-card__caption" style={{ marginBottom: '8px', fontSize: '0.95rem' }}>
          <span style={{ fontWeight: '600', marginRight: '6px', cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.author?.username}`)}>
            {post.author?.username}
          </span>
          <span>{post.content}</span>
        </div>
      )}

      {showComments && (
        <div className="comments-section">
          <form onSubmit={handleComment} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
            <StickerPicker onSelect={(emoji) => setCommentText(prev => prev + emoji)} className="flex-shrink-0" />
            <input
              className="form-input"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={1000}
            />
            <button className="btn btn--primary" disabled={loadingComment || !commentText.trim()}>
              {loadingComment ? '...' : 'Post'}
            </button>
          </form>
          {comments.map((c) => (
            <div key={c._id} className="comment-item">
              {c.author?.avatar ? (
                <img src={getMediaUrl(c.author.avatar, BASE_URL)} alt="Avatar" className="avatar-img avatar--sm" />
              ) : (
                <div className="avatar avatar--sm">
                  {c.author?.displayName?.[0] || c.author?.username?.[0] || '?'}
                </div>
              )}
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-author">{c.author?.displayName || c.author?.username}</span>
                  <span className="post-card__time">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                </div>
                <div className="comment-text">{c.content}</div>
                {c.stickerUrl && (
                  <div className="comment-sticker mt-2">
                    <img src={c.stickerUrl} alt="Comment sticker" style={{ width: '96px', height: '96px', objectFit: 'contain' }} />
                  </div>
                )}
              </div>
            </div>
          ))}
          {comments.length === 0 && <div className="text-muted text-sm" style={{ textAlign: 'center', padding: '1rem' }}>No comments yet. Be the first to comment.</div>}
        </div>
      )}
    </div>
  );
}
