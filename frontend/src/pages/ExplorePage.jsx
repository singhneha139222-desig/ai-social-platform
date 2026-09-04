import { useState, useEffect } from 'react';
import { feedAPI, userAPI } from '../services/api';
import PostCard from '../components/PostCard';
import { useToast } from '../context/ToastContext';
import { Search, Compass, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ExplorePage() {
  const [posts, setPosts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const fetchExplore = async () => {
      setLoading(true);
      try {
        const res = await feedAPI.getExplore(page);
        setPosts(res.data.data.posts || []);
        setPagination(res.data.data.pagination);
      } catch { toast.error('Failed to load explore'); }
      setLoading(false);
    };
    fetchExplore();
  }, [page]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await userAPI.searchUsers(query);
        setSearchResults(res.data.data.users || []);
      } catch (err) {
        console.error(err);
      }
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <div className="feed-container">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: '3rem', paddingRight: '3rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-secondary)', border: 'none' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {query.trim() ? (
        <div className="search-results">
          {searchLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Searching...</div>
          ) : searchResults.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__title">No results found</div>
              <div className="empty-state__text">Try searching for a different username or name.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {searchResults.map(u => (
                <Link to={`/profile/${u.username}`} key={u._id} style={{ textDecoration: 'none' }}>
                  <div className="post-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', cursor: 'pointer', marginBottom: 0 }}>
                    <div className="avatar avatar--md">{u.displayName?.[0] || u.username?.[0] || '?'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.username}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{u.displayName}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {loading ? (
            <div className="feed-list">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card"><div className="skeleton" style={{ height: 120 }} /></div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon"><Compass size={48} /></div>
              <div className="empty-state__title">Nothing to explore</div>
              <div className="empty-state__text">Check back later for new content</div>
            </div>
          ) : (
            <div className="feed-list">
              {posts.map((post) => <PostCard key={post._id} post={post} onDelete={(id) => setPosts(p => p.filter(x => x._id !== id))} />)}
            </div>
          )}
          
          {pagination && pagination.totalPages > 1 && (
            <div className="pagination">
              <button className="pagination__btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span className="pagination__info">Page {page} of {pagination.totalPages}</span>
              <button className="pagination__btn" disabled={!pagination.hasNextPage} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
