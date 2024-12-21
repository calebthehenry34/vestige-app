import React, { useState, useEffect, useContext, useRef } from 'react';
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
  PersonRegular,
  LocationRegular,
  TagRegular,
  CalendarRegular
} from '@fluentui/react-icons';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';
import PostComments from './PostComments';

// Function to generate different image sizes
const getResponsiveImageUrl = (mediaPath, size) => {
  if (!mediaPath) return '';
  if (typeof mediaPath !== 'string') return '';
  if (mediaPath.startsWith('http')) return mediaPath;
  
  // Extract base path and extension
  const lastDot = mediaPath.lastIndexOf('.');
  if (lastDot === -1) return ''; // Invalid path without extension
  
  const basePath = mediaPath.substring(0, lastDot);
  const ext = mediaPath.substring(lastDot);
  
  // Validate size parameter
  const validSizes = ['thumbnail', 'small', 'medium', 'large'];
  if (!validSizes.includes(size)) return '';
  
  return `${API_URL}/uploads/${basePath}-${size}${ext}`;
};

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
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const imageRef = useRef(null);

  useEffect(() => {
    // Set up intersection observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.srcset = img.dataset.srcset;
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    );

    const currentImageRef = imageRef.current;
    if (currentImageRef) {
      observer.observe(currentImageRef);
    }

    return () => {
      if (currentImageRef) {
        observer.unobserve(currentImageRef);
      }
    };
  }, [post]);

  const getMediaUrl = (mediaPath) => {
    if (!mediaPath) return '';
    if (typeof mediaPath !== 'string') return '';
    if (mediaPath.startsWith('http')) return mediaPath;
    if (!mediaPath.includes('.')) return ''; // Ensure path has an extension
    return `${API_URL}/uploads/${mediaPath}`;
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

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const renderText = (text) => {
    if (!text || typeof text !== 'string') return ''; 
    
    return text.split(' ').map((word, index) => {
      // Skip if word is undefined or not a string
      if (!word || typeof word !== 'string') return ' ';
      
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
            <button 
              onClick={() => navigate(`/profile/${post.user?.username}`)}
              className="flex items-center hover:opacity-80"
            >
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
            </button>
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
                  console.error('Video load error:', {
                    media: post.media,
                    src: e.target.src,
                    generatedSrc: getMediaUrl(post.media)
                  });
                  // Replace the video with a fallback UI that respects theme
                  const fallback = document.createElement('div');
                  fallback.className = `w-full h-full flex items-center justify-center ${
                    theme === 'dark-theme' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-500'
                  }`;
                  fallback.innerHTML = `
                    <div class="text-center p-4">
                      <div class="mb-2">⚠️</div>
                      <div>Failed to load video</div>
                    </div>
                  `;
                  e.target.parentNode.replaceChild(fallback, e.target);
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
                {/* Blur placeholder */}
                {!isImageLoaded && (
                  <div 
                    className="absolute inset-0 bg-gray-200 animate-pulse"
                    style={{
                      backgroundImage: `url(${getResponsiveImageUrl(post.media, 'thumbnail')})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'blur(10px)',
                    }}
                  />
                )}
                
                <img
                  ref={imageRef}
                  data-src={getMediaUrl(post.media)}
                  data-srcset={`${getResponsiveImageUrl(post.media, 'small')} 400w, ${getResponsiveImageUrl(post.media, 'medium')} 800w, ${getResponsiveImageUrl(post.media, 'large')} 1200w`}
                  sizes="(max-width: 768px) 100vw, 58.333vw"
                  alt="Post content"
                  className={`transition-transform duration-300 ${
                    isZoomed 
                      ? 'scale-200 cursor-move'
                      : 'scale-100 cursor-zoom-in'
                  } ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  style={isZoomed ? {
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(2)`,
                  } : {}}
                  onLoad={(e) => {
                    console.log('Image loaded successfully:', {
                      media: post.media,
                      src: e.target.src,
                      srcset: e.target.srcset,
                      naturalWidth: e.target.naturalWidth,
                      naturalHeight: e.target.naturalHeight
                    });
                    setIsImageLoaded(true);
                  }}
                  onError={(e) => {
                    console.error('Image load error:', {
                      media: post.media,
                      src: e.target.src,
                      srcset: e.target.srcset,
                      generatedSrc: getMediaUrl(post.media),
                      generatedSrcSet: `${getResponsiveImageUrl(post.media, 'small')} 400w, ${getResponsiveImageUrl(post.media, 'medium')} 800w, ${getResponsiveImageUrl(post.media, 'large')} 1200w`
                    });
                    // Replace the image with a fallback UI that respects theme
                    const fallback = document.createElement('div');
                    fallback.className = `w-full h-full flex items-center justify-center ${
                      theme === 'dark-theme' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-500'
                    }`;
                    fallback.innerHTML = `
                      <div class="text-center p-4">
                        <div class="mb-2">⚠️</div>
                        <div>Failed to load image</div>
                      </div>
                    `;
                    e.target.parentNode.replaceChild(fallback, e.target);
                  }}
                />
              </div>
            )}
          </div>

          {/* Info & Comments Section */}
          <div className="w-full md:w-5/12 flex flex-col min-h-0">
            {/* Post Info */}
            <div className={`shrink-0 border-b ${
              theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
            }`}>
              {/* Actions Bar */}
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

              {/* Post Details */}
              <div className={`px-4 pb-4 space-y-2 ${
                theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
              }`}>
                {/* Caption */}
                <p>
                  <span className="font-medium mr-2">{post.user?.username || 'Unknown User'}</span>
                  {post.caption ? renderText(post.caption) : ''}
                </p>

                {/* Location */}
                {post.location && (
                  <div className="flex items-center text-sm text-gray-500">
                    <LocationRegular className="w-4 h-4 mr-1" />
                    <span>{post.location}</span>
                  </div>
                )}

                {/* Tagged Users */}
                {post.taggedUsers?.length > 0 && (
                  <div className="flex items-center text-sm text-gray-500">
                    <TagRegular className="w-4 h-4 mr-1" />
                    <div className="flex flex-wrap gap-1">
                      {post.taggedUsers.map((taggedUser, index) => (
                        <button
                          key={taggedUser._id}
                          onClick={() => navigate(`/profile/${taggedUser.username}`)}
                          className="hover:underline"
                        >
                          {taggedUser.username}
                          {index < post.taggedUsers.length - 1 ? ',' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hashtags */}
                {post.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 text-blue-500">
                    {post.hashtags.map(hashtag => (
                      <button
                        key={hashtag}
                        onClick={() => navigate(`/explore/hashtag/${hashtag}`)}
                        className="hover:underline"
                      >
                        #{hashtag}
                      </button>
                    ))}
                  </div>
                )}

                {/* Creation Date */}
                <div className="flex items-center text-sm text-gray-500">
                  <CalendarRegular className="w-4 h-4 mr-1" />
                  <span>{formatDate(post.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Comments */}
            <PostComments
              post={post}
              isOpen={true}
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
