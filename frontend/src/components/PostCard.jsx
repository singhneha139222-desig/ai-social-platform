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
    return <span className={`mod-badge mod-badge--${map[status] || 'pending'}`}>{label[status] || status}</span>;
  };

  return (
    <div className="post-card">
      <div className="post-card__header">
        <div className="avatar avatar--md" onClick={() => navigate(`/profile/${post.author?.username}`)} style={{ cursor: 'pointer' }}>
          {initial}
        </div>
        <div className="post-card__author-info">
          <div
            className="post-card__author-name"
            onClick={() => navigate(`/profile/${post.author?.username}`)}
            style={{ cursor: 'pointer' }}
          >
            {post.author?.displayName || post.author?.username}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6, fontSize: '0.85rem' }}>
              @{post.author?.username}
            </span>
          </div>
          <div className="post-card__timestamp">
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

      <div className="post-card__footer">
        <button
          className={`post-card__action ${liked ? 'post-card__action--liked' : ''}`}
          onClick={handleLike}
        >
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
          {likesCount}
        </button>

        <button className="post-card__action" onClick={toggleComments}>
          <MessageCircle size={18} />
          {post.commentsCount || 0}
        </button>

        {post.sentiment && (
          <span className={`post-card__sentiment post-card__sentiment--${post.sentiment}`}>
            {post.sentiment}
          </span>
        )}
      </div>

      {showComments && (
        <div className="comments-section">
          <form onSubmit={handleComment} style={{ display: 'flex', gap: 8, marginBottom: 12, marginTop: 12 }}>
            <input
              className="form-input"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={1000}
            />
            <button className="btn btn--primary btn--sm" disabled={loadingComment || !commentText.trim()}>
              {loadingComment ? '...' : 'Post'}
            </button>
          </form>
          {comments.map((c) => (
            <div key={c._id} className="comment-item">
              <div className="avatar avatar--sm">
                {c.author?.displayName?.[0] || c.author?.username?.[0] || '?'}
              </div>
              <div className="comment-item__content">
                <span className="comment-item__author">
                  {c.author?.displayName || c.author?.username}
                </span>
                <div className="comment-item__text">{c.content}</div>
                <div className="comment-item__time">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </div>
                {c.replies?.map((r) => (
                  <div key={r._id} className="comment-item" style={{ marginLeft: 20, marginTop: 8 }}>
                    <div className="avatar avatar--sm">
                      {r.author?.displayName?.[0] || r.author?.username?.[0] || '?'}
                    </div>
                    <div className="comment-item__content">
                      <span className="comment-item__author">{r.author?.displayName || r.author?.username}</span>
                      <div className="comment-item__text">{r.content}</div>
                      <div className="comment-item__time">{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {comments.length === 0 && <div className="text-muted text-sm text-center" style={{ padding: 12 }}>No comments yet</div>}
        </div>
      )}
    </div>
  );
}
