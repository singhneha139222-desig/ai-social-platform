import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function AdminModeration() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'approve' | 'reject' | null
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
    setConfirmAction(null);
    try {
      const res = await adminAPI.getModerationDetail(item._id, 'post');
      setDetail(res.data.data);
    } catch { toast.error('Failed to load details'); }
  };

  const handleApprove = async (id) => {
    if (confirmAction !== 'approve') {
      setConfirmAction('approve');
      return;
    }
    setActionLoading(true);
    try {
      await adminAPI.approveContent(id, { type: 'post', reason: 'Approved by admin' });
      toast.success('Post approved');
      setItems((prev) => prev.filter((i) => i._id !== id));
      setSelected(null);
      setDetail(null);
      setConfirmAction(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to approve'); }
    setActionLoading(false);
  };

  const handleReject = async (id) => {
    if (confirmAction !== 'reject') {
      setConfirmAction('reject');
      return;
    }
    setActionLoading(true);
    try {
      await adminAPI.rejectContent(id, { type: 'post', reason: 'Rejected by admin — violates content guidelines' });
      toast.success('Post rejected');
      setItems((prev) => prev.filter((i) => i._id !== id));
      setSelected(null);
      setDetail(null);
      setConfirmAction(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to reject'); }
    setActionLoading(false);
  };

  return (
    <div className="feed-container" style={{ maxWidth: '1000px' }}>
      <div className="page-header">
        <h2>Content Moderation</h2>
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
                <CheckCircle size={48} style={{ color: 'var(--success)', marginBottom: '1rem' }} />
                <h3>Queue is clear</h3>
                <p>No flagged content to review</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((item) => (
                <div key={item._id} className="mod-card" style={{ cursor: 'pointer', border: selected?._id === item._id ? '2px solid var(--accent-primary)' : '1px solid var(--border-default)', marginBottom: 0, transition: 'all 0.2s' }}
                  onClick={() => viewDetail(item)}
                  onMouseEnter={e => { if (selected?._id !== item._id) e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                  onMouseLeave={e => { if (selected?._id !== item._id) e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                >
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
          <div className="mod-card" style={{ position: 'sticky', top: '2rem', alignSelf: 'start', margin: 0, boxShadow: 'var(--shadow-md)' }}>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Content Review</h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <div className="mod-card__meta" style={{ marginBottom: '0.25rem' }}>Author</div>
              <div style={{ fontWeight: 600 }}>{selected.author?.displayName || selected.author?.username} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(@{selected.author?.username})</span></div>
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
                    <span style={{ textTransform: 'capitalize' }}>{cat}</span>
                    <span style={{ fontWeight: 600, color: score > 0.5 ? 'var(--error)' : 'var(--text-muted)' }}>{(score * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Explainable AI (XAI) Section */}
            {selected.explanation && selected.explanation.status === 'success' && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <AlertTriangle size={16} color="var(--accent-primary)" />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Why?</span>
                </div>
                
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', fontStyle: 'italic' }}>
                  {selected.explanation.summary}
                </p>
                
                <div style={{ marginBottom: '1rem' }}>
                  <div className="mod-card__meta" style={{ marginBottom: '0.5rem' }}>Important Text Spans</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {selected.explanation.topTokens?.map((t, idx) => (
                      <span key={idx} style={{ 
                        background: t.importance > 0.7 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)', 
                        color: 'var(--error)', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.875rem', 
                        fontWeight: 600,
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                      }}>
                        {t.token}
                        <span style={{ marginLeft: '0.3rem', fontSize: '0.7rem', opacity: 0.7, fontWeight: 'normal' }}>
                          {(t.importance * 100).toFixed(0)}%
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div><strong>Method:</strong> {selected.explanation.method}</div>
                  <div><strong>Target:</strong> {selected.explanation.targetCategory}</div>
                  {selected.aiMetadata?.model && (
                    <div><strong>Model:</strong> {selected.aiMetadata.model.split('/').pop()}</div>
                  )}
                </div>
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

            <div className="mod-card__actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
              {confirmAction === 'reject' ? (
                <button className="btn btn--danger" onClick={() => setConfirmAction(null)} style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  Cancel
                </button>
              ) : (
                <button className="btn btn--primary" onClick={() => handleApprove(selected._id)} disabled={actionLoading} style={{ flex: 1, backgroundColor: confirmAction === 'approve' ? 'var(--success)' : undefined }}>
                  {confirmAction === 'approve' ? 'Click to Confirm Approve' : <><CheckCircle size={16} /> Approve</>}
                </button>
              )}
              
              {confirmAction === 'approve' ? (
                <button className="btn btn--secondary" onClick={() => setConfirmAction(null)} style={{ flex: 1 }}>
                  Cancel
                </button>
              ) : (
                <button className="btn btn--danger" onClick={() => handleReject(selected._id)} disabled={actionLoading} style={{ flex: 1 }}>
                  {confirmAction === 'reject' ? 'Click to Confirm Reject' : <><XCircle size={16} /> Reject</>}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
