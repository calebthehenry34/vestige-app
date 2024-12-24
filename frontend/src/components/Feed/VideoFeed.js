import React, { useState, useRef, useContext, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../App';
import { useNavigate } from 'react-router-dom';
import { 
  HeartRegular,
  HeartFilled,
  ChatRegular,
  ShareRegular,
  BookmarkRegular,
  BookmarkFilled,
  ArrowLeftFilled,
  PersonRegular,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import { getProfileImageUrl } from '../../utils/imageUtils';
import { API_URL } from '../../config';

const VideoFeed = () => {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const videoRefs = useRef({});
  const touchStartX = useRef(null);

  useEffect(() => {
    const header = document.querySelector('nav');
    const navbar = document.querySelector('[role="navigation"]');
    
    if (header) header.style.display = 'none';
    if (navbar) navbar.style.display = 'none';

    fetchVideos();

    return () => {
      if (header) header.style.display = 'flex';
      if (navbar) navbar.style.display = 'flex';
    };
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/posts?type=video`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const data = await response.json();
      setVideos(data.posts);
    } catch (err) {
      console.error('Error loading videos:', err);
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (!touchStartX.current) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < videos.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
    touchStartX.current = null;
  };

  const handleLike = async (videoId) => {
    if (!user?.id || !videoId) return;

    try {
      // Optimistic update
      setVideos(videos.map(video => {
        if (video._id === videoId) {
          const isLiked = video.likes?.includes(user.id);
          return {
            ...video,
            likes: isLiked 
              ? (video.likes || []).filter(id => id !== user.id)
              : [...(video.likes || []), user.id]
          };
        }
        return video;
      }));

      // Make API call
      const response = await fetch(`${API_URL}/api/posts/${videoId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to like video');
      }

      const updatedVideo = await response.json();
      
      // Update with server response
      setVideos(videos.map(video => 
        video._id === videoId ? updatedVideo : video
      ));
    } catch (error) {
      console.error('Error liking video:', error);
      // Revert optimistic update on error
      setVideos(videos.map(video => 
        video._id === videoId ? { ...video, likes: video.likes || [] } : video
      ));
    }
  };

  const handleSave = async (videoId) => {
    if (!user?.id || !videoId) return;

    setVideos(videos.map(video => {
      if (video._id === videoId) {
        const isSaved = video.saves?.includes(user.id);
        return {
          ...video,
          saves: isSaved
            ? (video.saves || []).filter(id => id !== user.id)
            : [...(video.saves || []), user.id]
        };
      }
      return video;
    }));
  };

  if (loading) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center ${
        theme === 'dark-theme' ? 'bg-black' : 'bg-white'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center ${
        theme === 'dark-theme' ? 'bg-black' : 'bg-white'
      }`}>
        <div className="text-center">
          <ErrorCircleRegular className={`w-12 h-12 mx-auto mb-4 ${
            theme === 'dark-theme' ? 'text-red-400' : 'text-red-500'
          }`} />
          <p className={theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}>
            {error}
          </p>
          <button
            onClick={() => fetchVideos()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];
  if (!currentVideo) return null;

  return (
    <div 
      className="fixed inset-0 w-screen h-screen overflow-hidden z-50 bg-black"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Back Button */}
      <button 
        onClick={() => navigate('/')}
        className="fixed top-6 left-4 z-[60] p-2 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-colors"
        style={{ position: 'fixed' }}
      >
        <ArrowLeftFilled className="w-6 h-6 text-white" />
      </button>

      {/* Video Container */}
      <div className="h-screen flex items-center justify-center">
        <div className="relative w-full h-full">
          <video
            ref={el => videoRefs.current[currentVideo._id] = el}
            src={currentVideo.videoUrl}
            className="w-full h-full object-cover"
            style={{ 
              aspectRatio: '9/16',
              maxHeight: '100vh'
            }}
            playsInline
            autoPlay
            muted
            loop
            onError={(e) => {
              console.error('Video load error:', currentVideo.videoUrl);
              e.target.style.display = 'none';
            }}
          />

          {/* Overlay Controls */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50">
            {/* User Info */}
            <div className="absolute bottom-20 left-4 right-4">
              <div className="flex items-center mb-4">
                {currentVideo.user ? (
                  <img
                    src={getProfileImageUrl(currentVideo.user)}
                    alt={currentVideo.user.username || 'User'}
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${currentVideo.user?.username || 'user'}&background=random`;
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <PersonRegular className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <span className="ml-3 font-medium text-white">
                  {currentVideo.user?.username || 'Unknown User'}
                </span>
              </div>

              {/* Caption */}
              <p className="text-white mb-4">{currentVideo.caption}</p>
            </div>

            {/* Action Buttons */}
            <div className="absolute right-4 bottom-32 flex flex-col items-center space-y-6">
              <button 
                onClick={() => handleLike(currentVideo._id)}
                className="hover:scale-110 transition-transform"
              >
                {currentVideo.likes?.includes(user?.id) ? (
                  <HeartFilled className="w-8 h-8 text-red-500" />
                ) : (
                  <HeartRegular className="w-8 h-8 text-white" />
                )}
                {currentVideo.likes?.length > 0 && (
                  <span className="text-white text-xs mt-1">
                    {currentVideo.likes.length}
                  </span>
                )}
              </button>
              
              <button className="hover:scale-110 transition-transform">
                <ChatRegular className="w-8 h-8 text-white" />
                {currentVideo.comments?.length > 0 && (
                  <span className="text-white text-xs mt-1">
                    {currentVideo.comments.length}
                  </span>
                )}
              </button>

              <button className="hover:scale-110 transition-transform">
                <ShareRegular className="w-8 h-8 text-white" />
              </button>

              <button 
                onClick={() => handleSave(currentVideo._id)}
                className="hover:scale-110 transition-transform"
              >
                {currentVideo.saves?.includes(user?.id) ? (
                  <BookmarkFilled className="w-8 h-8 text-white" />
                ) : (
                  <BookmarkRegular className="w-8 h-8 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Indicators */}
      <div className="absolute top-4 left-0 right-0 flex justify-center space-x-1">
        {videos.map((_, index) => (
          <div
            key={index}
            className={`h-1 rounded-full transition-all ${
              index === currentIndex 
                ? 'w-6 bg-white' 
                : 'w-2 bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoFeed;
