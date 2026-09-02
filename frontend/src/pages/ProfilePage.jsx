import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { userAPI, postAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PostCard from '../components/PostCard';
import { UserPlus, UserMinus } from 'lucide-react';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  const isOwnProfile = currentUser?.username === username;

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const [profileRes] = await Promise.all([
          userAPI.getProfile(username)
        ]);
        setProfile(profileRes.data.data.user);
        setFollowing(profileRes.data.data.user.isFollowing || false);

        // getUserPosts expects userId, but we have username
        // Let's fetch posts using the user ID from profile
        const userId = profileRes.data.data.user._id;
        const postsResult = await postAPI.getUserPosts(userId).catch(() => ({ data: { data: { posts: [] } } }));
        setPosts(postsResult.data.data.posts || []);
      } catch (err) {
        toast.error('Failed to load profile');
      }
      setLoading(false);
    };
    fetchProfile();
  }, [username]);

  const handleFollow = async () => {
    if (!profile) return;
    try {
      if (following) {
        await userAPI.unfollowUser(profile._id);
        setFollowing(false);
        setProfile((p) => ({ ...p, followersCount: (p.followersCount || 1) - 1 }));
        toast.success('Unfollowed');
      } else {
        await userAPI.followUser(profile._id);
        setFollowing(true);
        setProfile((p) => ({ ...p, followersCount: (p.followersCount || 0) + 1 }));
        toast.success('Following!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDeletePost = (postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  if (loading) {
    return (
      <div className="feed-container">
        <div className="profile-header" style={{ opacity: 0.5 }}>
          Loading profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="feed-container">
        <div className="empty-state">
          <h3>User not found</h3>
          <p>The profile you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  const initial = profile.displayName?.[0] || profile.username?.[0] || '?';

  return (
    <div className="feed-container">
      <div className="profile-header">
        <div className="avatar avatar--xl">{initial}</div>
        
        <div className="profile-info">
          <h2 className="profile-name">{profile.displayName || profile.username}</h2>
          <p className="profile-handle">@{profile.username}</p>
          
          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-value">{posts.length}</span>
              <span className="stat-label">Posts</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{profile.followersCount || 0}</span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{profile.followingCount || 0}</span>
              <span className="stat-label">Following</span>
            </div>
          </div>
          
          {profile.bio && <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>{profile.bio}</p>}
          
          {!isOwnProfile && (
            <div className="profile-actions">
              <button
                className={`btn ${following ? 'btn--secondary' : 'btn--primary'}`}
                onClick={handleFollow}
              >
                {following ? <><UserMinus size={16} /> Unfollow</> : <><UserPlus size={16} /> Follow</>}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="page-header">
        <h2>Posts</h2>
      </div>
      
      <div className="feed-list">
        {posts.length === 0 ? (
          <div className="empty-state">
            <h3>No posts yet</h3>
            <p>This user hasn't posted anything.</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post._id} post={post} onDelete={handleDeletePost} />
          ))
        )}
      </div>
    </div>
  );
}
