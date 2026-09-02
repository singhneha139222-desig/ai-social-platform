import { useState, useEffect } from 'react';
import { feedAPI } from '../services/api';
import PostCard from '../components/PostCard';
import { useToast } from '../context/ToastContext';
import { Inbox } from 'lucide-react';

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const toast = useToast();

  const fetchFeed = async (p = 1) => {
    setLoading(true);
    try {
      const res = await feedAPI.getFeed(p);
      setPosts(res.data.data.posts || []);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('Failed to load feed');
    }
    setLoading(false);
  };

  useEffect(() => { fetchFeed(page); }, [page]);

  const handleDelete = (postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  if (loading) {
    return (
      <div className="feed-container">
        <div className="page-header"><h1>Home</h1></div>
        <div className="feed-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card" style={{ padding: 20 }}>
              <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 14, width: '90%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 14, width: '75%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="feed-container">
      <div className="page-header">
        <h1>Home</h1>
        <p>Your personalized feed</p>
      </div>

      {posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon"><Inbox size={48} /></div>
          <div className="empty-state__title">Your feed is empty</div>
          <div className="empty-state__text">Follow some users or create your first post to get started!</div>
        </div>
      ) : (
        <div className="feed-list">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onDelete={handleDelete} />
          ))}
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
