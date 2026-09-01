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
        const [profileRes, postsRes] = await Promise.all([
          userAPI.getProfile(username),
          postAPI.getUserPosts(username).catch(() => ({ data: { data: { posts: [] } } })),
        ]);
        setProfile(profileRes.data.data.user);
        setFollowing(profileRes.data.data.user.isFollowing || false);

        // getUserPosts expects userId, but we have username
        // Let's fetch posts using the user ID from profile
        const userId = profileRes.data.data.user._id;
        const postsResult = await postAPI.getUserPosts(userId);
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
      <div className="page-container">
        <div className="profile-header">
          <div className="skeleton" style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px' }} />
          <div className="skeleton" style={{ width: 160, height: 20, margin: '0 auto 8px' }} />
          <div className="skeleton" style={{ width: 120, height: 14, margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  if (!profile) return <div className="page-container"><div className="empty-state"><div className="empty-state__title">User not found</div></div></div>;

  const initial = profile.displayName?.[0] || profile.username?.[0] || '?';

  return (
    <div className="page-container">
      <div className="profile-header">
        <div className="avatar avatar--xl" style={{ margin: '0 auto 16px', fontSize: '2rem' }}>{initial}</div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{profile.displayName || profile.username}</h2>
        <p className="text-muted" style={{ fontSize: '0.9rem' }}>@{profile.username}</p>
        {profile.bio && <p style={{ marginTop: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{profile.bio}</p>}

        <div className="profile-header__stats">
          <div className="profile-header__stat">
            <div className="profile-header__stat-value">{posts.length}</div>
            <div className="profile-header__stat-label">Posts</div>
          </div>
          <div className="profile-header__stat">
            <div className="profile-header__stat-value">{profile.followersCount || 0}</div>
            <div className="profile-header__stat-label">Followers</div>
          </div>
          <div className="profile-header__stat">
            <div className="profile-header__stat-value">{profile.followingCount || 0}</div>
            <div className="profile-header__stat-label">Following</div>
          </div>
        </div>

        {!isOwnProfile && (
          <button
            className={`btn ${following ? 'btn--secondary' : 'btn--primary'}`}
            style={{ marginTop: 16 }}
            onClick={handleFollow}
          >
            {following ? <><UserMinus size={16} /> Unfollow</> : <><UserPlus size={16} /> Follow</>}
          </button>
        )}
      </div>

      <div className="page-header"><h2 style={{ fontSize: '1.1rem' }}>Posts</h2></div>
      <div className="feed-list">
        {posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__title">No posts yet</div>
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
