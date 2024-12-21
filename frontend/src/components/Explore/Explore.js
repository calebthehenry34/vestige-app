import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ChatRegular, HeartRegular } from '@fluentui/react-icons';
import { ThemeContext } from '../../App';
import { API_URL } from '../../config';
import { createImageProps, checkWebPSupport } from '../../utils/imageUtils';

const Explore = () => {
  const { theme } = useContext(ThemeContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [supportsWebP, setSupportsWebP] = useState(false);

  useEffect(() => {
    const checkWebP = async () => {
      const isSupported = await checkWebPSupport();
      setSupportsWebP(isSupported);
    };
    checkWebP();
  }, []);

  const fetchExplorePosts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts/explore`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
  
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch explore posts');
      }
  
      const postsArray = data.posts || data;
      setPosts(Array.isArray(postsArray) ? postsArray : []);
      setError(null);
  
    } catch (error) {
      console.error('Error fetching explore posts:', error);
      setError(error.message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExplorePosts();
  }, [fetchExplorePosts]);

  const getImageUrls = (post) => {
    if (!post?.media) return null;
    
    const baseUrl = typeof post.media === 'string' && post.media.startsWith('http') 
      ? post.media 
      : `${API_URL}/uploads/${post.media}`;
    const ext = supportsWebP ? 'webp' : 'jpg';
    
    // If the URL already includes size suffixes, use them
    if (baseUrl.includes('_medium') || baseUrl.includes('_small') || baseUrl.includes('_thumbnail')) {
      return {
        thumbnail: baseUrl.replace(`.${ext}`, `_thumbnail.${ext}`),
        small: baseUrl.replace(`.${ext}`, `_small.${ext}`),
        medium: baseUrl.replace(`.${ext}`, `_medium.${ext}`),
        large: baseUrl,
      };
    }
    
    // Otherwise, use the same URL for all sizes
    // The image will still be responsive thanks to the srcSet and sizes attributes
    return {
      thumbnail: baseUrl,
      small: baseUrl,
      medium: baseUrl,
      large: baseUrl,
    };
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark-theme' ? 'bg-black' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen px-4 flex items-center justify-center ${
        theme === 'dark-theme' ? 'bg-black' : 'bg-gray-50'
      }`}>
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={` mb-50 min-h-screen ${theme === 'dark-theme' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Two Column Links */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/explore/users"
            className={`p-6 rounded-lg text-center transition-colors backdrop-blur-md backdrop-filter bg-opacity-50 ${
              theme === 'dark-theme'
                ? 'bg-gray-800/50 hover:bg-gray-700/50 text-white shadow-lg'
                : 'bg-white/50 hover:bg-gray-50/50 text-black shadow-lg'
            }`}
          >
            <h2 className="text-xl font-semibold mb-2">Find Users</h2>
            <p className={`text-sm ${theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-600'}`}>
              Discover and connect with other users
            </p>
          </Link>

          <Link
            to="/explore/hashtags"
            className={`p-6 rounded-lg text-center transition-colors backdrop-blur-md backdrop-filter bg-opacity-50 ${
              theme === 'dark-theme'
                ? 'bg-gray-800/50 hover:bg-gray-700/50 text-white shadow-lg'
                : 'bg-white/50 hover:bg-gray-50/50 text-black shadow-lg'
            }`}
          >
            <h2 className="text-xl font-semibold mb-2">Search Hashtags</h2>
            <p className={`text-sm ${theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-600'}`}>
              Find posts by hashtags
            </p>
          </Link>
        </div>

        {/* Explore Posts Grid */}
        <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark-theme' ? 'text-white' : 'text-black'}`}>
          Explore Posts
        </h2>
        <div className="grid grid-cols-3 gap-1 md:grid-cols-2 lg:grid-cols-3 md:gap-4">
          {posts.map((post) => (
            <Link 
              key={post._id} 
              to={`/post/${post._id}`}
              className={`relative aspect-square group overflow-hidden rounded-lg ${
                theme === 'dark-theme' ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              {post.mediaType === 'video' ? (
                <div className="w-full h-full bg-black rounded-lg overflow-hidden">
                  <video
                    src={typeof post.media === 'string' && post.media.startsWith('http')
                      ? post.media 
                      : `${API_URL}/uploads/${post.media}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="relative w-full h-full">
                  {/* Blur Placeholder */}
                  {post.blurPlaceholder && (
                    <div
                      className="absolute inset-0 bg-cover bg-center blur-lg"
                      style={{
                        backgroundImage: `url(${post.blurPlaceholder})`,
                        opacity: 1,
                        transition: 'opacity 0.3s ease-in-out'
                      }}
                    />
                  )}
                  
                  {/* Main Image */}
                  <img
                    alt={`Post by ${post.author?.username || 'unknown'}`}
                    className="w-full h-full object-cover rounded-lg relative z-10"
                    onLoad={(e) => {
                      // Fade out blur placeholder when main image loads
                      if (e.target.previousSibling) {
                        e.target.previousSibling.style.opacity = '0';
                      }
                    }}
                    {...createImageProps(
                      getImageUrls(post) || {
                        thumbnail: `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.username || 'Post')}&size=100`,
                        small: `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.username || 'Post')}&size=400`,
                        medium: `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.username || 'Post')}&size=800`,
                        large: `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.username || 'Post')}&size=1200`
                      },
                      `Post by ${post.author?.username || 'unknown'}`,
                      'medium'
                    )}
                  />
                </div>
              )}
              
              {/* Hover Overlay */}
              <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/50 hidden md:flex items-center justify-center space-x-6 transition-opacity rounded-lg">
                <div className="flex items-center text-white">
                  <HeartRegular className="w-6 h-6 mr-2" />
                  <span className="font-semibold">{post.likes?.length || 0}</span>
                </div>
                <div className="flex items-center text-white">
                  <ChatRegular className="w-6 h-6 mr-2" />
                  <span className="font-semibold">{post.comments?.length || 0}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Explore;
