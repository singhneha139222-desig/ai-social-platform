import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { postAPI } from '../services/api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PostCard({ post, onDelete, onLikeToggle }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(post.isLiked || false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComment, setLoadingComment] = useState(false);

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
        <div className="avatar avatar--md" onClick={() => navigate(`/profile/${post.author?.username}`)} style={{ cursor: 'pointer' }}>
          {initial}
        </div>
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

      <div className="post-card__content">{post.content}</div>

      <div className="post-card__actions">
        <button className={`action-btn ${liked ? 'active' : ''}`} onClick={handleLike}>
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
          {likesCount}
        </button>

        <button className="action-btn" onClick={toggleComments}>
          <MessageCircle size={18} />
          {post.commentsCount || 0}
        </button>
        
        {sentimentBadge()}
      </div>

      {showComments && (
        <div className="comments-section">
          <form onSubmit={handleComment} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
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
              <div className="avatar avatar--sm">
                {c.author?.displayName?.[0] || c.author?.username?.[0] || '?'}
              </div>
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-author">{c.author?.displayName || c.author?.username}</span>
                  <span className="post-card__time">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                </div>
                <div className="comment-text">{c.content}</div>
              </div>
            </div>
          ))}
          {comments.length === 0 && <div className="text-muted text-sm" style={{ textAlign: 'center', padding: '1rem' }}>No comments yet. Be the first to comment.</div>}
        </div>
      )}
    </div>
  );
}
