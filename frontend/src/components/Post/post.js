// frontend/src/components/Post/Post.js
import React, { useState } from 'react';
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

const Post = ({ post, onDelete, onReport, onEdit }) => {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [localPost, setLocalPost] = useState(post);
  const [showDetails, setShowDetails] = useState(false);
  const isOwner = localPost?.user?._id === user?.id;
  const isLiked = localPost?.likes?.some(like => like.user === user?.id);

  const handleLike = async () => {
    try {
      const response = await fetch(`${API_URL}/api/posts/${localPost._id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to like post');
      }

      const updatedPost = await response.json();
      // Update the entire localPost state with the server response
      setLocalPost(updatedPost);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleDelete = async () => {
    if (!localPost?._id) return;
    
    try {
      await fetch(`${API_URL}/api/posts/${localPost._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      onDelete?.(localPost._id);
    } catch (error) {
      console.error('Error deleting post:', error);
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
    <div className="bg-white rounded-2xl shadow-lg mb-6 relative overflow-hidden">
      {/* User Profile and Menu */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 flex items-center justify-between bg-gradient-to-b from-black/50 via-black/25 to-transparent">
        <div className="flex items-center gap-2">
          <Link to={`/profile/${localPost.user.username}`}>
            <img
              src={getProfileImageUrl(localPost.user)}
              alt={localPost.user?.username || 'User'}
              className="w-8 h-8 rounded-md object-cover border border-white/20"
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
        <div className="absolute right-3 mt-1 bg-white rounded-lg shadow-lg py-2 z-20">
          {isOwner ? (
            <>
              <button onClick={handleDelete} className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-gray-100">
                <DeleteRegular className="mr-2" />
                Delete Post
              </button>
              <button onClick={() => { onEdit?.(localPost); setShowMenu(false); }} className="flex items-center w-full px-4 py-2 hover:bg-gray-100">
                <EditRegular className="mr-2" />
                Edit Caption
              </button>
            </>
          ) : (
            <button onClick={handleReport} className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-gray-100">
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
          <div className="absolute inset-0 flex items-center justify-center text-red-500 bg-gray-100 bg-opacity-50">
            Error loading image
          </div>
        )}

        {/* Bottom gradient overlay with actions */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 via-black/25 to-transparent p-4">
          <div className="flex items-center gap-4 text-white">
            <button onClick={handleLike} className="transform hover:scale-110 transition-transform">
              {isLiked ? (
                <HeartFilled className="w-6 h-6 text-red-500" />
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

      {/* Collapsible Details Section */}
      {showDetails && (
        <div className="p-4 border-t border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <div className="font-medium text-sm">
              {localPost.likes?.length || 0} likes
            </div>
            <div className="text-xs text-gray-500">
              {new Date(localPost.createdAt).toLocaleDateString()}
            </div>
          </div>

          {/* Caption */}
          {localPost.caption && (
            <div className="mb-2">
              <span className="text-sm font-medium mr-2">{localPost.user?.username}</span>
              <span className="text-sm">{localPost.caption}</span>
            </div>
          )}

          {/* Comments */}
          {localPost.comments?.length > 0 && (
            <div className="text-gray-500 text-sm">
              {localPost.comments.length} comments
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Post;
