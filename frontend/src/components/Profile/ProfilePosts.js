// components/Profile/ProfilePosts.js
import React, { useState, useContext } from 'react';
import { GridRegular, ListRegular, HeartRegular, ChatRegular } from '@fluentui/react-icons';
import { Link } from 'react-router-dom';
import { ThemeContext } from '../../App';
import { API_URL } from '../../config';

const getMediaUrl = (mediaPath) => {
  if (!mediaPath) return '';
  return mediaPath.startsWith('http') 
    ? mediaPath 
    : `${API_URL}/uploads/${mediaPath}`;
};

const ProfilePosts = ({ posts = [] }) => {
  const { theme } = useContext(ThemeContext);
  const [isGridView, setIsGridView] = useState(true);
  const [errorImages, setErrorImages] = useState(new Set());

  if (!posts || posts.length === 0) {
    return (
      <div className={`text-center py-8 ${
        theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
      }`}>
        <p>No posts yet</p>
      </div>
    );
  }

  const handleImageError = (postId) => {
    setErrorImages(prev => new Set([...prev, postId]));
  };

  return (
    <div>
      {/* Layout Toggle */}
      <div className="flex justify-between items-center mb-4 px-4">
        <h2 className={`text-xl font-semibold ${
          theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
        }`}>Posts</h2>
        <button 
          onClick={() => setIsGridView(!isGridView)}
          className={`p-2 rounded-lg transition-colors ${
            theme === 'dark-theme' 
              ? 'hover:bg-gray-800 text-white' 
              : 'hover:bg-gray-100 text-gray-900'
          }`}
        >
          {isGridView ? <ListRegular className="w-6 h-6" /> : <GridRegular className="w-6 h-6" />}
        </button>
      </div>

      {/* Grid View */}
      {isGridView ? (
        <div className="grid grid-cols-3 gap-1">
          {posts.map(post => (
            <Link 
              key={post._id}
              to={`/post/${post._id}`}
              className="relative aspect-square group"
            >
              <div className="w-full h-full">
                <img
                  src={getMediaUrl(post.media)}
                  alt=""
                  className={`w-full h-full object-cover ${
                    errorImages.has(post._id) ? 'opacity-50' : ''
                  }`}
                  onError={() => handleImageError(post._id)}
                />
                {errorImages.has(post._id) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
                    <span className={`text-sm ${
                      theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Image unavailable
                    </span>
                  </div>
                )}
              </div>
              {/* Hover Overlay */}
              <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/50 flex items-center justify-center space-x-6 transition-opacity">
                <div className="flex items-center text-white">
                  <HeartRegular className="w-6 h-6 mr-2" />
                  <span>{post.likes?.length || 0}</span>
                </div>
                <div className="flex items-center text-white">
                  <ChatRegular className="w-6 h-6 mr-2" />
                  <span>{post.comments?.length || 0}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        // Single Post Layout
        <div className="space-y-4 px-4">
          {posts.map(post => (
            <div 
              key={post._id} 
              className={`rounded-lg shadow ${
                theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
              }`}
            >
              <div className="aspect-square relative">
                <img
                  src={getMediaUrl(post.media)}
                  alt=""
                  className={`w-full h-full object-cover ${
                    errorImages.has(post._id) ? 'opacity-50' : ''
                  }`}
                  onError={() => handleImageError(post._id)}
                />
                {errorImages.has(post._id) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
                    <span className={`text-sm ${
                      theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Image unavailable
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center ${
                      theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
                    }`}>
                      <HeartRegular className="w-6 h-6 mr-2" />
                      <span>{post.likes?.length || 0}</span>
                    </div>
                    <div className={`flex items-center ${
                      theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
                    }`}>
                      <ChatRegular className="w-6 h-6 mr-2" />
                      <span>{post.comments?.length || 0}</span>
                    </div>
                  </div>
                  <span className={`text-sm ${
                    theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className={theme === 'dark-theme' ? 'text-gray-300' : 'text-gray-800'}>
                  {post.caption}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfilePosts;
