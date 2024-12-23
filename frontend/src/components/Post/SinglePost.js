import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../App';
import { SinglePostSkeleton } from '../Common/Skeleton';
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
  MoreHorizontalRegular,
  DeleteRegular,
  EditRegular,
  ErrorCircleRegular
} from '@fluentui/react-icons';
import { API_URL } from '../../config';
import { getProfileImageUrl, generateSrcSet, generateSizes } from '../../utils/imageUtils';
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
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [reportReason, setReportReason] = useState('');
  const imageRef = useRef(null);
  const contextMenuRef = useRef(null);

  // Function to ensure URL uses correct domain
  const ensureApiUrl = (url) => {
    if (!url) return '';
    
    // If it's already a CloudFront URL, return as is
    if (url.includes('.cloudfront.net')) {
      return url;
    }
    
    // If it's a full URL
    if (url.startsWith('http')) {
      try {
        const urlObj = new URL(url);
        
        // If it's already from our API domain, return as is
        if (urlObj.origin === API_URL) {
          return url;
        }
        
        // If it's a direct post ID (from Netlify), construct proper API URL
        if (urlObj.pathname.match(/^\/post\/[a-f0-9]+$/)) {
          const postId = urlObj.pathname.split('/').pop();
          return `${API_URL}/api/posts/${postId}/media`;
        }
        
        // For other URLs, ensure they go through our API
        const filename = urlObj.pathname.split('/').pop();
        return `${API_URL}/uploads/${filename}`;
      } catch (error) {
        console.error('Error parsing URL:', error);
        return url;
      }
    }
    
    // For relative paths starting with /uploads, prepend API URL
    if (url.startsWith('/uploads/')) {
      return `${API_URL}${url}`;
    }
    
    // For other relative paths, assume they're filenames
    return `${API_URL}/uploads/${url}`;
  };

  // Function to generate different image sizes
  const getResponsiveImageUrl = (media, size) => {
    if (!media) return '';
    
    // Handle new optimized media structure
    if (media.variants && media.variants[size]) {
      const url = media.variants[size].urls.webp || media.variants[size].urls.jpeg;
      return ensureApiUrl(url);
    }
    
    // Handle legacy media structure
    const mediaPath = media.legacy?.url || (typeof media === 'string' ? media : '');
    if (!mediaPath || typeof mediaPath !== 'string') return '';
    
    // Ensure we're using the API URL
    if (mediaPath.startsWith('http')) {
      return ensureApiUrl(mediaPath);
    }
    
    try {
      // Extract base path and extension
      const lastDot = mediaPath.lastIndexOf('.');
      if (lastDot === -1) return ''; // Invalid path without extension
      
      const basePath = mediaPath.substring(0, lastDot);
      const ext = mediaPath.substring(lastDot);
      
      // Validate size parameter
      const validSizes = ['thumbnail', 'small', 'medium', 'large'];
      if (!validSizes.includes(size)) return '';
      
      return `${API_URL}/uploads/${basePath}-${size}${ext}`;
    } catch (error) {
      console.error('Error generating responsive image URL:', error);
      return '';
    }
  };

  // Function to get media URL
  const getMediaUrl = (media) => {
    if (!media) return '';
    
    // Handle new optimized media structure
    if (media.variants && media.variants.large) {
      // If CDN URL is available, use it
      if (media.variants.large.cdnUrl) {
        return media.variants.large.cdnUrl;
      }
      // Prefer WebP format if available
      const url = media.variants.large.urls?.webp || media.variants.large.urls?.jpeg;
      if (url) {
        return ensureApiUrl(url);
      }
    }
    
    // Handle legacy media structure
    if (media.legacy) {
      // If CDN URL is available in legacy format
      if (media.legacy.cdnUrl) {
        return media.legacy.cdnUrl;
      }
      // Use legacy URL if available
      if (media.legacy.url) {
        return ensureApiUrl(media.legacy.url);
      }
    }
    
    // Handle direct string URL (fallback)
    if (typeof media === 'string') {
      return ensureApiUrl(media);
    }
    
    return '';
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/posts/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
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

  const handleEdit = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ caption })
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
        setShowEditModal(false);
        setShowContextMenu(false);
      }
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        navigate(-1);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts/${id}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reportReason })
      });

      if (response.ok) {
        setShowReportModal(false);
        setShowContextMenu(false);
        setReportReason('');
      }
    } catch (error) {
      console.error('Error reporting post:', error);
    }
  };

  const handleLike = async () => {
    if (!id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts/${id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
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
        }
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
    return <SinglePostSkeleton />;
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowContextMenu(!showContextMenu)}
              className={`hover:bg-gray-100 p-2 rounded-full transition-colors ${
                theme === 'dark-theme' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <MoreHorizontalRegular className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate(-1)} 
              className={`hover:bg-gray-100 p-2 rounded-full transition-colors ${
                theme === 'dark-theme' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <DismissRegular className="w-5 h-5" />
            </button>

            {/* Context Menu */}
            {showContextMenu && (
              <div 
                ref={contextMenuRef}
                className={`absolute right-12 top-14 w-48 py-2 rounded-lg shadow-lg z-50 ${
                  theme === 'dark-theme' ? 'bg-gray-800' : 'bg-white'
                } border ${
                  theme === 'dark-theme' ? 'border-gray-700' : 'border-gray-200'
                }`}
              >
                {post.user?.id === user?.id ? (
                  <>
                    <button
                      onClick={() => {
                        setCaption(post.caption || '');
                        setShowEditModal(true);
                      }}
                      className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 ${
                        theme === 'dark-theme' ? 'text-white hover:bg-gray-700' : 'text-gray-900'
                      }`}
                    >
                      <EditRegular className="w-5 h-5" />
                      Edit Post
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-4 py-2 text-left flex items-center gap-2 text-red-500 hover:bg-red-50"
                    >
                      <DeleteRegular className="w-5 h-5" />
                      Delete Post
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowReportModal(true)}
                    className={`w-full px-4 py-2 text-left flex items-center gap-2 text-red-500 hover:bg-red-50 ${
                      theme === 'dark-theme' ? 'hover:bg-gray-700' : ''
                    }`}
                  >
                    <ErrorCircleRegular className="w-5 h-5" />
                    Report Post
                  </button>
                )}
              </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
              <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-50`}>
                <div className={`w-full max-w-lg p-6 rounded-lg ${
                  theme === 'dark-theme' ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h2 className={`text-xl font-bold mb-4 ${
                    theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
                  }`}>Edit Post</h2>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className={`w-full h-32 p-3 rounded-lg border mb-4 ${
                      theme === 'dark-theme' 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                    placeholder="Edit your caption..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowEditModal(false)}
                      className={`px-4 py-2 rounded-lg ${
                        theme === 'dark-theme' 
                          ? 'bg-gray-700 text-white hover:bg-gray-600' 
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEdit}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Report Modal */}
            {showReportModal && (
              <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-50`}>
                <div className={`w-full max-w-lg p-6 rounded-lg ${
                  theme === 'dark-theme' ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h2 className={`text-xl font-bold mb-4 ${
                    theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
                  }`}>Report Post</h2>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className={`w-full h-32 p-3 rounded-lg border mb-4 ${
                      theme === 'dark-theme' 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                    placeholder="Why are you reporting this post?"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowReportModal(false)}
                      className={`px-4 py-2 rounded-lg ${
                        theme === 'dark-theme' 
                          ? 'bg-gray-700 text-white hover:bg-gray-600' 
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReport}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      Submit Report
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
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
                {!isImageLoaded && post?.media && (
                  <div 
                    className="absolute inset-0 bg-gray-200"
                    style={{
                      backgroundImage: `url(${post.media.placeholder || getResponsiveImageUrl(post.media, 'thumbnail')})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'blur(10px)',
                      transform: 'scale(1.1)', // Prevent blur edges
                    }}
                  />
                )}
                
                <img
                  ref={imageRef}
                  src={getMediaUrl(post?.media)}
                  srcSet={(() => {
                    if (!post?.media) return '';
                    
                    // For new media structure with variants
                    if (post.media.variants) {
                      const urls = {};
                      ['small', 'medium', 'large'].forEach(size => {
                        if (post.media.variants[size]?.urls) {
                          urls[size] = post.media.variants[size].urls.webp || 
                                     post.media.variants[size].urls.jpeg;
                        }
                      });
                      if (Object.keys(urls).length > 0) {
                        return generateSrcSet(urls);
                      }
                    }
                    
                    // For legacy media structure
                    const mediaUrl = getMediaUrl(post.media);
                    if (mediaUrl) {
                      return `${mediaUrl} 800w`; // Default to medium size
                    }
                    
                    return '';
                  })()}
                  sizes={generateSizes('large')}
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
                      mediaStructure: post.media?.variants ? 'new' : 'legacy',
                      availableVariants: post.media?.variants ? 
                        Object.keys(post.media.variants).map(size => ({
                          size,
                          urls: post.media.variants[size].urls
                        })) : 'none'
                    });
                    
                    // Create a more informative fallback UI
                    const fallback = document.createElement('div');
                    fallback.className = `w-full h-full flex items-center justify-center ${
                      theme === 'dark-theme' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-500'
                    }`;
                    
                    const errorMessage = post.media?.variants ?
                      'Image format not supported' :
                      'Image not available';
                    
                    fallback.innerHTML = `
                      <div class="text-center p-4">
                        <div class="mb-2">⚠️</div>
                        <div>${errorMessage}</div>
                        <div class="text-sm text-gray-500 mt-1">Please try refreshing the page</div>
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
              <div className="p-4 relative">
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-gray-100/50 to-transparent dark:from-gray-800/50 pointer-events-none"></div>
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
                <div className={`flex items-center gap-2 text-sm ${
                  theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}`}>
                  <span className="font-bold">{post.likes?.length || 0} Likes</span>
                  <span className="text-gray-500">|</span>
                  <span className="text-gray-500">{formatDate(post.createdAt)}</span>
                </div>
              </div>

              {/* Post Details */}
              <div className={`px-4 pb-4 space-y-2 relative ${
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
              </div>
            </div>

            {/* Comments */}
            <PostComments
              post={post}
              isOpen={true}
              onComment={(updatedPost) => {
                console.log('Post updated with new comment:', updatedPost);
                setPost(updatedPost);
              }}
              onReply={(updatedPost) => {
                console.log('Post updated with new reply:', updatedPost);
                setPost(updatedPost);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SinglePost;
