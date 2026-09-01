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
      <div className="page-container page-container--wide">
        <div className="page-header"><h1>Admin Dashboard</h1></div>
        <div className="stats-grid">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="stat-card"><div className="skeleton" style={{ height: 60 }} /></div>)}
        </div>
      </div>
    );
  }

  const s = stats?.stats || {};

  return (
    <div className="page-container page-container--wide">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Platform overview and moderation</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <Users size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
          <div className="stat-card__value">{s.totalUsers || 0}</div>
          <div className="stat-card__label">Total Users</div>
        </div>
        <div className="stat-card">
          <FileText size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
          <div className="stat-card__value">{s.totalPosts || 0}</div>
          <div className="stat-card__label">Total Posts</div>
        </div>
        <div className="stat-card">
          <CheckCircle size={24} style={{ color: 'var(--success)', marginBottom: 8 }} />
          <div className="stat-card__value">{s.publishedPosts || 0}</div>
          <div className="stat-card__label">Published</div>
        </div>
        <div className="stat-card">
          <AlertTriangle size={24} style={{ color: 'var(--warning)', marginBottom: 8 }} />
          <div className="stat-card__value">{s.flaggedPosts || 0}</div>
          <div className="stat-card__label">Flagged</div>
        </div>
        <div className="stat-card">
          <XCircle size={24} style={{ color: 'var(--error)', marginBottom: 8 }} />
          <div className="stat-card__value">{s.rejectedPosts || 0}</div>
          <div className="stat-card__label">Rejected</div>
        </div>
        <div className="stat-card">
          <BarChart3 size={24} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
          <div className="stat-card__value">{s.totalComments || 0}</div>
          <div className="stat-card__label">Comments</div>
        </div>
      </div>

      {stats?.stats?.sentimentDistribution && (
        <div className="card mb-lg">
          <h3 style={{ marginBottom: 16 }}>Sentiment Distribution</h3>
          <div className="flex gap-lg">
            {Object.entries(stats.stats.sentimentDistribution).map(([label, count]) => (
              <div key={label} className="flex items-center gap-sm">
                <span className={`post-card__sentiment post-card__sentiment--${label}`}>{label}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-md">
          <h3>Moderation Queue</h3>
          <button className="btn btn--primary btn--sm" onClick={() => navigate('/admin/moderation')}>
            View All Flagged Content
          </button>
        </div>

        {stats?.recentModerationLogs?.length > 0 ? (
          <table className="mod-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Decision</th>
                <th>Score</th>
                <th>Source</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentModerationLogs.map((log) => (
                <tr key={log._id}>
                  <td>{log.contentType}</td>
                  <td><span className={`mod-badge mod-badge--${log.decision === 'publish' ? 'published' : log.decision === 'flag' ? 'flagged' : 'rejected'}`}>{log.decision}</span></td>
                  <td>{log.toxicityScore != null ? log.toxicityScore.toFixed(4) : 'N/A'}</td>
                  <td>{log.source}</td>
                  <td className="text-sm text-muted">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted">No recent moderation activity</p>
        )}
      </div>
    </div>
  );
}
