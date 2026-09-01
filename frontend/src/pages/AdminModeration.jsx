import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, XCircle, Eye, AlertTriangle } from 'lucide-react';

export default function AdminModeration() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const toast = useToast();

  const fetchFlagged = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getFlaggedPosts(1, 'post');
      setItems(res.data.data.items || []);
    } catch { toast.error('Failed to load moderation queue'); }
    setLoading(false);
  };

  useEffect(() => { fetchFlagged(); }, []);

  const viewDetail = async (item) => {
    setSelected(item);
    try {
      const res = await adminAPI.getModerationDetail(item._id, 'post');
      setDetail(res.data.data);
    } catch { toast.error('Failed to load details'); }
  };

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      await adminAPI.approveContent(id, { type: 'post', reason: 'Approved by admin' });
      toast.success('Post approved');
      setItems((prev) => prev.filter((i) => i._id !== id));
      setSelected(null);
      setDetail(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve'); }
    setActionLoading(false);
  };

  const handleReject = async (id) => {
    setActionLoading(true);
    try {
      await adminAPI.rejectContent(id, { type: 'post', reason: 'Rejected by admin — violates content guidelines' });
      toast.success('Post rejected');
      setItems((prev) => prev.filter((i) => i._id !== id));
      setSelected(null);
      setDetail(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to reject'); }
    setActionLoading(false);
  };

  return (
    <div className="page-container page-container--wide">
      <div className="page-header">
        <h1>Content Moderation</h1>
        <p>Review flagged and pending content</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* Queue */}
        <div>
          {loading ? (
            <div className="card"><div className="skeleton" style={{ height: 200 }} /></div>
          ) : items.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state__icon"><CheckCircle size={48} /></div>
                <div className="empty-state__title">Queue is clear</div>
                <div className="empty-state__text">No flagged content to review</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((item) => (
                <div key={item._id} className="card" style={{ cursor: 'pointer', border: selected?._id === item._id ? '1px solid var(--accent-start)' : undefined }}
                  onClick={() => viewDetail(item)}>
                  <div className="flex items-center gap-sm mb-md">
                    <div className="avatar avatar--sm">{item.author?.username?.[0] || '?'}</div>
                    <div>
                      <div className="font-semibold text-sm">{item.author?.displayName || item.author?.username}</div>
                      <div className="text-sm text-muted">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</div>
                    </div>
                    <span className={`mod-badge mod-badge--${item.moderationStatus === 'flagged' ? 'flagged' : 'pending'}`} style={{ marginLeft: 'auto' }}>
                      {item.moderationStatus}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {item.content?.substring(0, 120)}{item.content?.length > 120 ? '...' : ''}
                  </p>
                  {item.toxicityScore != null && (
                    <div className="text-sm text-muted mt-sm flex items-center gap-sm">
                      <AlertTriangle size={14} />
                      Toxicity: {(item.toxicityScore * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="card" style={{ position: 'sticky', top: 'calc(var(--navbar-height) + 24px)', alignSelf: 'start' }}>
            <h3 style={{ marginBottom: 16 }}>Content Review</h3>

            <div className="mb-md">
              <div className="text-sm text-muted mb-sm">Author</div>
              <div className="font-semibold">{selected.author?.displayName || selected.author?.username} (@{selected.author?.username})</div>
            </div>

            <div className="mb-md">
              <div className="text-sm text-muted mb-sm">Content</div>
              <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {selected.content}
              </div>
            </div>

            <div className="mb-md">
              <div className="text-sm text-muted mb-sm">Toxicity Score</div>
              <div className="font-semibold" style={{ color: selected.toxicityScore > 0.90 ? 'var(--error)' : selected.toxicityScore > 0.70 ? 'var(--warning)' : 'var(--success)' }}>
                {selected.toxicityScore != null ? `${(selected.toxicityScore * 100).toFixed(2)}%` : 'N/A'}
              </div>
            </div>

            {selected.toxicityCategories && Object.keys(selected.toxicityCategories).length > 0 && (
              <div className="mb-md">
                <div className="text-sm text-muted mb-sm">Category Scores</div>
                {Object.entries(typeof selected.toxicityCategories.toJSON === 'function' ? selected.toxicityCategories.toJSON() : selected.toxicityCategories).map(([cat, score]) => (
                  <div key={cat} className="flex justify-between text-sm" style={{ padding: '4px 0' }}>
                    <span>{cat}</span>
                    <span style={{ color: score > 0.5 ? 'var(--error)' : 'var(--text-muted)' }}>{(score * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}

            {detail?.logs?.length > 0 && (
              <div className="mb-md">
                <div className="text-sm text-muted mb-sm">Moderation History</div>
                {detail.logs.map((log) => (
                  <div key={log._id} className="text-sm" style={{ padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span className={`mod-badge mod-badge--${log.decision === 'publish' ? 'published' : log.decision === 'flag' ? 'flagged' : 'rejected'}`}>
                      {log.decision}
                    </span>
                    <span className="text-muted" style={{ marginLeft: 8 }}>{log.source} — {new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-sm mt-lg">
              <button className="btn btn--success" onClick={() => handleApprove(selected._id)} disabled={actionLoading} style={{ flex: 1 }}>
                <CheckCircle size={16} /> Approve
              </button>
              <button className="btn btn--danger" onClick={() => handleReject(selected._id)} disabled={actionLoading} style={{ flex: 1 }}>
                <XCircle size={16} /> Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
