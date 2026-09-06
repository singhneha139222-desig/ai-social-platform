import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { userAPI, postAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PostCard from '../components/PostCard';
import { UserPlus, UserMinus, Clock } from 'lucide-react';
import UserListModal from '../components/UserListModal';
import BotDetectionPanel from '../components/BotDetectionPanel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const BASE_URL = API_URL.replace('/api/v1', '');
import { getMediaUrl } from '../utils/mediaUtils';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [requested, setRequested] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('followers'); // 'followers' or 'following'

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
        setRequested(profileRes.data.data.user.hasRequested || false);

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
      if (following || requested) {
        await userAPI.unfollowUser(profile._id);
        if (following) {
          setProfile((p) => ({ ...p, followersCount: (p.followersCount || 1) - 1 }));
        }
        setFollowing(false);
        setRequested(false);
        toast.success(requested ? 'Request cancelled' : 'Unfollowed');
      } else {
        const res = await userAPI.followUser(profile._id);
        if (res.data?.data?.requested) {
          setRequested(true);
          toast.success('Follow request sent!');
        } else {
          setFollowing(true);
          setProfile((p) => ({ ...p, followersCount: (p.followersCount || 0) + 1 }));
          toast.success('Following!');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleDeletePost = (postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  const handleOpenFollowers = () => {
    setModalType('followers');
    setModalOpen(true);
  };

  const handleOpenFollowing = () => {
    setModalType('following');
    setModalOpen(true);
  };

  const fetchUsersList = () => {
    if (modalType === 'followers') {
      return userAPI.getFollowers(username);
    }
    return userAPI.getFollowing(username);
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
        {profile.avatar ? (
          <img src={getMediaUrl(profile.avatar, BASE_URL)} alt="Avatar" className="avatar-img avatar--xl" />
        ) : (
          <div className="avatar avatar--xl">{initial}</div>
        )}
        
        <div className="profile-info">
          <h2 className="profile-name">{profile.displayName || profile.username}</h2>
          <p className="profile-handle">@{profile.username}</p>
          
          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-value">{profile.postsCount ?? posts.length}</span>
              <span className="stat-label">Posts</span>
            </div>
            <div className="stat-item" onClick={profile.isPrivateAndNotFollowing ? null : handleOpenFollowers} style={{ cursor: profile.isPrivateAndNotFollowing ? 'default' : 'pointer' }}>
              <span className="stat-value">{profile.followersCount || 0}</span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat-item" onClick={profile.isPrivateAndNotFollowing ? null : handleOpenFollowing} style={{ cursor: profile.isPrivateAndNotFollowing ? 'default' : 'pointer' }}>
              <span className="stat-value">{profile.followingCount || 0}</span>
              <span className="stat-label">Following</span>
            </div>
          </div>
          
          {profile.bio && <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>{profile.bio}</p>}
          
          {!isOwnProfile && (
            <div className="profile-actions">
              <button
                className={`btn ${following || requested ? 'btn--secondary' : 'btn--primary'}`}
                onClick={handleFollow}
              >
                {following ? <><UserMinus size={16} /> Unfollow</> : requested ? <><Clock size={16} /> Requested</> : <><UserPlus size={16} /> Follow</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {currentUser?.role === 'admin' && profile._id && (
        <BotDetectionPanel userId={profile._id} />
      )}

      {profile.isPrivateAndNotFollowing ? (
        <div className="empty-state" style={{ padding: '3rem', borderTop: '1px solid var(--border-color)', marginTop: '2rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h3>This account is private</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Follow to see their posts, followers, and following.</p>
        </div>
      ) : (
        <>
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
        </>
      )}
      
      <UserListModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalType === 'followers' ? 'Followers' : 'Following'}
        fetchUsers={fetchUsersList}
      />
    </div>
  );
}
