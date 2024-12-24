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
import { getProfileImageUrl } from '../../utils/imageUtils';
import PostComments from './PostComments';
import { ThemeContext } from '../../App';
import EditCaptionModal from './EditCaptionModal';

// Helper function to handle media URLs
const getMediaUrl = (media) => {
  if (!media) return '';
  
  // Handle new media structure with variants
  if (media.variants) {
    const variant = media.variants.large || media.variants.original;
    if (variant) {
      // Try CDN URL first
      if (variant.cdnUrl) return variant.cdnUrl;
      // Then try WebP or JPEG URL
      if (variant.urls) {
        const url = variant.urls.webp || variant.urls.jpeg;
        if (url) {
          if (url.startsWith('http')) return url;
          return `${API_URL}/uploads/${url}`;
        }
      }
      // Fallback to direct URL if available
      if (variant.url) {
        if (variant.url.startsWith('http')) return variant.url;
        return `${API_URL}/uploads/${variant.url}`;
      }
    }
  }

  // Handle legacy media structure
  if (media.legacy) {
    if (media.legacy.cdnUrl) return media.legacy.cdnUrl;
    if (media.legacy.url) {
      if (media.legacy.url.startsWith('http')) return media.legacy.url;
      return `${API_URL}/uploads/${media.legacy.url}`;
    }
  }

  // Handle direct media string
  if (typeof media === 'string') {
    if (media.startsWith('http')) return media;
    return `${API_URL}/uploads/${media}`;
  }

  return '';
};

const Post = ({ post, onDelete, onReport, onEdit, onRefresh }) => {
  const { user } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [localPost, setLocalPost] = useState(post);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Initialize localPost only once
  useEffect(() => {
    if (!localPost) {
      setLocalPost(post);
    }
  }, []);

  // Only update specific fields from post prop
  useEffect(() => {
    if (localPost) {
      setLocalPost(prev => ({
        ...prev,
        caption: post.caption,
        comments: post.comments
      }));
    }
  }, [post.caption, post.comments]);

  const isOwner = localPost?.user?._id === user?.id;
  const isLiked = localPost?.likes?.includes(user?.id);

  const handleLike = async () => {
    try {
      // Optimistically update the like state
      const currentLikes = [...(localPost.likes || [])];
      const userIndex = currentLikes.indexOf(user?.id);
      
      if (userIndex === -1) {
        currentLikes.push(user?.id);
      } else {
        currentLikes.splice(userIndex, 1);
      }

      setLocalPost(prev => ({
        ...prev,
        likes: currentLikes
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
      
      // Update only the likes array from the response
      setLocalPost(prev => ({
        ...prev,
        likes: updatedPost.likes
      }));
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert optimistic update on error
      setLocalPost(prev => ({
        ...prev,
        likes: post.likes
      }));
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
    console.error('Image load error:', localPost?.media);
    setImageError(true);
    // Attempt to reload the image once
    if (!e.target.dataset.retried) {
      e.target.dataset.retried = 'true';
      e.target.src = getMediaUrl(localPost?.media);
    }
  };

  if (!localPost || !localPost.user) {
    return null;
  }

  return (
    <div className={`${theme === 'dark-theme' ? 'bg-black' : 'bg-white'} rounded-2xl shadow-lg mb-6 relative overflow-hidden`}>
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
          <div className={`absolute inset-0 flex items-center justify-center text-red-500 ${theme === 'dark-theme' ? 'bg-zinc-800' : 'bg-gray-100'} bg-opacity-50`}>
            Error loading image
          </div>
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
        onComment={(updatedPost) => setLocalPost(updatedPost)}
        onReply={(updatedPost) => setLocalPost(updatedPost)}
      />

      {/* Edit Caption Modal */}
      {showEditModal && (
        <EditCaptionModal
          post={localPost}
          onClose={() => setShowEditModal(false)}
          onUpdate={(updatedPost) => {
            setLocalPost(updatedPost);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
};

export default Post;
