// frontend/src/components/Post/Post.js
import React, { useState, useContext, useEffect } from 'react';
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
import { ThemeContext } from '../../context/ThemeContext';
import EditCaptionModal from './EditCaptionModal';

const Post = ({ post, onDelete, onReport, onEdit, onRefresh, onClick }) => {
  const { user } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [localPost, setLocalPost] = useState(post);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Keep localPost in sync with post
  useEffect(() => {
    setLocalPost(post);
  }, [post]);

  const isOwner = localPost?.user?._id === user?.id;
  const isLiked = localPost?.likes?.includes(user?.id);

  const [likeInProgress, setLikeInProgress] = useState(false);
  const likeTimeoutRef = React.useRef(null);

  const handleLike = async (e) => {
    e.stopPropagation(); // Prevent post click event
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
      
      // Notify parent of server-confirmed update
      onRefresh?.(updatedPost);
    } catch (error) {
      console.error('Error liking post:', error);
    } finally {
      // Reset likeInProgress after a short delay to prevent rapid clicking
      setTimeout(() => {
        setLikeInProgress(false);
      }, 300);
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

  const handleImageError = (e) => {
    console.error('Image load error:', {
      media: localPost?.media,
      currentSrc: e.target.src,
      timestamp: new Date().toISOString()
    });
    
    // Only retry a few times with increasing delays
    const retries = parseInt(e.target.dataset.retries || '0');
    if (retries < 3) {
      const delay = Math.pow(2, retries) * 1000; // Exponential backoff: 1s, 2s, 4s
      e.target.dataset.retries = (retries + 1).toString();
      
      setTimeout(() => {
        console.log(`Retrying image load (attempt ${retries + 1}/3)...`);
        // Force browser to reload by appending timestamp
        const url = getMediaUrl(localPost?.media);
        e.target.src = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
      }, delay);
    } else {
      setImageError(true);
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
        {localPost.mediaType === 'video' ? (
          <video 
            src={getMediaUrl(localPost.media)} 
            controls 
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Video load error:', localPost.media);
              setImageError(true);
            }}
          />
        ) : (
          <img
            src={getMediaUrl(localPost.media)}
            alt="Post content"
            className={`w-full object-cover ${imageError ? 'opacity-50' : ''}`}
            onError={handleImageError}
          />
        )}
        {imageError && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center ${theme === 'dark-theme' ? 'bg-zinc-800' : 'bg-gray-100'} bg-opacity-50 p-4 text-center`}>
            <p className="text-red-500 font-medium mb-1">Failed to load image</p>
            <p className="text-sm text-gray-500">The image might be temporarily unavailable or may have been removed</p>
          </div>
        )}

        {/* Bottom gradient overlay with actions */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 via-black/25 to-transparent p-4">
          <div className="flex items-center gap-4 text-white">
            <button onClick={handleLike} className="transform hover:scale-110 transition-transform">
              {isLiked ? (
                <HeartFilled className="w-6 h-6 text-red-600 fill-red-600" />
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
