import { Link } from 'react-router-dom';
import { useRef } from 'react';
import { Play, Copy } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
import { getMediaUrl } from '../utils/mediaUtils';

export default function ExploreGridItem({ post }) {
  const isVideo = post.media?.type === 'video';
  const hasMedia = post.media?.type === 'image' || isVideo;
  const mediaUrl = post.media?.url ? getMediaUrl(post.media.url, `${API_URL}/media`) : null;
  const videoRef = useRef(null);

  const handleMouseEnter = () => {
    if (isVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <Link 
      to={`/post/${post._id}`} 
      className={`explore-grid-item ${isVideo ? 'explore-grid-video-item' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {hasMedia && mediaUrl ? (
        <>
          {isVideo ? (
            <video ref={videoRef} src={mediaUrl} className="explore-grid-media" muted playsInline loop />
          ) : (
            <img src={mediaUrl} alt="Post media" className="explore-grid-media" loading="lazy" />
          )}
          
          <div className="explore-media-icon">
            {isVideo ? (
              <Play fill="white" color="white" size={20} />
            ) : (
              <Copy color="white" size={20} style={{ transform: 'rotate(180deg) scaleX(-1)' }} />
            )}
          </div>
        </>
      ) : (
        <div className="explore-grid-text">
          <p>{post.content.length > 80 ? post.content.substring(0, 80) + '...' : post.content}</p>
        </div>
      )}
    </Link>
  );
}
