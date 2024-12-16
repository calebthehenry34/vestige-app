import React, { useState, useEffect, useRef } from 'react';
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
} from '@fluentui/react-icons';
import PostComments from '../Post/PostComments';
import { Link } from 'react-router-dom';
import { useScroll } from '../../context/ScrollContext';
import { useLocation } from 'react-router-dom';
import { API_URL } from '../../config';

const Home = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [activePostMenu, setActivePostMenu] = useState(null);
  const [showComments, setShowComments] = useState({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePostId, setSharePostId] = useState(null);
  const { saveScrollPosition } = useScroll();
  const location = useLocation();
  const scrollRestoredRef = useRef(false);

  const handleImageError = (e) => {
    if (!e.target.dataset.retry) {
      e.target.dataset.retry = 'true';
      e.target.src = '/api/placeholder/400/400';
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/posts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      // Ensure data is an array before setting posts
      if (Array.isArray(data)) {
        setPosts(data);
      } else if (data && typeof data === 'object' && Array.isArray(data.posts)) {
        // If data is wrapped in an object with a posts property
        setPosts(data.posts);
      } else {
        console.error('Invalid posts data format:', data);
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]); // Set empty array on error
    }
  };

  useEffect(() => {
    // Fetch posts first
    fetchPosts();
    
    // Set up scroll restoration
    if (!scrollRestoredRef.current) {
      window.scrollTo(0, sessionStorage.getItem('feedScroll') || 0);
      scrollRestoredRef.current = true;
    }
  
    // Save scroll position on unmount
    return () => {
      sessionStorage.setItem('feedScroll', window.scrollY.toString());
    };
  }, []);

  useEffect(() => {
    return () => {
      if (scrollRestoredRef.current) {
        saveScrollPosition(location.pathname);
      }
    };
  }, [location.pathname, saveScrollPosition]);

  const togglePostMenu = (postId) => {
    setActivePostMenu(activePostMenu === postId ? null : postId);
  };

  const handleLike = async (postId) => {
    try {
      // Optimistically update UI
      setPosts(prevPosts => prevPosts.map(post => {
        if (post._id === postId) {
          const newLiked = !post.liked;
          return {
            ...post,
            liked: newLiked,
            likes: newLiked 
              ? [...(post.likes || []), user.id]
              : post.likes.filter(id => id !== user.id)
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
  
      // Create notification if liking someone else's post
      const post = posts.find(p => p._id === postId);
      if (post && post.user._id !== user.id) {
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
      // Revert optimistic update on error
      setPosts(prevPosts => prevPosts.map(post => {
        if (post._id === postId) {
          const newLiked = !post.liked;
          return {
            ...post,
            liked: newLiked,
            likes: newLiked 
              ? post.likes.filter(id => id !== user.id)
              : [...(post.likes || []), user.id]
          };
        }
        return post;
      }));
    }
  };

  const handleSave = async (postId) => {
    try {
      // Optimistically update UI
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
  
      // Update local state with server response
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
      // Revert optimistic update on error
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
    // Implement caption editing
    console.log('Edit caption for post:', postId);
    setActivePostMenu(null);
  };

  const handleReportPost = async (postId) => {
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
    try {
      console.log('Sending comment:', { postId, text });
  
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
  
      // Update posts state locally first
      setPosts(prevPosts => prevPosts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            comments: [...(post.comments || []), data]
          };
        }
        return post;
      }));
  
      // Create notification for comment
      const post = posts.find(p => p._id === postId);
      if (post && post.user._id !== user.id) {
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
          // Continue execution even if notification fails
        }
      }
  
      // Then fetch fresh data
      await fetchPosts();
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleReply = async (postId, commentId, text) => {
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

  return (
    <div className="max-w-xl mx-auto p-4 m-50">
      <div className="space-y-6">
        {Array.isArray(posts) && posts.map((post) => (
          <div key={post._id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative">
              {/* User Info and Menu Overlay at Top */}
              <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <Link to={`/profile/${post.user.username}`} className="flex items-center">
                    <img
                      src={`${API_URL}/uploads/${post.user.profilePicture}`}
                      alt={post.user.username}
                      className="h-8 w-8 rounded-md object-cover"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.username || 'User')}`;
                        e.target.onError = null;
                      }}
                    />
                    <span className="ml-2 font-medium text-white text-sm">{post.user?.username}</span>
                  </Link>
                </div>

                {/* Post Menu */}
                <div className="relative">
                  <button 
                    onClick={() => togglePostMenu(post._id)}
                    className="text-white hover:text-white/80"
                  >
                    <MoreHorizontalRegular className="w-6 h-6" />
                  </button>
                  
                  {activePostMenu === post._id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-20 py-1">
                      {post.user._id === user.id ? (
                        <>
                          <button
                            onClick={() => handleEditCaption(post._id)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                          >
                            <EditRegular className="w-5 h-5 mr-2" />
                            Edit Caption
                          </button>
                          <button
                            onClick={() => handleDeletePost(post._id)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 flex items-center"
                          >
                            <DeleteRegular className="w-5 h-5 mr-2" />
                            Delete Post
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleReportPost(post._id)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 flex items-center"
                        >
                          <FlagRegular className="w-5 h-5 mr-2" />
                          Report Post
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Media Content */}
              <Link to={`/post/${post._id}`}>
                {post.mediaType === 'video' ? (
                  <video
                    src={post.media}
                    controls
                    className="w-full h-auto"
                  />
                ) : (
                  <img
                    src={post.media}
                    alt="Post content"
                    className="w-full h-auto"
                    onError={handleImageError}
                  />
                )}
              </Link>

              {/* Bottom Action Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent">
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-white">
                  <div className="flex space-x-4">
                    <button onClick={() => handleLike(post._id)} className="hover:scale-110 transition-transform">
                      {post.liked ? (
                        <HeartFilled className="w-6 h-6 text-red-500" />
                      ) : (
                        <HeartRegular className="w-6 h-6" />
                      )}
                    </button>
                    <button 
                      onClick={() => toggleComments(post._id)}
                      className="hover:scale-110 transition-transform"
                    >
                      <PanelTopExpandFilled className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => handleShare(post._id)} 
                      className="hover:scale-110 transition-transform"
                    >
                      <ShareRegular className="w-6 h-6" />
                    </button>
                  </div>
                  <button 
                    onClick={() => handleSave(post._id)}
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
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-80">
            <h3 className="text-lg font-semibold mb-4">Share Post</h3>
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
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded"
              >
                Copy Link
              </button>
              <button 
                onClick={() => setShowShareModal(false)}
                className="w-full px-4 py-2 bg-gray-100 rounded"
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
