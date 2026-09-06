import { useState, useEffect, useRef, useCallback } from 'react';
import { feedAPI, userAPI } from '../services/api';
import ExploreGridItem from '../components/ExploreGridItem';
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

  const fetchExplore = async (p = 1) => {
    setLoading(true);
    try {
      const res = await feedAPI.getExplore(p);
      const newPosts = res.data.data.posts || [];
      if (p === 1) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }
      setPagination(res.data.data.pagination);
    } catch {
      toast.error('Failed to load explore');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExplore(page);
  }, [page]);

  const observer = useRef();
  const lastPostElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && pagination && pagination.hasNextPage) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, pagination]);

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
    <div className="explore-container">
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
          {loading && page === 1 ? (
            <div className="explore-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="explore-grid-item" style={{ backgroundColor: 'var(--border-color)' }}></div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon"><Compass size={48} /></div>
              <div className="empty-state__title">Nothing to explore</div>
              <div className="empty-state__text">Check back later for new content</div>
            </div>
          ) : (
            <div className="explore-grid">
              {posts.map((post, index) => {
                if (posts.length === index + 1) {
                  return (
                    <div ref={lastPostElementRef} key={post._id} style={{ height: '100%' }}>
                      <ExploreGridItem post={post} />
                    </div>
                  );
                } else {
                  return <ExploreGridItem key={post._id} post={post} />;
                }
              })}
            </div>
          )}
          
          {loading && page > 1 && <div className="loading" style={{ textAlign: 'center', marginTop: '20px' }}>Loading...</div>}
        </>
      )}
    </div>
  );
}
