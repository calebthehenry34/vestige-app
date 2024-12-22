import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PostSkeleton } from '../Common/Skeleton';
import {
  HeartRegular,
  HeartFilled,
  CommentRegular,
  ShareRegular,
  BookmarkRegular,
  BookmarkFilled,
  DeleteRegular,
} from '@fluentui/react-icons';
import axios from 'axios';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';
import PostCreator from '../Post/PostCreator';
import PostComments from '../Post/PostComments';
import { useAuth } from '../../context/AuthContext';
import MobileNav from '../Navigation/MobileNav';

const Feed = ({ onStoryClick, onRefreshNeeded }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showComments, setShowComments] = useState({});
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [ setScrollY ] = useState(0);
  const [showMobileNav, setShowMobileNav] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      
      // Show nav when scrolling up, hide when scrolling down
      if (currentScrollY > lastScrollY.current && currentScrollY > 10) {
        setShowMobileNav(false);
      } else {
        setShowMobileNav(true);
      }
      
      // Update CSS variable for scroll position
      document.documentElement.style.setProperty('--scroll-y', currentScrollY);
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/posts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setPosts(response.data.posts);
      setError(null);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (onRefreshNeeded) {
      onRefreshNeeded(fetchPosts);
    }
  }, [onRefreshNeeded, fetchPosts]);

  const handlePostCreated = async (newPost) => {
    await fetchPosts();
    setShowPostCreator(false);
  };

  const handleLike = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(posts.map(post => 
          post._id === postId ? updatedPost : post
        ));
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleSave = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts/${postId}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setPosts(posts.map(post => 
          post._id === postId ? { ...post, saved: result.saved } : post
        ));
      }
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  const handleDelete = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setPosts(posts.filter(post => post._id !== postId));
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleShare = async (post) => {
    try {
      await navigator.share({
        title: `Post by ${post.user.username}`,
        url: `${window.location.origin}/post/${post._id}`
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const renderText = (text) => {
    return text.split(' ').map((word, index) => {
      if (word.startsWith('#')) {
        return (
          <React.Fragment key={index}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/explore/hashtag/${word.slice(1)}`);
              }}
              className="text-blue-500 hover:underline relative z-10"
            >
              {word}
            </button>{' '}
          </React.Fragment>
        );
      } else if (word.startsWith('@')) {
        return (
          <React.Fragment key={index}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${word.slice(1)}`);
              }}
              className="text-blue-500 hover:underline relative z-10"
            >
              {word}
            </button>{' '}
          </React.Fragment>
        );
      }
      return word + ' ';
    });
  };

  if (loading) {
    return <PostSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    );
  }

  return (
    <>
      <div className="max-w-xl mx-auto relative z-[5]">
        {/* Post Creator Modal */}
        <PostCreator
          isOpen={showPostCreator}
          onClose={() => setShowPostCreator(false)}
          onPostCreated={handlePostCreated}
        />

        {/* Posts */}
        <div>
          {posts.map((post) => (
            <div key={post._id} className="bg-white rounded-lg shadow-sm relative mb-3 overflow-hidden">
              {/* Clickable overlay for entire post */}
              <div 
                onClick={() => navigate(`/post/${post._id}`)}
                className="absolute inset-0 cursor-pointer z-0"
              />
              {/* Post Header */}
              <div className="flex items-center px-4 py-3">
                <img
                  src={getProfileImageUrl(post.user.profilePicture, post.user.username)}
                  alt={post.user.username}
                  className="h-8 w-8 rounded-full object-cover cursor-pointer relative z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${post.user.username}`);
                  }}
                />
                <span 
                  className="ml-2 font-medium cursor-pointer relative z-10 text-black text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/profile/${post.user.username}`);
                  }}
                >
                  {post.user.username}
                </span>
              </div>

              {/* Post Image */}
              <div className="relative aspect-[4/5] bg-black">
                {post?.media?.placeholder && (
                  <div 
                    className="absolute inset-0 bg-gray-200"
                    style={{
                      backgroundImage: `url(${post.media.placeholder})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'blur(10px)',
                      transform: 'scale(1.1)',
                    }}
                    role="presentation"
                  />
                )}
                {(() => {
                  const getMediaUrl = async (postId) => {
                    try {
                      const token = localStorage.getItem('token');
                      const response = await fetch(`${API_URL}/api/posts/${postId}/media`, {
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });
                      if (!response.ok) throw new Error('Failed to fetch media URL');
                      const data = await response.json();
                      return data.url;
                    } catch (error) {
                      console.error('Error fetching media URL:', error);
                      return null;
                    }
                  };

                  const handleImageError = async (e) => {
                    const freshUrl = await getMediaUrl(post._id);
                    if (freshUrl) {
                      e.target.src = freshUrl;
                      if (e.target.srcSet) {
                        e.target.srcSet = '';
                      }
                    } else {
                      const fallback = document.createElement('div');
                      fallback.className = 'absolute inset-0 flex items-center justify-center bg-gray-800 text-gray-300';
                      fallback.innerHTML = `
                        <div class="text-center p-4">
                          <div class="mb-2">⚠️</div>
                          <div>Image not available</div>
                          <div class="text-sm text-gray-500 mt-1">Please try refreshing</div>
                        </div>
                      `;
                      e.target.parentNode.replaceChild(fallback, e.target);
                    }
                  };

                  const imageProps = {
                    className: "absolute inset-0 w-full h-full object-cover",
                    loading: "lazy",
                    onError: handleImageError,
                    alt: post.caption || `Post by ${post.user.username}`
                  };

                  if (typeof post.media === 'string') {
                    return <img {...imageProps} src={post.media} alt={post.caption || `Post by ${post.user.username}`} />;
                  }

                  if (post.media?.variants) {
                    const imageUrls = {};
                    ['small', 'medium', 'large'].forEach(size => {
                      const variant = post.media.variants[size];
                      if (variant?.urls) {
                        imageUrls[size] = variant.urls.webp || variant.urls.jpeg;
                      }
                    });

                    if (Object.keys(imageUrls).length === 0) {
                      return <img {...imageProps} src={post.media.fallback || post.media} alt={post.caption || `Post by ${post.user.username}`} />;
                    }

                    const defaultSize = imageUrls.large ? 'large' : imageUrls.medium ? 'medium' : 'small';
                    return (
                      <img
                        {...imageProps}
                        src={imageUrls[defaultSize]}
                        srcSet={Object.entries(imageUrls)
                          .map(([size, url]) => `${url} ${size === 'small' ? '400w' : size === 'medium' ? '800w' : '1200w'}`)
                          .join(', ')}
                        sizes="(max-width: 400px) 100vw, 600px"
                        alt={post.caption || `Post by ${post.user.username}`}
                      />
                    );
                  }

                  return <img {...imageProps} src={post.media?.url || post.media} alt={post.caption || `Post by ${post.user.username}`} />;
                })()}
              </div>

              {/* Post Actions */}
              <div className="px-4 py-3">
                <div className="flex justify-between mb-2">
                  <div className="flex space-x-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(post._id);
                      }}
                      className="text-black hover:text-[#ae52e3] transition-colors relative z-10"
                    >
                      {post.likes?.includes(user?.id) ? (
                        <HeartFilled className="w-6 h-6 text-red-500" />
                      ) : (
                        <HeartRegular className="w-6 h-6" />
                      )}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowComments(prev => ({ ...prev, [post._id]: !prev[post._id] }));
                      }}
                      className="text-black hover:text-[#ae52e3] transition-colors relative z-10"
                    >
                      <CommentRegular className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(post);
                      }}
                      className="text-black hover:text-[#ae52e3] transition-colors relative z-10"
                    >
                      <ShareRegular className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSave(post._id);
                      }}
                      className="text-black hover:text-[#ae52e3] transition-colors relative z-10"
                    >
                      {post.saved ? (
                        <BookmarkFilled className="w-6 h-6" />
                      ) : (
                        <BookmarkRegular className="w-6 h-6" />
                      )}
                    </button>
                    {user?.isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(post._id);
                        }}
                        className="text-white hover:text-red-500 transition-colors relative z-10"
                      >
                        <DeleteRegular className="w-6 h-6" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="font-medium text-sm mb-2 text-black">{post.likes?.length || 0} likes</div>

                {/* Caption */}
                <div className="text-sm text-black">
                  <span 
                    className="font-medium mr-2 cursor-pointer relative z-10 text-black"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${post.user.username}`);
                    }}
                  >
                    {post.user.username}
                  </span>
                  {renderText(post.caption)}
                </div>

                {/* Comments */}
                <PostComments
                  post={post}
                  isOpen={showComments[post._id]}
                  onComment={(updatedPost) => {
                    setPosts(posts.map(p => 
                      p._id === updatedPost._id ? updatedPost : p
                    ));
                  }}
                  onReply={(updatedPost) => {
                    setPosts(posts.map(p => 
                      p._id === updatedPost._id ? updatedPost : p
                    ));
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <MobileNav 
        visible={showMobileNav} 
        onPostCreatorClick={() => setShowPostCreator(true)}
      />
    </>
  );
};

export default Feed;
