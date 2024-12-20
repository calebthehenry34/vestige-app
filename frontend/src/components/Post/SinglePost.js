import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../App';
import { 
  HeartRegular, 
  HeartFilled, 
  ShareRegular, 
  BookmarkRegular, 
  BookmarkFilled, 
  DismissRegular,
  PersonRegular 
} from '@fluentui/react-icons';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';
import PostComments from './PostComments';

const SinglePost = () => {
  const { theme } = useContext(ThemeContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);
  const [showComments, setShowComments] = useState(true);

  const getMediaUrl = (mediaPath) => {
    if (!mediaPath) return '';
    return mediaPath.startsWith('http') 
      ? mediaPath 
      : `${API_URL}/uploads/${mediaPath}`;
  };
  
  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/posts/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch post');
        }

        const data = await response.json();
        setPost(data);
      } catch (error) {
        console.error('Error fetching post:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handleLike = async () => {
    if (!id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts/${id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts/${id}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setPost(prev => ({ ...prev, saved: result.saved }));
      }
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'Check out this post',
        url: window.location.href
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const renderText = (text) => {
    return text.split(' ').map((word, index) => {
      if (word.startsWith('#')) {
        return (
          <React.Fragment key={index}>
            <button
              onClick={() => navigate(`/explore/hashtag/${word.slice(1)}`)}
              className="text-blue-500 hover:underline"
            >
              {word}
            </button>{' '}
          </React.Fragment>
        );
      } else if (word.startsWith('@')) {
        return (
          <React.Fragment key={index}>
            <button
              onClick={() => navigate(`/profile/${word.slice(1)}`)}
              className="text-blue-500 hover:underline"
            >
              {word}
            </button>{' '}
          </React.Fragment>
        );
      }
      return word + ' ';
    });
  };

  if (loading) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${
        theme === 'dark-theme' ? 'bg-black' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={`w-full h-screen flex items-center justify-center ${
        theme === 'dark-theme' ? 'bg-black' : 'bg-gray-50'
      }`}>
        <div className="text-red-500">Error loading post: {error}</div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col ${
      theme === 'dark-theme' ? 'bg-black' : 'bg-white'
    }`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className={`p-4 flex justify-between items-center border-b ${
          theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <div className="flex items-center">
            {post.user ? (
              <img
                src={getProfileImageUrl(post.user.profilePicture, post.user.username)}
                alt={post.user.username}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                <PersonRegular className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <span className={`ml-3 font-medium ${
              theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
            }`}>{post.user?.username || 'Unknown User'}</span>
          </div>
          <button 
            onClick={() => navigate(-1)} 
            className={`hover:bg-gray-100 p-2 rounded-full transition-colors ${
              theme === 'dark-theme' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <DismissRegular className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* Media Section */}
          <div className="w-full md:w-7/12 bg-black relative flex items-center justify-center">
            {post.mediaType === 'video' ? (
              <video
                src={getMediaUrl(post.media)}
                controls
                className="w-full h-auto max-h-[calc(100vh-10rem)] object-contain"
                onError={(e) => {
                  console.error('Video load error:', post.media);
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div 
                className={`relative ${isZoomed ? 'cursor-move' : 'cursor-zoom-in'}`}
                onClick={() => !isZoomed && setIsZoomed(true)}
                onMouseDown={e => {
                  if (isZoomed) {
                    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
                  }
                }}
                onMouseMove={e => {
                  if (dragStart && isZoomed) {
                    setImagePosition({
                      x: e.clientX - dragStart.x,
                      y: e.clientY - dragStart.y
                    });
                  }
                }}
                onMouseUp={() => setDragStart(null)}
                onMouseLeave={() => setDragStart(null)}
                onDoubleClick={() => setIsZoomed(false)}
              >
                <img
                  src={getMediaUrl(post.media)}
                  alt="Post content"
                  className={`transition-transform duration-300 ${
                    isZoomed 
                      ? 'scale-200 cursor-move'
                      : 'scale-100 cursor-zoom-in'
                  }`}
                  style={isZoomed ? {
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(2)`,
                  } : {}}
                  onError={(e) => {
                    console.error('Image load error:', post.media);
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Comments & Actions Section */}
          <div className="w-full md:w-5/12 flex flex-col min-h-0">
            {/* Actions Bar */}
            <div className={`shrink-0 border-b ${
              theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <div className="p-4">
                <div className="flex justify-between mb-1">
                  <div className="flex space-x-4">
                    <button onClick={handleLike} className={`hover:opacity-70 transition-opacity ${
                      theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}`}>
                      {post.likes?.includes(user?.id) ? (
                        <HeartFilled className="w-6 h-6 text-red-500" />
                      ) : (
                        <HeartRegular className="w-6 h-6" />
                      )}
                    </button>
                    <button onClick={handleShare}
                      className={`hover:opacity-70 transition-opacity ${
                        theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}`}>
                      <ShareRegular className="w-6 h-6" />
                    </button>
                  </div>
                  <button onClick={handleSave}
                    className={`hover:opacity-70 transition-opacity ${
                      theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}`}>
                    {post.saved ? (
                      <BookmarkFilled className="w-6 h-6" />
                    ) : (
                      <BookmarkRegular className="w-6 h-6" />
                    )}
                  </button>
                </div>
                <div className={`font-bold text-sm ${
                  theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}`}>
                  {post.likes?.length || 0} Likes
                </div>
              </div>
            </div>

            {/* Caption */}
            <div className={`shrink-0 p-4 pt-0 border-b ${
              theme === 'dark-theme' ? 'border-gray-800 text-white' : 'border-gray-200'
            }`}>
              <p>
                <span className="font-medium mr-2">{post.user?.username || 'Unknown User'}</span>
                {renderText(post.caption)}
              </p>
            </div>

            {/* Comments */}
            <PostComments
              post={post}
              isOpen={showComments}
              onComment={(updatedPost) => setPost(updatedPost)}
              onReply={(updatedPost) => setPost(updatedPost)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SinglePost;
