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
    <div className="feed-container" style={{ maxWidth: '1000px' }}>
      <div className="page-header">
        <h1>Content Moderation</h1>
        <p>Review flagged and pending content</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: '2rem' }}>
        {/* Queue */}
        <div>
          {loading ? (
            <div className="mod-card"><div className="skeleton" style={{ height: 200 }} /></div>
          ) : items.length === 0 ? (
            <div className="mod-card">
              <div className="empty-state">
                <CheckCircle size={48} style={{ color: 'var(--success)' }} />
                <h3>Queue is clear</h3>
                <p>No flagged content to review</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((item) => (
                <div key={item._id} className="mod-card" style={{ cursor: 'pointer', border: selected?._id === item._id ? '2px solid var(--accent-primary)' : undefined, marginBottom: 0 }}
                  onClick={() => viewDetail(item)}>
                  <div className="mod-card__header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="avatar avatar--sm">{item.author?.username?.[0] || '?'}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.author?.displayName || item.author?.username}</div>
                        <div className="mod-card__meta">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</div>
                      </div>
                    </div>
                    <span className="badge badge--ai">{item.moderationStatus}</span>
                  </div>
                  <div className="mod-card__content" style={{ borderLeft: 'none', background: 'none', padding: 0 }}>
                    {item.content?.substring(0, 120)}{item.content?.length > 120 ? '...' : ''}
                  </div>
                  {item.toxicityScore != null && (
                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--warning)', fontWeight: 600 }}>
                      <AlertTriangle size={16} />
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
          <div className="mod-card" style={{ position: 'sticky', top: '2rem', alignSelf: 'start', margin: 0 }}>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Content Review</h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <div className="mod-card__meta" style={{ marginBottom: '0.25rem' }}>Author</div>
              <div style={{ fontWeight: 600 }}>{selected.author?.displayName || selected.author?.username} (@{selected.author?.username})</div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div className="mod-card__meta" style={{ marginBottom: '0.25rem' }}>Content</div>
              <div className="mod-card__content">
                {selected.content}
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div className="mod-card__meta" style={{ marginBottom: '0.25rem' }}>Toxicity Score</div>
              <div style={{ fontWeight: 700, fontSize: '1.25rem', color: selected.toxicityScore > 0.90 ? 'var(--error)' : selected.toxicityScore > 0.70 ? 'var(--warning)' : 'var(--success)' }}>
                {selected.toxicityScore != null ? `${(selected.toxicityScore * 100).toFixed(2)}%` : 'N/A'}
              </div>
            </div>

            {selected.toxicityCategories && Object.keys(selected.toxicityCategories).length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="mod-card__meta" style={{ marginBottom: '0.5rem' }}>Category Scores</div>
                {Object.entries(typeof selected.toxicityCategories.toJSON === 'function' ? selected.toxicityCategories.toJSON() : selected.toxicityCategories).map(([cat, score]) => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '0.25rem 0' }}>
                    <span>{cat}</span>
                    <span style={{ fontWeight: 600, color: score > 0.5 ? 'var(--error)' : 'var(--text-muted)' }}>{(score * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}

            {detail?.logs?.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="mod-card__meta" style={{ marginBottom: '0.5rem' }}>Moderation History</div>
                {detail.logs.map((log) => (
                  <div key={log._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', padding: '0.25rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span className="badge badge--ai">{log.decision}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{log.source} — {new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mod-card__actions" style={{ marginTop: '2rem' }}>
              <button className="btn btn--primary" onClick={() => handleApprove(selected._id)} disabled={actionLoading} style={{ flex: 1, backgroundColor: 'var(--success)' }}>
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
