// frontend/src/components/Post/Post.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HeartRegular,
  HeartFilled,
  ArrowExpandAllFilled,
  BookmarkRegular,
  BookmarkFilled,
  ShareRegular,
  MoreHorizontalRegular,
  DeleteRegular,
  EditRegular,
  FlagRegular,
  PersonRegular
} from '@fluentui/react-icons';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';

// Helper function to handle media URLs
const getMediaUrl = (url) => {
  if (!url) return '';
  // If it's already a full URL (e.g., S3), use it directly
  if (url.startsWith('http')) return url;
  // For local files, ensure we're using the correct base URL
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const Post = ({ post, onDelete, onReport, onEdit }) => {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [localPost, setLocalPost] = useState(post);
  const isOwner = localPost?.user?._id === user?.id;
  const isLiked = localPost?.likes?.some(like => like._id === user?.id);

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
    <div className="bg-white rounded-lg shadow mb-6">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <Link to={`/profile/${localPost.user.username}`} className="flex items-center">
          {localPost.user ? (
            <img
              src={getProfileImageUrl(localPost.user.profilePicture, localPost.user.username)}
              alt={localPost.user.username}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <PersonRegular className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <span className="ml-3 text-xs font-medium">{localPost.user?.username || 'Unknown User'}</span>
        </Link>
        <button onClick={() => setShowMenu(!showMenu)} className="p-2">
          <MoreHorizontalRegular />
        </button>
      </div>

      {/* Menu Dropdown */}
      {showMenu && (
        <div className="absolute right-4 mt-1 bg-white rounded-lg shadow-lg py-2 z-10 ">
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
      <div className="relative">
        {localPost.mediaType === 'video' ? (
          <video 
            src={getMediaUrl(localPost.media)} 
            controls 
            className="w-full"
            onError={(e) => {
              console.error('Video load error:', localPost.media);
              setImageError(true);
            }}
          />
        ) : (
          <Link to={`/post/${localPost._id}`}>
            <img
              src={getMediaUrl(localPost.media)}
              alt="Post content"
              className={`w-full ${imageError ? 'opacity-50' : ''}`}
              onError={handleImageError}
            />
            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center text-red-500 bg-gray-100 bg-opacity-50">
                Error loading image
              </div>
            )}
          </Link>
        )}

        {/* Caption Preview */}
        <div className="absolute bottom-20 left-0 right-0 px-4 py-2 bg-black bg-opacity-50">
          <div className="text-white">
            <span className="text-xs font-medium mr-2">{localPost.user?.username}</span>
            <span className="text-xs">
              {localPost.caption && (localPost.caption.length > 100 ? (
                <>
                  {localPost.caption.slice(0, 100)}...{' '}
                  <Link to={`/post/${localPost._id}`} className="text-white hover:underline">
                    read caption
                  </Link>
                </>
              ) : localPost.caption)}
            </span>
          </div>
        </div>

        {/* Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
          <div className="flex justify-between items-center text-white">
            <div className="flex space-x-4">
              <button onClick={handleLike} className="transform hover:scale-110 transition-transform">
                {isLiked ? (
                  <HeartFilled className="w-6 h-6 text-red-500" />
                ) : (
                  <HeartRegular className="w-6 h-6" />
                )}
              </button>
              <Link to={`/post/${localPost._id}`}>
                <ArrowExpandAllFilled className="w-6 h-6" />
              </Link>
              <button>
                <ShareRegular className="w-6 h-6" />
              </button>
            </div>
            <button>
              {localPost.saved ? (
                <BookmarkFilled className="w-6 h-6" />
              ) : (
                <BookmarkRegular className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Post Details */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="font-medium text-sm">
            {localPost.likes?.length || 0} likes
          </div>
          <div className="text-xs text-gray-500">
            {new Date(localPost.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* Comments */}
        {localPost.comments?.length > 0 && (
          <Link to={`/post/${localPost._id}`} className="block text-gray-500 mt-2">
            View all {localPost.comments.length} comments
          </Link>
        )}
      </div>
    </div>
  );
};

export default Post;
