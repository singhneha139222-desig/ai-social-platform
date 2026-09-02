import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Users, FileText, AlertTriangle, XCircle, CheckCircle, BarChart3 } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    adminAPI.getStats().then((res) => {
      setStats(res.data.data);
    }).catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="feed-container">
        <div className="page-header" style={{ opacity: 0.5 }}><h1>Admin Dashboard</h1></div>
      </div>
    );
  }

  const s = stats?.stats || {};

  return (
    <div className="feed-container" style={{ maxWidth: '900px' }}>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Platform overview and moderation.</p>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-card__title">Total Users</div>
          <div className="stat-card__value">{s.totalUsers || 0}</div>
          <Users size={24} style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }} />
        </div>
        <div className="stat-card">
          <div className="stat-card__title">Total Posts</div>
          <div className="stat-card__value">{s.totalPosts || 0}</div>
          <FileText size={24} style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }} />
        </div>
        <div className="stat-card">
          <div className="stat-card__title">Published</div>
          <div className="stat-card__value">{s.publishedPosts || 0}</div>
          <CheckCircle size={24} style={{ color: 'var(--success)', marginTop: '0.5rem' }} />
        </div>
        <div className="stat-card">
          <div className="stat-card__title">Flagged</div>
          <div className="stat-card__value">{s.flaggedPosts || 0}</div>
          <AlertTriangle size={24} style={{ color: 'var(--warning)', marginTop: '0.5rem' }} />
        </div>
        <div className="stat-card stat-card--danger">
          <div className="stat-card__title">Rejected</div>
          <div className="stat-card__value">{s.rejectedPosts || 0}</div>
          <XCircle size={24} style={{ color: 'var(--error)', marginTop: '0.5rem' }} />
        </div>
        <div className="stat-card">
          <div className="stat-card__title">Comments</div>
          <div className="stat-card__value">{s.totalComments || 0}</div>
          <BarChart3 size={24} style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }} />
        </div>
      </div>

      {stats?.stats?.sentimentDistribution && (
        <div className="post-card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Sentiment Distribution</h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {Object.entries(stats.stats.sentimentDistribution).map(([label, count]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={`badge badge--sentiment-${label}`}>{label}</span>
                <span style={{ fontWeight: 600 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="post-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 600 }}>Recent Moderation Activity</h3>
          <button className="btn btn--primary" onClick={() => navigate('/admin/moderation')}>
            View Moderation Queue
          </button>
        </div>

        {stats?.recentModerationLogs?.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Type</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Decision</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Score</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Source</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentModerationLogs.map((log) => (
                  <tr key={log._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{log.contentType}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span className="badge badge--ai">{log.decision}</span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{log.toxicityScore != null ? log.toxicityScore.toFixed(4) : 'N/A'}</td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>{log.source}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No recent moderation activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
