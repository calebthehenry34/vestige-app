import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ChatRegular, HeartRegular } from '@fluentui/react-icons';
import Navbar from '../Navigation/Navbar';
import ExploreMessage from './ExploreMessage';
import { useScroll } from '../../context/ScrollContext';
import { PostSkeleton } from '../Common/Skeleton';
import { ThemeContext } from '../../App';
import { API_URL } from '../../config';
import { createImageProps, checkWebPSupport } from '../../utils/imageUtils';

const ExploreNew = () => {
  const { theme } = useContext(ThemeContext);
  const { isScrolled } = useScroll();
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

    if (post.media.variants) {
      const format = supportsWebP ? 'webp' : 'jpeg';
      return {
        thumbnail: post.media.variants.thumbnail?.urls[format],
        small: post.media.variants.small?.urls[format],
        medium: post.media.variants.medium?.urls[format],
        large: post.media.variants.large?.urls[format]
      };
    }
    
    if (post.media.legacy?.url || typeof post.media === 'string') {
      const mediaUrl = post.media.legacy?.url || post.media;
      if (!mediaUrl || typeof mediaUrl !== 'string') return null;
      
      const baseUrl = mediaUrl.startsWith('http') ? mediaUrl : `${API_URL}/uploads/${mediaUrl}`;
      const ext = supportsWebP ? 'webp' : 'jpg';
      
      if (baseUrl.includes('_medium') || baseUrl.includes('_small') || baseUrl.includes('_thumbnail')) {
        return {
          thumbnail: baseUrl.replace(`.${ext}`, `_thumbnail.${ext}`),
          small: baseUrl.replace(`.${ext}`, `_small.${ext}`),
          medium: baseUrl.replace(`.${ext}`, `_medium.${ext}`),
          large: baseUrl,
        };
      }
      
      return {
        thumbnail: baseUrl,
        small: baseUrl,
        medium: baseUrl,
        large: baseUrl,
      };
    }

    return null;
  };

  if (error) {
    return (
      <div className={`min-h-screen ${theme === 'dark-theme' ? 'bg-black' : 'bg-gray-50'}`}>
        <div className="fixed top-0 left-0 right-0 z-50">
          <Navbar />
        </div>
        <div className="feed-layout">
          <div className="p-4 text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark-theme' ? 'bg-black' : 'bg-gray-50'}`}>
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>

      <div className="feed-layout">
        {loading ? (
          <>
            <div className="p-4">
              <PostSkeleton />
            </div>
            <div className={`feed-container ${isScrolled ? 'scrolled' : ''}`}>
              <div className="max-w-xl mx-auto space-y-6">
                {[...Array(3)].map((_, index) => (
                  <PostSkeleton key={index} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <ExploreMessage />
            <div className={`feed-container ${isScrolled ? 'scrolled' : ''}`}>
              <div className="grid grid-cols-3 gap-1 md:grid-cols-2 lg:grid-cols-3 md:gap-4">
                {posts.map((post) => (
                  <Link 
                    key={post._id} 
                    to={`/post/${post._id}`}
                    className={`relative aspect-square group overflow-hidden rounded-lg ${theme === 'dark-theme' ? 'bg-gray-800' : 'bg-gray-100'}`}
                  >
                    {post.mediaType === 'video' ? (
                      <div className={`w-full h-full rounded-lg overflow-hidden ${theme === 'dark-theme' ? 'bg-black' : 'bg-gray-200'}`}>
                        <video
                          src={typeof post.media === 'string' && post.media
                            ? (post.media.startsWith('http') ? post.media : `${API_URL}/uploads/${post.media}`)
                            : ''}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="relative w-full h-full">
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
                        
                        <img
                          alt={`Post by ${post.author?.username || 'unknown'}`}
                          className="w-full h-full object-cover rounded-lg relative z-10"
                          onLoad={(e) => {
                            if (e.target.previousSibling) {
                              e.target.previousSibling.style.opacity = '0';
                            }
                          }}
                          {...createImageProps(
                            getImageUrls(post) ?? {
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
                    
                    <div className={`opacity-0 group-hover:opacity-100 absolute inset-0 ${theme === 'dark-theme' ? 'bg-black/50' : 'bg-white/75'} hidden md:flex items-center justify-center space-x-6 transition-opacity rounded-lg`}>
                      <div className={`flex items-center ${theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}`}>
                        <HeartRegular className="w-6 h-6 mr-2" />
                        <span className="font-semibold">{post.likes?.length ?? 0}</span>
                      </div>
                      <div className={`flex items-center ${theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}`}>
                        <ChatRegular className="w-6 h-6 mr-2" />
                        <span className="font-semibold">{post.comments?.length ?? 0}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExploreNew;
