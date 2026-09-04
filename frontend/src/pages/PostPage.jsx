import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { postAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import PostCard from '../components/PostCard';
import { ArrowLeft } from 'lucide-react';

export default function PostPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    postAPI.getPost(id)
      .then((res) => {
        setPost(res.data.data.post);
      })
      .catch((err) => {
        toast.error('Failed to load post');
        navigate(-1);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, navigate, toast]);

  if (loading) {
    return (
      <div className="feed-container">
        <div className="post-card">
          <div className="skeleton" style={{ height: '200px' }} />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="feed-container" style={{ textAlign: 'center', padding: '2rem' }}>
        <h3>Post not found</h3>
        <button className="btn btn--secondary" onClick={() => navigate(-1)} style={{ marginTop: '1rem' }}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="feed-container">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem' }}>
        <button className="icon-button" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ margin: 0 }}>Post</h2>
      </div>
      
      <PostCard post={post} onDelete={() => navigate('/feed')} />
    </div>
  );
}
