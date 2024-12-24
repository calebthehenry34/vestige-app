import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ChevronLeftRegular,
  HeartRegular,
  HeartFilled,
  CommentRegular,
  ShareRegular,
  BookmarkRegular
} from '@fluentui/react-icons';
import { getMediaUrl, getProfileImageUrl } from '../../utils/imageUtils';
import PostComments from './PostComments';
import { API_URL } from '../../config';

const SinglePostView = ({ post, className }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const touchStart = useRef(null);
  const touchEnd = useRef(null);
  const [localPost, setLocalPost] = useState(post);
  const [showComments, setShowComments] = useState(false);
  const [likeInProgress, setLikeInProgress] = useState(false);
  const likeTimeoutRef = React.useRef(null);

  useEffect(() => {
    setLocalPost(post);
  }, [post]);

  const isLiked = localPost?.likes?.includes(user?.id);

  const handleLike = async (e) => {
    e?.stopPropagation(); // Prevent any parent click events
    if (!localPost?._id || likeInProgress) return;

    setLikeInProgress(true);
    
    try {
      const response = await fetch(`${API_URL}/api/posts/${localPost._id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to like post');
      }

      const updatedPost = await response.json();
      
      // Update the local post with the server response
      setLocalPost(prev => ({
        ...prev,
        ...updatedPost,
        user: prev.user // Preserve the user object from previous state
      }));
    } catch (error) {
      console.error('Error liking post:', error);
    } finally {
      // Reset likeInProgress after a short delay to prevent rapid clicking
      setTimeout(() => {
        setLikeInProgress(false);
      }, 300);
    }
  };

  useEffect(() => {
    // Add class to hide navbars
    document.body.classList.add('hide-navigation');
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('hide-navigation');
    };
  }, []);

  if (!localPost || !localPost.user) {
    return (
      <div className={`flex flex-col bg-black ${className || ''}`}>
        <div className="p-4">
          <button 
            onClick={() => navigate(-1)} 
            className="text-white hover:opacity-80"
          >
            <ChevronLeftRegular className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white text-center">
            <p>Unable to load post</p>
          </div>
        </div>
      </div>
    );
  }

  const formatTimestamp = (timestamp) => {
    const minutes = Math.floor((Date.now() - new Date(timestamp)) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} mins ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  return (
    <div className={`flex flex-col bg-black ${className || ''}`}>
      {/* Main content */}
      <div className="flex flex-col bg-black overflow-y-auto">
        {/* User info with back button */}
        <div className="p-4">
          <div className="flex items-center mb-4">
            <button 
              onClick={() => navigate(-1)} 
              className="text-white hover:opacity-80 mr-4"
            >
              <ChevronLeftRegular className="w-6 h-6" />
            </button>
            <img
              src={getProfileImageUrl(post.user)}
              alt={post.user.username}
              className="w-12 h-12 rounded-lg object-cover border border-white/20"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${post.user.username}&background=random`;
              }}
            />
            <div className="ml-3">
              <h2 className="text-white font-medium">{post.user.username}</h2>
              <div className="flex items-center text-white/80 text-sm">
                {post.location && (
                  <>
                    <span>{post.location}</span>
                    <span className="mx-2">•</span>
                  </>
                )}
                <span>{formatTimestamp(post.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Post media */}
        <div className="flex-1 mb-4 relative px-2" style={{ maxHeight: '60vh' }}>
          <div 
            className="flex overflow-visible rounded-2xl relative bg-white mx-2"
            style={{ 
              width: 'calc(100% - 16px)',
              height: '100%',
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth'
            }}
            onTouchStart={(e) => {
              touchStart.current = e.touches[0].clientX;
            }}
            onTouchMove={(e) => {
              touchEnd.current = e.touches[0].clientX;
            }}
            onTouchEnd={() => {
              if (!touchStart.current || !touchEnd.current) return;
              const diff = touchStart.current - touchEnd.current;
              const threshold = 50; // minimum distance for swipe

              if (Math.abs(diff) > threshold) {
                if (diff > 0 && currentImageIndex < (Array.isArray(post.media) ? post.media.length - 1 : 0)) {
                  // Swipe left
                  setCurrentImageIndex(prev => prev + 1);
                } else if (diff < 0 && currentImageIndex > 0) {
                  // Swipe right
                  setCurrentImageIndex(prev => prev - 1);
                }
              }

              touchStart.current = null;
              touchEnd.current = null;
            }}
          >
            <div 
              className="flex transition-transform duration-300 ease-out h-full -mx-2"
              style={{ 
                transform: `translateX(-${currentImageIndex * 100}%)`,
                width: `${Array.isArray(post.media) ? post.media.length * 100 : 100}%`
              }}
            >
              {post.mediaType === 'video' ? (
                <video 
                  src={getMediaUrl(post.media)} 
                  controls 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Video load error:', post.media);
                    setImageError(true);
                  }}
                />
              ) : (
                <>
                  {Array.isArray(post.media) ? 
                    post.media.map((media, index) => (
                      <div 
                        key={index} 
                        className="w-full h-full flex-shrink-0 px-2"
                        style={{ scrollSnapAlign: 'start' }}
                      >
                        <img
                          src={getMediaUrl(media)}
                          alt={`Post content ${index + 1}`}
                          className={`w-full h-full object-cover ${imageError ? 'opacity-50' : ''}`}
                          onError={(e) => {
                            console.error('Image load error:', media);
                            setImageError(true);
                            if (!e.target.dataset.retried) {
                              e.target.dataset.retried = 'true';
                              e.target.src = getMediaUrl(media);
                            }
                          }}
                        />
                      </div>
                    ))
                    :
                    <div className="w-full h-full flex-shrink-0 px-2">
                      <img
                        src={getMediaUrl(post.media)}
                        alt="Post content"
                        className={`w-full h-full object-cover ${imageError ? 'opacity-50' : ''}`}
                        onError={(e) => {
                          console.error('Image load error:', post.media);
                          setImageError(true);
                          if (!e.target.dataset.retried) {
                            e.target.dataset.retried = 'true';
                            e.target.src = getMediaUrl(post.media);
                          }
                        }}
                      />
                    </div>
                  }
                </>
              )}
            </div>
          </div>

          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center text-red-500 bg-black bg-opacity-50">
              Error loading image
            </div>
          )}

          {/* Image indicators */}
          {Array.isArray(post.media) && post.media.length > 1 && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
              {post.media.map((_, index) => (
                <div 
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Interaction buttons */}
        <div className="p-4 bg-black">
          <div className="flex items-center gap-4 text-white mb-4">
            <button onClick={handleLike} className="transform hover:scale-110 transition-transform">
              {isLiked ? (
                <HeartFilled className="w-6 h-6 text-red-600 fill-red-600" />
              ) : (
                <HeartRegular className="w-6 h-6" />
              )}
            </button>
            <button 
              onClick={() => setShowComments(!showComments)} 
              className="transform hover:scale-110 transition-transform"
            >
              <CommentRegular className="w-6 h-6" />
            </button>
            <button className="transform hover:scale-110 transition-transform">
              <ShareRegular className="w-6 h-6" />
            </button>
            <div className="flex-grow"></div>
            <button className="transform hover:scale-110 transition-transform">
              <BookmarkRegular className="w-6 h-6" />
            </button>
          </div>

          {/* Post text content */}
          <div className="text-white">
            {localPost.caption && (
              <p className="mb-4 whitespace-pre-wrap">{localPost.caption}</p>
            )}
            {localPost.text && (
              <p className="whitespace-pre-wrap">{localPost.text}</p>
            )}
          </div>
        </div>

        {/* Comments section */}
        <PostComments 
          post={localPost} 
          isOpen={showComments}
          onComment={(updatedPost) => {
            setLocalPost(updatedPost);
          }}
          onReply={(updatedPost) => {
            setLocalPost(updatedPost);
          }}
        />
      </div>
    </div>
  );
};

export default SinglePostView;
