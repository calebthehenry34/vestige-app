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
  ArrowLeftRegular,
} from '@fluentui/react-icons';


const VideoFeed = () => {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const videoRefs = useRef({});
  const touchStartX = useRef(null);


  useEffect(() => {
    // Hide both header and navbar for this page
    console.log('VideoFeed mounted');
    const header = document.querySelector('nav');
    const navbar = document.querySelector('[role="navigation"]');
    if (header) header.style.display = 'none';
    if (navbar) navbar.style.display = 'none';

    fetchVideos();

    return () => {
      // Show them again when component unmounts
      if (header) header.style.display = 'flex';
      if (navbar) navbar.style.display = 'flex';
    };
  }, []);

  const fetchVideos = async () => {
    try {
      const mockVideos = [
        {
          _id: '1',
          videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
          user: {
            username: 'johnsmith',
            profilePicture: '/api/placeholder/32/32'
          },
          caption: 'Check out this amazing sunset! 🌅 #nature #video',
          likes: [],
          comments: [{ id: 1, text: 'Beautiful!' }],
          saves: [],
          createdAt: new Date().toISOString()
        },
        {
          _id: '2',
          videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          user: {
            username: 'sarahwilson',
            profilePicture: '/api/placeholder/32/32'
          },
          caption: 'Morning coffee and coding session ☕️',
          likes: [],
          comments: [],
          saves: [],
          createdAt: new Date().toISOString()
        },
      ];
      setVideos(mockVideos);
      setLoading(false);
    } catch (err) {
      console.error('Error loading videos:', err);
      setLoading(false);
    }
  };


 // Touch handlers for swipe navigation
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
    setVideos(videos.map(video => {
      if (video._id === videoId) {
        const isLiked = video.likes.includes(user.id);
        return {
          ...video,
          likes: isLiked 
            ? video.likes.filter(id => id !== user.id)
            : [...video.likes, user.id]
        };
      }
      return video;
    }));
  };

  const handleSave = async (videoId) => {
    setVideos(videos.map(video => {
      if (video._id === videoId) {
        const isSaved = video.saves.includes(user.id);
        return {
          ...video,
          saves: isSaved
            ? video.saves.filter(id => id !== user.id)
            : [...video.saves, user.id]
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
        <ArrowLeftRegular className="w-6 h-6 text-white" />
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
          />

          {/* Overlay Controls */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50">
            {/* User Info */}
            <div className="absolute bottom-20 left-4 right-4">
              <div className="flex items-center mb-4">
                <img
                  src={currentVideo.user.profilePicture}
                  alt={currentVideo.user.username}
                  className="w-10 h-10 rounded-full"
                />
                <span className={`ml-3 font-medium text-white`}>
                  {currentVideo.user.username}
                </span>
              </div>

              {/* Caption */}
              <p className="text-white mb-4">{currentVideo.caption}</p>
            </div>

            {/* Action Buttons */}
            <div className="absolute right-4 bottom-32 flex flex-col items-center space-y-6">
              <button onClick={() => handleLike(currentVideo._id)}>
                {currentVideo.likes.includes(user.id) ? (
                  <HeartFilled className="w-8 h-8 text-red-500" />
                ) : (
                  <HeartRegular className="w-8 h-8 text-white" />
                )}
              </button>
              
              <button>
                <ChatRegular className="w-8 h-8 text-white" />
              </button>

              <button>
                <ShareRegular className="w-8 h-8 text-white" />
              </button>

              <button onClick={() => handleSave(currentVideo._id)}>
                {currentVideo.saves.includes(user.id) ? (
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