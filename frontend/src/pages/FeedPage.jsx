import { useState, useEffect, useRef, useCallback } from 'react';
import { feedAPI, userAPI } from '../services/api';
import PostCard from '../components/PostCard';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Inbox, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMediaUrl } from '../utils/mediaUtils';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const BASE_URL = API_URL.replace('/api/v1', '');

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [followedIds, setFollowedIds] = useState(new Set());
  const toast = useToast();

  const fetchFeed = async (p = 1) => {
    setLoading(true);
    try {
      const res = await feedAPI.getFeed(p);
      const newPosts = res.data.data.posts || [];
      if (p === 1) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('Failed to load feed');
    }
    setLoading(false);
  };

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
    fetchFeed(page); 
  }, [page]);

  const handleDelete = (postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  const handleFollow = async (userId) => {
    try {
      await userAPI.followUser(userId);
      setFollowedIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(userId);
        return newSet;
      });
      toast.success('User followed');
    } catch (err) {
      toast.error('Failed to follow user');
    }
  };

  if (loading && page === 1) {
    return (
      <div className="feed-page-layout" style={{ display: 'flex', gap: '32px', maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
        <div className="feed-container" style={{ flex: 1, maxWidth: '630px' }}>
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
      </div>
    );
  }

  return (
    <div className="feed-page-layout" style={{ display: 'flex', gap: '32px', maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div className="feed-main" style={{ flex: 1, maxWidth: '630px' }}>
        {posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon"><Inbox size={48} /></div>
            <div className="empty-state__title">Your feed is empty</div>
            <div className="empty-state__text">Follow some users or create your first post to get started!</div>
          </div>
        ) : (
          <div className="feed-list">
            {posts.map((post, index) => {
          if (posts.length === index + 1) {
            return (
              <div ref={lastPostElementRef} key={post._id}>
                <PostCard post={post} onDelete={handleDelete} />
              </div>
            );
          } else {
            return <PostCard key={post._id} post={post} onDelete={handleDelete} />;
          }
        })}

        {loading && page > 1 && <div className="loading" style={{ textAlign: 'center', marginTop: '20px' }}>Loading...</div>}
      </div>
        )}
      </div>

    </div>
  );
}
