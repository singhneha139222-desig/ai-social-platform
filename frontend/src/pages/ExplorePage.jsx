import { useState, useEffect } from 'react';
import { feedAPI } from '../services/api';
import PostCard from '../components/PostCard';
import { useToast } from '../context/ToastContext';
import { Compass } from 'lucide-react';

export default function ExplorePage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Explore</h1>
        <p>Discover new content and people</p>
      </div>
      {loading ? (
        <div className="feed-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card"><div className="skeleton" style={{ height: 80 }} /></div>
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
    </div>
  );
}
