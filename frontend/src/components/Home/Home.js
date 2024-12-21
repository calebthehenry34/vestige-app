// frontend/src/components/Home/Home.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  HeartRegular, 
  HeartFilled, 
  PanelTopExpandFilled, 
  ShareRegular, 
  BookmarkRegular,
  BookmarkFilled,
  MoreHorizontalRegular,
  EditRegular,
  DeleteRegular,
  FlagRegular,
  PersonRegular,
} from '@fluentui/react-icons';
import PostComments from '../Post/PostComments';
import PostCreator from '../Post/PostCreator';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';
import { 
  getProfileImageUrl, 
  createImageProps, 
  checkWebPSupport 
} from '../../utils/imageUtils';
import ShareModal from '../Post/ShareModal';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePostMenu, setActivePostMenu] = useState(null);
  const [showComments, setShowComments] = useState({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePostId, setSharePostId] = useState(null);
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [supportsWebP, setSupportsWebP] = useState(false);
  const scrollRestoredRef = useRef(false);

  useEffect(() => {
    const checkWebP = async () => {
      const isSupported = await checkWebPSupport();
      setSupportsWebP(isSupported);
    };
    checkWebP();
  }, []);

  const getImageUrls = (mediaUrl) => {
    if (!mediaUrl || typeof mediaUrl !== 'string') return null;
    const baseUrl = mediaUrl.startsWith('http') ? mediaUrl : `${API_URL}/uploads/${mediaUrl}`;
    const ext = supportsWebP ? 'webp' : 'jpg';
    
    return {
      thumbnail: baseUrl.replace(`.${ext}`, `_thumbnail.${ext}`),
      small: baseUrl.replace(`.${ext}`, `_small.${ext}`),
      medium: baseUrl.replace(`.${ext}`, `_medium.${ext}`),
      large: baseUrl
    };
  };

  const renderText = (text) => {
    if (!text || typeof text !== 'string') return '';
    
    return text.split(' ').map((word, index) => {
      // Skip if word is undefined or not a string
      if (!word || typeof word !== 'string') return ' ';
      
      if (word.startsWith('#')) {
        return (
          <React.Fragment key={index}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/explore/hashtag/${word.slice(1)}`);
              }}
              className="text-blue-500 hover:underline"
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
                e.preventDefault();
                e.stopPropagation();
                navigate(`/profile/${word.slice(1)}`);
              }}
              className="text-blue-500 hover:underline"
            >
              {word}
            </button>{' '}
          </React.Fragment>
        );
      }
      return word + ' ';
    });
  };

  const fetchPosts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found');
        navigate('/login');
        return;
      }
  
      const response = await fetch(`${API_URL}/api/posts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }
        throw new Error(errorData.error || 'Failed to fetch posts');
      }

      const data = await response.json();
      setPosts(Array.isArray(data) ? data : Array.isArray(data.posts) ? data.posts : []);
      setError(null);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [navigate]);
  
  useEffect(() => {
    fetchPosts();
    
    if (!scrollRestoredRef.current) {
      const savedPosition = sessionStorage.getItem('feedScroll');
      if (savedPosition) {
        window.scrollTo(0, parseInt(savedPosition, 10));
      }
      scrollRestoredRef.current = true;
    }
  
    const handleBeforeUnload = () => {
      sessionStorage.setItem('feedScroll', window.scrollY.toString());
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [fetchPosts]);

  const handlePostCreated = async (newPost) => {
    await fetchPosts(); // Refresh the feed
    setShowPostCreator(false); // Close the creator
  };

  const togglePostMenu = (postId) => {
    setActivePostMenu(activePostMenu === postId ? null : postId);
  };

  const handleLike = async (postId) => {
    if (!user?.id || !postId) return;

    try {
      setPosts(prevPosts => prevPosts.map(post => {
        if (post._id === postId) {
          const newLiked = !post.liked;
          return {
            ...post,
            liked: newLiked,
            likes: newLiked 
              ? [...(post.likes || []), user.id]
              : (post.likes || []).filter(id => id !== user.id)
          };
        }
        return post;
      }));
  
      const response = await fetch(`${API_URL}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
  
      if (!response.ok) {
        throw new Error('Failed to like post');
      }
  
      const post = posts.find(p => p._id === postId);
      if (post?.user?._id && post.user._id !== user.id) {
        await fetch(`${API_URL}/api/notifications`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipientId: post.user._id,
            type: 'like',
            postId: postId
          })
        });
      }
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert the optimistic update
      setPosts(prevPosts => prevPosts.map(post => {
        if (post._id === postId) {
          const newLiked = !post.liked;
          return {
            ...post,
            liked: newLiked,
            likes: newLiked 
              ? (post.likes || []).filter(id => id !== user.id)
              : [...(post.likes || []), user.id]
          };
        }
        return post;
      }));
    }
  };

  const handleSave = async (postId) => {
    if (!postId) return;

    try {
      setPosts(prevPosts => prevPosts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            saved: !post.saved
          };
        }
        return post;
      }));
  
      const response = await fetch(`${API_URL}/api/posts/${postId}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save post');
      }
  
      setPosts(prevPosts => prevPosts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            saved: data.saved
          };
        }
        return post;
      }));
  
    } catch (error) {
      console.error('Error saving post:', error);
      // Revert the optimistic update
      setPosts(prevPosts => prevPosts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            saved: !post.saved
          };
        }
        return post;
      }));
    }
  };

  const handleDeletePost = async (postId) => {
    if (!postId) return;

    try {
      const response = await fetch(`${API_URL}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchPosts();
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
    setActivePostMenu(null);
  };

  const handleEditCaption = (postId) => {
    const post = posts.find(p => p._id === postId);
    if (!post) return;
  
    const newCaption = prompt('Edit caption:', post.caption);
    if (newCaption === null || newCaption === post.caption) return;
  
    fetch(`${API_URL}/api/posts/${postId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ caption: newCaption })
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to update caption');
        return response.json();
      })
      .then(updatedPost => {
        setPosts(prevPosts => prevPosts.map(p => 
          p._id === postId ? updatedPost : p
        ));
      })
      .catch(error => console.error('Error updating caption:', error));
    
    setActivePostMenu(null);
  };

  const toggleComments = (postId) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleShare = (postId) => {
    setSharePostId(postId);
    setShowShareModal(true);
  };

  const handleReportPost = async (postId) => {
    if (!postId) return;
    
    try {
      const response = await fetch(`${API_URL}/api/posts/${postId}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
  
      if (!response.ok) {
        throw new Error('Failed to report post');
      }
  
      setActivePostMenu(null); // Close the menu after reporting
    } catch (error) {
      console.error('Error reporting post:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ae52e3]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 m-50">
      <button
        onClick={() => setShowPostCreator(true)}
        className="w-full mb-6 py-3 bg-[#ae52e3] text-white rounded-lg hover:bg-[#9745c5] transition-colors"
      >
        Create Post
      </button>

      <PostCreator
        isOpen={showPostCreator}
        onClose={() => setShowPostCreator(false)}
        onPostCreated={handlePostCreated}
      />

      <div className="space-y-6">
        {Array.isArray(posts) && posts.map((post) => (
          <div key={post._id} className="bg-[#1a1a1a] rounded-lg shadow-md overflow-hidden">
            <Link 
              to={`/post/${post._id}`} 
              className="block relative" 
              onClick={(e) => {
                if (e.target.closest('button')) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              <div className="relative">
                {/* User Info and Menu Overlay at Top */}
                <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      {post.user ? (
                        <img
                        {...createImageProps(
                          { small: getProfileImageUrl(post.user.profilePicture, post.user.username) },
                          post.user.username,
                          'small'
                        )}
                        alt={`${post.user.username}'s profile`}
                        className="h-6 w-6 rounded-md object-cover"
                        loading="lazy"
                      />
                      ) : (
                        <div className="h-6 w-6 rounded-md bg-gray-200 flex items-center justify-center">
                          <PersonRegular className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <span className="ml-2 font-medium text-white text-sm">
                        {post.user?.username || 'Unknown User'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Media Content */}
                {post.mediaType === 'video' ? (
                  <video
                    src={typeof post.media === 'string' && post.media
                      ? (post.media.startsWith('http') ? post.media : `${API_URL}/uploads/${post.media}`)
                      : ''}
                    controls
                    className="w-full h-auto"
                    loading="lazy"
                    onError={(e) => {
                      console.error('Video load error:', post.media);
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="relative">
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
                      alt={`Post by ${post.user?.username || 'unknown user'}`}
                      className="w-full h-auto relative z-10"
                      loading="lazy"
                      onLoad={(e) => {
                        // Fade out blur placeholder when main image loads
                        if (e.target.previousSibling) {
                          e.target.previousSibling.style.opacity = '0';
                        }
                      }}
                      onError={(e) => {
                        console.error('Image load error:', post.media);
                        e.target.src = 'https://via.placeholder.com/400';
                      }}
                      {...createImageProps(
                        getImageUrls(post.media),
                        `Post by ${post.user?.username || 'unknown user'}`,
                        'medium'
                      )}
                    />
                  </div>
                )}

                {/* Post Menu Button */}
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    togglePostMenu(post._id);
                  }}
                  className="absolute top-4 right-4 text-white hover:text-white/80"
                >
                  <MoreHorizontalRegular className="w-6 h-6" />
                </button>

                {/* Bottom Action Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-white">
                    <div className="flex space-x-4">
                      <button onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleLike(post._id);
                      }} className="hover:scale-110 transition-transform">
                        {post.liked ? (
                          <HeartFilled className="w-6 h-6 text-red-500" />
                        ) : (
                          <HeartRegular className="w-6 h-6" />
                        )}
                      </button>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleComments(post._id);
                        }}
                        className="hover:scale-110 transition-transform"
                      >
                        <PanelTopExpandFilled className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleShare(post._id);
                        }} 
                        className="hover:scale-110 transition-transform"
                      >
                        <ShareRegular className="w-6 h-6" />
                      </button>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSave(post._id);
                      }}
                      className="hover:scale-110 transition-transform"
                    >
                      {post.saved ? (
                        <BookmarkFilled className="w-6 h-6" />
                      ) : (
                        <BookmarkRegular className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </Link>

            {/* Post Menu */}
            {activePostMenu === post._id && (
              <div className="absolute right-4 top-12 w-48 bg-[#262626] rounded-lg shadow-lg z-20 py-1">
                {post.user?._id === user?.id ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEditCaption(post._id);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[#333333] text-white flex items-center"
                    >
                      <EditRegular className="w-5 h-5 mr-2" />
                      Edit Caption
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeletePost(post._id);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[#333333] text-red-500 flex items-center"
                    >
                      <DeleteRegular className="w-5 h-5 mr-2" />
                      Delete Post
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleReportPost(post._id);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-[#333333] text-red-500 flex items-center"
                  >
                    <FlagRegular className="w-5 h-5 mr-2" />
                    Report Post
                  </button>
                )}
              </div>
            )}

            {/* Caption */}
            <div className="p-4 text-white">
              <span 
                className="font-semibold mr-2 cursor-pointer"
                onClick={() => navigate(`/profile/${post.user?.username}`)}
              >
                {post.user?.username}
              </span>
              {renderText(post.caption)}
            </div>

            {/* Comments Section */}
            <PostComments
              post={post}
              isOpen={showComments[post._id]}
              onComment={(text) => {
                if (!post._id || !text?.trim()) return;
              
                fetch(`${API_URL}/api/posts/${post._id}/comments`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ text: text.trim() })
                })
                .then(response => {
                  if (!response.ok) {
                    return response.json().then(data => {
                      throw new Error(data.details || data.error || 'Failed to post comment');
                    });
                  }
                  return response.json();
                })
                .then(data => {
                  setPosts(prevPosts => prevPosts.map(p => 
                    p._id === post._id ? data : p
                  ));
                
                  if (post?.user?._id && post.user._id !== user?.id) {
                    fetch(`${API_URL}/api/notifications`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        recipientId: post.user._id,
                        type: 'comment',
                        postId: post._id,
                        commentId: data.comments[data.comments.length - 1]._id
                      })
                    }).catch(error => console.error('Error sending notification:', error));
                  }
                })
                .catch(error => console.error('Error posting comment:', error));
              }}
              onReply={(commentId, text) => {
                if (!post._id || !commentId || !text?.trim()) return;
              
                fetch(
                  `${API_URL}/api/posts/${post._id}/comments/${commentId}/replies`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ text: text.trim() })
                  }
                )
                .then(response => {
                  if (!response.ok) {
                    return response.json().then(data => {
                      throw new Error(data.error || 'Failed to post reply');
                    });
                  }
                  return response.json();
                })
                .then(data => {
                  setPosts(prevPosts => prevPosts.map(p => 
                    p._id === post._id ? data : p
                  ));
                
                  const comment = data.comments.find(c => c._id === commentId);
                  if (comment?.user && comment.user !== user?.id) {
                    fetch(`${API_URL}/api/notifications`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                        recipientId: comment.user,
                        type: 'reply',
                        postId: post._id,
                        commentId: commentId
                      })
                    }).catch(error => console.error('Error sending notification:', error));
                  }
                })
                .catch(error => console.error('Error posting reply:', error));
              }}
            />
          </div>
        ))}
      </div>

      {/* Share Modal */}
      {showShareModal && sharePostId && (
        <ShareModal
          isOpen={showShareModal}
          postId={sharePostId}
          onClose={() => {
            setShowShareModal(false);
            setSharePostId(null);
          }}
        />
      )}
    </div>
  );
};

export default Home;
