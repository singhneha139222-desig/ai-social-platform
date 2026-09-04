import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Users, FileText, AlertTriangle, XCircle, CheckCircle, BarChart3, ArrowRight } from 'lucide-react';

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
        <div className="admin-stats">
          {[1,2,3,4,5,6].map(i => <div key={i} className="stat-card skeleton" style={{ height: '120px' }} />)}
        </div>
      </div>
    );
  }

  const s = stats?.stats || {};

  return (
    <div className="feed-container" style={{ maxWidth: '1000px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Admin Dashboard</h2>
          <p>Platform overview and content moderation.</p>
        </div>
        <button className="btn btn--primary" onClick={() => navigate('/admin/moderation')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Moderation Queue <ArrowRight size={16} />
        </button>
      </div>

      <div className="admin-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="stat-card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Users</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem' }}>{s.totalUsers || 0}</div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <Users size={24} style={{ color: 'var(--accent-primary)' }} />
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Posts</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem' }}>{s.totalPosts || 0}</div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <FileText size={24} style={{ color: 'var(--text-primary)' }} />
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Published</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem' }}>{s.publishedPosts || 0}</div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <CheckCircle size={24} style={{ color: 'var(--success)' }} />
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flagged</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem' }}>{s.flaggedPosts || 0}</div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <AlertTriangle size={24} style={{ color: 'var(--warning)' }} />
            </div>
          </div>
        </div>
        <div className="stat-card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--error)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--error)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rejected</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem' }}>{s.rejectedPosts || 0}</div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)' }}>
              <XCircle size={24} style={{ color: 'var(--error)' }} />
            </div>
          </div>
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
        <h3 style={{ fontWeight: 600, marginBottom: '1.5rem' }}>Recent Moderation Activity</h3>

        {stats?.recentModerationLogs?.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-default)' }}>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Type</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Decision</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Score</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Source</th>
                  <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentModerationLogs.map((log) => (
                  <tr key={log._id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{log.contentType}</span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span className={`badge ${log.decision === 'flagged' ? 'badge--warning' : log.decision === 'rejected' ? 'badge--error' : 'badge--ai'}`}>
                        {log.decision}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', fontFamily: 'monospace' }}>
                      {log.toxicityScore != null ? log.toxicityScore.toFixed(4) : 'N/A'}
                    </td>
                    <td style={{ padding: '1rem 0.5rem' }}>
                      <span className="badge badge--ghost">{log.source}</span>
                    </td>
                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
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
