import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftRegular } from '@fluentui/react-icons';
import { getMediaUrl, getProfileImageUrl } from '../../utils/imageUtils';

const SinglePostView = ({ post }) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Add class to hide navbars
    document.body.classList.add('hide-navigation');
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('hide-navigation');
    };
  }, []);

  if (!post || !post.user) {
    return (
      <div className="flex flex-col h-screen bg-black">
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
      <div className="flex flex-col h-screen bg-black">
      {/* Header with back button */}
      <div className="p-4">
        <button 
          onClick={() => navigate(-1)} 
          className="text-white hover:opacity-80"
        >
          <ChevronLeftRegular className="w-6 h-6" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* User info */}
        <div className="p-4 mt-50">
          <div className="flex items-center mb-4">
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
                <span>{post.user.location || 'Los Angeles, USA'}</span>
                <span className="mx-2">•</span>
                <span>{formatTimestamp(post.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Post media */}
        <div className="flex-1 bg-white rounded-2xl mx-4 mb-4 overflow-hidden">
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
              <img
                src={getMediaUrl(post.media)}
                alt="Post content"
                className={`w-full h-full object-cover ${imageError ? 'opacity-50' : ''}`}
                onError={(e) => {
                  console.error('Image load error:', post.media);
                  setImageError(true);
                  // Attempt to reload the image once
                  if (!e.target.dataset.retried) {
                    e.target.dataset.retried = 'true';
                    e.target.src = getMediaUrl(post.media);
                  }
                }}
              />
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center text-red-500 bg-black bg-opacity-50">
                  Error loading image
                </div>
              )}
            </>
          )}
        </div>

        {/* Post content */}
        <div className="p-4">
          {/* Post text content */}
          <div className="text-white">
            {post.caption && (
              <p className="mb-4 whitespace-pre-wrap">{post.caption}</p>
            )}
            {post.text && (
              <p className="whitespace-pre-wrap">{post.text}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SinglePostView;
