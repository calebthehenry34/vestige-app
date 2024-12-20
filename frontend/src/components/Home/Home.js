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
  AddRegular,
} from '@fluentui/react-icons';
import PostComments from '../Post/PostComments';
import PostCreator from '../Post/PostCreator';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';

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
  const scrollRestoredRef = useRef(false);

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
    console.log('Edit caption for post:', postId);
    setActivePostMenu(null);
  };

  const handleReportPost = async (postId) => {
    if (!postId) return;

    try {
      const response = await fetch(`${API_URL}/api/posts/${postId}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Post reported successfully');
      }
    } catch (error) {
      console.error('Error reporting post:', error);
    }
    setActivePostMenu(null);
  };

  const toggleComments = (postId) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleComment = async (postId, text) => {
    if (!postId || !text?.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to post comment');
      }
  
      setPosts(prevPosts => prevPosts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            comments: [...(post.comments || []), data]
          };
        }
        return post;
      }));
  
      const post = posts.find(p => p._id === postId);
      if (post?.user?._id && post.user._id !== user?.id) {
        try {
          await fetch(`${API_URL}/api/notifications`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              recipientId: post.user._id,
              type: 'comment',
              postId: postId
            })
          });
        } catch (notificationError) {
          console.error('Error creating notification:', notificationError);
        }
      }
  
      await fetchPosts();
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleReply = async (postId, commentId, text) => {
    if (!postId || !commentId || !text?.trim()) return;

    try {
      const response = await fetch(
        `${API_URL}/api/posts/${postId}/comments/${commentId}/reply`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('Reply error:', data);
        throw new Error(data.error || 'Failed to post reply');
      }

      await fetchPosts();
    } catch (error) {
      console.error('Error posting reply:', error);
    }
  };

  const handleShare = (postId) => {
    setSharePostId(postId);
    setShowShareModal(true);
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
      {/* Create Post Button */}
      <button
        onClick={() => setShowPostCreator(true)}
        className="fixed bottom-4 right-4 bg-[#ae52e3] text-white p-4 rounded-full shadow-lg hover:bg-[#9a3dd0] transition-colors z-50"
      >
        <AddRegular className="w-6 h-6" />
      </button>

      {/* Post Creator Modal */}
      <PostCreator
        isOpen={showPostCreator}
        onClose={() => setShowPostCreator(false)}
        onPostCreated={handlePostCreated}
      />

      <div className="space-y-6">
        {Array.isArray(posts) && posts.map((post) => (
          <div key={post._id} className="bg-[#1a1a1a] rounded-lg shadow-md overflow-hidden">
            <Link to={`/post/${post._id}`} className="block relative" onClick={(e) => {
              if (e.target.closest('button')) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}>
              <div className="relative">
                {/* User Info and Menu Overlay at Top */}
                <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      {post.user ? (
                        <img
                          src={getProfileImageUrl(post.user.profilePicture, post.user.username)}
                          alt={post.user.username}
                          className="h-6 w-6 rounded-md object-cover"
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
                <Link to={`/post/${post._id}`}>
                {post.mediaType === 'video' ? (
                  <video
                    src={post.media}
                    controls
                    className="w-full h-auto"
                    onError={(e) => {
                      console.error('Video load error:', post.media);
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="relative">
                    <img
                      src={post.media}
                      alt="Post content"
                      className="w-full h-auto"
                      onError={(e) => {
                        console.error('Image load error:', post.media);
                        e.target.src = 'https://via.placeholder.com/400';
                      }}
                    />
                  </div>
                )}
                </Link>

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

            {/* Comments Section */}
            <PostComments
              post={post}
              isOpen={showComments[post._id]}
              onComment={(text) => handleComment(post._id, text)}
              onReply={handleReply}
            />
          </div>
        ))}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-lg p-4 w-80">
            <h3 className="text-lg font-semibold mb-4 text-white">Share Post</h3>
            <div className="space-y-4">
              <button 
                onClick={async () => {
                  try {
                    const postUrl = `${window.location.origin}/post/${sharePostId}`;
                    await navigator.clipboard.writeText(postUrl);
                    alert('Link copied to clipboard!');
                  } catch (error) {
                    console.error('Failed to copy link:', error);
                  }
                  setShowShareModal(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-[#262626] rounded text-white"
              >
                Copy Link
              </button>
              <button 
                onClick={() => setShowShareModal(false)}
                className="w-full px-4 py-2 bg-[#262626] rounded text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
