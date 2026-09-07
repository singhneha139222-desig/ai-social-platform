import { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { getMediaUrl } from '../utils/mediaUtils';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const BASE_URL = API_URL.replace('/api/v1', '');

export default function RightRail() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sugRes, reqRes, profRes] = await Promise.all([
          userAPI.getSuggestedUsers().catch(() => ({ data: { data: { users: [] } } })),
          userAPI.getFollowRequests().catch(() => ({ data: { data: { requests: [] } } })),
          userAPI.getProfile(user?.username).catch(() => ({ data: { data: { user: null } } }))
        ]);
        
        setSuggestions(sugRes.data?.data?.users || []);
        
        const reqList = reqRes.data?.data?.requests || reqRes.data?.data?.users || [];
        const mappedReqs = reqList.map(r => r.user || r);
        setRequests(mappedReqs);

        if (profRes.data?.data?.user) {
          setProfile(profRes.data.data.user);
        }
      } catch (err) {
        console.error('Failed to load right rail data');
      }
    };
    if (user?.username) {
      fetchData();
    }
  }, [user]);

  const handleAccept = async (userId) => {
    try {
      await userAPI.acceptFollowRequest(userId);
      setRequests(prev => prev.filter(r => r._id !== userId));
    } catch (err) {
      // Error handling
    }
  };

  const handleDecline = async (userId) => {
    try {
      await userAPI.rejectFollowRequest(userId);
      setRequests(prev => prev.filter(r => r._id !== userId));
    } catch (err) {
      // Error handling
    }
  };
  
  const handleFollow = async (userId) => {
    try {
      await userAPI.followUser(userId);
      setSuggestions(prev => prev.filter(s => s._id !== userId));
    } catch (err) {
      // Error handling
    }
  };

  return (
    <aside className="right-rail" style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Current User Stats snippet */}
      {profile && (
        <div className="right-rail-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)' }}>
           {profile.avatar ? (
            <img src={getMediaUrl(profile.avatar, BASE_URL)} alt="Avatar" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {profile.displayName?.[0] || profile.username?.[0] || '?'}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{profile.displayName || profile.username}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{profile.username}</div>
          </div>
          {profile.followersCount !== undefined && (
            <div style={{ textAlign: 'right' }}>
               <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--text-primary)' }}>{profile.followersCount}</div>
               <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Followers</div>
            </div>
          )}
        </div>
      )}

      {/* Follow Requests */}
      {requests && requests.length > 0 && (
        <div className="right-rail-section" style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Requests <span style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>{requests.length}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {requests.map(reqUser => (
              <div key={reqUser._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {reqUser.avatar ? (
                  <img src={getMediaUrl(reqUser.avatar, BASE_URL)} alt="Avatar" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                    {reqUser.displayName?.[0] || reqUser.username?.[0] || '?'}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Link to={`/profile/${reqUser.username}`} style={{ color: 'var(--text-primary)' }}>{reqUser.displayName || reqUser.username}</Link>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    wants to follow you
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button onClick={() => handleAccept(reqUser._id)} style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: '#fff', backgroundColor: 'var(--accent-primary)', borderRadius: 'var(--radius-sm)', border: 'none', padding: '0.4rem', cursor: 'pointer' }}>Accept</button>
                    <button onClick={() => handleDecline(reqUser._id)} style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: 'none', padding: '0.4rem', cursor: 'pointer' }}>Decline</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="right-rail-section" style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Suggestions for you
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {suggestions.map(sugUser => (
              <div key={sugUser._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {sugUser.avatar ? (
                  <img src={getMediaUrl(sugUser.avatar, BASE_URL)} alt="Avatar" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                    {sugUser.displayName?.[0] || sugUser.username?.[0] || '?'}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Link to={`/profile/${sugUser.username}`} style={{ color: 'var(--text-primary)' }}>{sugUser.displayName || sugUser.username}</Link>
                  </div>
                </div>
                <button 
                  onClick={() => handleFollow(sugUser._id)} 
                  style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem' }}
                >
                  Follow
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="right-rail-footer" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'auto', paddingTop: '2rem' }}>
        <p>About · Help Center · Privacy and Terms · Advertising · Business Services</p>
        <p style={{ marginTop: '0.5rem' }}>© 2026 AI Social</p>
      </div>

    </aside>
  );
}
