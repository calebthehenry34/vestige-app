// frontend/src/components/Post/Post.js
import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HeartRegular,
  HeartFilled,
  CommentRegular,
  ShareRegular,
  BookmarkRegular,
  MoreHorizontalRegular,
  DeleteRegular,
  EditRegular,
  FlagRegular
} from '@fluentui/react-icons';
import { API_URL } from '../../config';
import { getProfileImageUrl, getMediaUrl } from '../../utils/imageUtils';
import PostComments from './PostComments';
import { ThemeContext } from '../../App';
import EditCaptionModal from './EditCaptionModal';

const Post = ({ post, onDelete, onReport, onEdit, onRefresh, onClick }) => {
  const { user } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [showMenu, setShowMenu] = useState(false);
    const [imageErrors, setImageErrors] = useState({});
    const [localPost, setLocalPost] = useState(post);
    const [showDetails, setShowDetails] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const mediaContainerRef = useRef(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!localPost?.mediaItems?.length) return;
    
    if (e.key === 'ArrowLeft' && currentMediaIndex > 0) {
      setCurrentMediaIndex(prev => prev - 1);
    } else if (e.key === 'ArrowRight' && currentMediaIndex < localPost.mediaItems.length - 1) {
      setCurrentMediaIndex(prev => prev + 1);
    }
  }, [currentMediaIndex, localPost?.mediaItems?.length]);

  useEffect(() => {
    if (localPost?.mediaItems?.length > 1) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, localPost?.mediaItems?.length]);

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.touches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentMediaIndex < (localPost.mediaItems?.length - 1)) {
      setCurrentMediaIndex(prev => prev + 1);
    }
    if (isRightSwipe && currentMediaIndex > 0) {
      setCurrentMediaIndex(prev => prev - 1);
    }
  };

  // Keep localPost in sync with post
  useEffect(() => {
    setLocalPost(post);
  }, [post]);

  const isOwner = localPost?.user?._id === user?.id;
  const isLiked = localPost?.likes?.includes(user?.id);

  const [isLiking, setIsLiking] = useState(false);
  const [previousLikes, setPreviousLikes] = useState(post?.likes || []);

  // Keep previousLikes in sync with post updates
  useEffect(() => {
    setPreviousLikes(post?.likes || []);
  }, [post?.likes]);

  const handleLike = async () => {
    if (isLiking || !localPost?._id) return;
    
    try {
      setIsLiking(true);
      
      // Optimistically update UI
      const wasLiked = previousLikes.includes(user?.id);
      const newLikes = wasLiked
        ? previousLikes.filter(id => id !== user?.id)
        : [...previousLikes, user?.id];
        
      setLocalPost(prev => ({
        ...prev,
        likes: newLikes
      }));

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
      
      // Update with server response
      setLocalPost(updatedPost);
      setPreviousLikes(updatedPost.likes || []);
      
      // Notify parent component
      onRefresh?.(updatedPost);
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert to previous state on error
      setLocalPost(prev => ({
        ...prev,
        likes: previousLikes
      }));
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!localPost?._id) return;
    
    try {
      const response = await fetch(`${API_URL}/api/posts/${localPost._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete post: ${response.status}`);
      }

      onDelete?.(localPost._id);
    } catch (error) {
      console.error('Error deleting post:', error);
      // You might want to show an error message to the user here
    }
    setShowMenu(false);
  };

  const handleReport = async () => {
    if (!localPost?._id) return;

    try {
      await fetch(`${API_URL}/api/posts/${localPost._id}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      onReport?.(localPost._id);
    } catch (error) {
      console.error('Error reporting post:', error);
    }
    setShowMenu(false);
  };

  const handleImageError = (e, index) => {
    const media = localPost?.mediaItems?.[index] || localPost?.media;
    
    // Log detailed error information
    console.error('Image load error:', {
      media,
      mediaType: media?.type || 'unknown',
      hasVariants: !!media?.variants,
      variantKeys: media?.variants ? Object.keys(media.variants) : [],
      url: e.target.src,
      generatedUrl: getMediaUrl(media),
      postId: localPost?._id,
      isMediaItems: !!localPost?.mediaItems,
      mediaItemsLength: localPost?.mediaItems?.length,
      fullPost: localPost
    });

    setImageErrors(prev => ({ ...prev, [index]: true }));

    // Attempt to reload with a different variant if available
    if (!e.target.dataset.retried && media?.variants) {
      e.target.dataset.retried = 'true';
      const variants = Object.keys(media.variants);
      if (variants.length > 0) {
        // Try next available variant
        const currentVariant = e.target.dataset.currentVariant || variants[0];
        const nextVariantIndex = (variants.indexOf(currentVariant) + 1) % variants.length;
        const nextVariant = variants[nextVariantIndex];
        
        // Update dataset to track current variant
        e.target.dataset.currentVariant = nextVariant;
        e.target.src = getMediaUrl({
          ...media,
          preferredVariant: nextVariant
        });
      }
    }

    // If no variants available and media has only type, try to fetch from post media endpoint
    if (!media?.variants && media?.type === 'image' && localPost?._id) {
      const mediaUrl = `${API_URL}/api/posts/${localPost._id}/media${index ? `?index=${index}` : ''}`;
      e.target.src = mediaUrl;
    }
  };

  if (!localPost || !localPost.user) {
    return null;
  }

  return (
    <div 
      className={`${theme === 'dark-theme' ? 'bg-black' : 'bg-white'} rounded-2xl shadow-lg mb-6 relative overflow-hidden cursor-pointer`}
      onClick={(e) => {
        // Don't trigger navigation if clicking on interactive elements
        if (
          e.target.closest('button') || 
          e.target.closest('a') ||
          e.target.closest('video')
        ) {
          return;
        }
        onClick?.(post);
      }}
    >
      {/* User Profile and Menu */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 flex items-center justify-between bg-gradient-to-b from-black/50 via-black/25 to-transparent">
        <div className="flex items-center gap-2">
          <Link to={`/profile/${localPost.user.username}`}>
            <img
              src={getProfileImageUrl(localPost.user)}
              alt={localPost.user?.username || 'User'}
              className="w-8 h-8 rounded-md object-cover border border-white/20"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${localPost.user?.username || 'user'}&background=random`;
              }}
            />
          </Link>
          <Link to={`/profile/${localPost.user.username}`} className="text-white text-sm font-medium">
            {localPost.user?.username || 'Unknown User'}
          </Link>
        </div>
        <button 
          onClick={() => setShowMenu(!showMenu)} 
          className="text-white hover:opacity-80"
        >
          <MoreHorizontalRegular />
        </button>
      </div>

      {/* Menu Dropdown */}
      {showMenu && (
        <div className={`absolute right-3 mt-1 ${theme === 'dark-theme' ? 'bg-zinc-800' : 'bg-white'} rounded-lg shadow-lg py-2 z-20`}>
          {isOwner ? (
            <>
              <button onClick={handleDelete} className={`flex items-center w-full px-4 py-2 text-red-600 hover:${theme === 'dark-theme' ? 'bg-zinc-700' : 'bg-gray-100'}`}>
                <DeleteRegular className="mr-2" />
                Delete Post
              </button>
              <button 
                onClick={() => { 
                  setShowEditModal(true); 
                  setShowMenu(false); 
                }} 
                className={`flex items-center w-full px-4 py-2 ${theme === 'dark-theme' ? 'text-white hover:bg-zinc-700' : 'text-black hover:bg-gray-100'}`}
              >
                <EditRegular className="mr-2" />
                Edit Caption
              </button>
            </>
          ) : (
            <button onClick={handleReport} className={`flex items-center w-full px-4 py-2 text-red-600 hover:${theme === 'dark-theme' ? 'bg-zinc-700' : 'bg-gray-100'}`}>
              <FlagRegular className="mr-2" />
              Report Post
            </button>
          )}
        </div>
      )}

      {/* Post Content */}
      <div className="relative overflow-hidden">
        {/* Multiple Media Items */}
        {localPost.mediaItems?.length > 0 ? (
          <div 
            ref={mediaContainerRef}
            className="relative touch-pan-y"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {localPost.mediaItems[currentMediaIndex] ? (
              <>
                <img
                  src={getMediaUrl(localPost.mediaItems[currentMediaIndex])}
                  loading="lazy"
                  alt={`Post content ${currentMediaIndex + 1}`}
                  className={`w-full object-cover ${imageErrors[currentMediaIndex] ? 'opacity-50' : ''}`}
                  onError={(e) => handleImageError(e, currentMediaIndex)}
                />
                {imageErrors[currentMediaIndex] && (
                  <div className={`absolute inset-0 flex items-center justify-center text-red-500 ${theme === 'dark-theme' ? 'bg-zinc-800' : 'bg-gray-100'} bg-opacity-50`}>
                    Error loading image
                  </div>
                )}
              </>
            ) : (
              <div className={`w-full h-64 flex items-center justify-center ${theme === 'dark-theme' ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                <span className="text-gray-500">Image not available</span>
              </div>
            )}
            
            {/* Navigation Arrows */}
            {localPost.mediaItems.length > 1 && (
              <>
                {currentMediaIndex > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentMediaIndex(prev => prev - 1);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
                  >
                    ←
                  </button>
                )}
                {currentMediaIndex < localPost.mediaItems.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentMediaIndex(prev => prev + 1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
                  >
                    →
                  </button>
                )}
              </>
            )}

            {/* Navigation Dots */}
            {localPost.mediaItems.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {localPost.mediaItems.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentMediaIndex(idx);
                    }}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentMediaIndex ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Single Media Item
          <>
            {localPost.media ? (
              localPost.mediaType === 'video' ? (
                <video 
                  src={getMediaUrl(localPost.media)} 
                  controls 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Video load error:', localPost.media);
                    setImageErrors({ 0: true });
                  }}
                />
              ) : (
                <img
                  src={getMediaUrl(localPost.media)}
                  alt="Post content"
                  className={`w-full object-cover ${imageErrors[0] ? 'opacity-50' : ''}`}
                  onError={(e) => handleImageError(e, 0)}
                />
              )
            ) : (
              <div className={`w-full h-64 flex items-center justify-center ${theme === 'dark-theme' ? 'bg-zinc-800' : 'bg-gray-100'}`}>
                <span className="text-gray-500">Media not available</span>
              </div>
            )}
          </>
        )}

        {/* Bottom gradient overlay with actions */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 via-black/25 to-transparent p-4">
          <div className="flex items-center gap-4 text-white">
            <button onClick={handleLike} className="transform hover:scale-110 transition-transform">
              {isLiked ? (
                <HeartFilled className="w-6 h-6 text-red-600" style={{ fill: '#dc2626' }} />
              ) : (
                <HeartRegular className="w-6 h-6" />
              )}
            </button>
            <button 
              onClick={() => setShowDetails(!showDetails)} 
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
        </div>
      </div>

      {/* Comments Section */}
      <PostComments 
        post={localPost} 
        isOpen={showDetails}
        onComment={(updatedPost) => {
          try {
            setLocalPost(updatedPost);
            onRefresh?.(updatedPost);
          } catch (error) {
            console.error('Error updating comment:', error);
            setLocalPost(post);
          }
        }}
        onReply={(updatedPost) => {
          try {
            setLocalPost(updatedPost);
            onRefresh?.(updatedPost);
          } catch (error) {
            console.error('Error updating reply:', error);
            setLocalPost(post);
          }
        }}
      />

      {/* Edit Caption Modal */}
      {showEditModal && (
        <EditCaptionModal
          post={localPost}
          onClose={() => setShowEditModal(false)}
          onUpdate={(updatedPost) => {
            try {
              setLocalPost(updatedPost);
              // Update parent without full refresh
              onRefresh?.(updatedPost);
            } catch (error) {
              console.error('Error updating caption:', error);
              setLocalPost(post);
            }
          }}
        />
      )}
    </div>
  );
};

export default Post;
