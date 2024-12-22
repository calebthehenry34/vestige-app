import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PostSkeleton } from '../Common/Skeleton';
import {
  HeartRegular,
  HeartFilled,
  CommentRegular,
  ShareRegular,
  BookmarkRegular,
  BookmarkFilled,
} from '@fluentui/react-icons';
import axios from 'axios';
import { API_URL } from '../../config';
import PostCreator from '../Post/PostCreator';
import PostComments from '../Post/PostComments';
import { useAuth } from '../../context/AuthContext';

const Feed = ({ onStoryClick, onRefreshNeeded }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showComments, setShowComments] = useState({});
  const [showPostCreator, setShowPostCreator] = useState(false);

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
    return (
      <div className="max-w-xl mx-auto py-2 space-y-6">
        {[...Array(3)].map((_, index) => (
          <PostSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-2">
      {/* Post Creator Modal */}
      <PostCreator
        isOpen={showPostCreator}
        onClose={() => setShowPostCreator(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Posts */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post._id} className="bg-[#1a1a1a] rounded-lg shadow relative">
            {/* Clickable overlay for entire post */}
            <div 
              onClick={() => navigate(`/post/${post._id}`)}
              className="absolute inset-0 cursor-pointer z-0"
            />
            {/* Post Header */}
            <div className="flex items-center p-4">
              <img
                src={post.user.profilePicture}
                alt={post.user.username}
                className="h-10 w-10 rounded-full object-cover cursor-pointer relative z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${post.user.username}`);
                }}
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.username)}`;
                }}
              />
              <span 
                className="ml-3 font-medium text-white cursor-pointer relative z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${post.user.username}`);
                }}
              >
                {post.user.username}
              </span>
            </div>

            {/* Post Image */}
            <div className="relative">
              <img 
                src={post.media}
                alt={post.caption}
                className="w-full object-cover"
              />
            </div>

            {/* Post Actions */}
            <div className="p-4">
              <div className="flex justify-between mb-2">
                <div className="flex space-x-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(post._id);
                    }}
                    className="text-white hover:text-[#ae52e3] transition-colors relative z-10"
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
                    className="text-white hover:text-[#ae52e3] transition-colors relative z-10"
                  >
                    <CommentRegular className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(post);
                    }}
                    className="text-white hover:text-[#ae52e3] transition-colors relative z-10"
                  >
                    <ShareRegular className="w-6 h-6" />
                  </button>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave(post._id);
                  }}
                  className="text-white hover:text-[#ae52e3] transition-colors relative z-10"
                >
                  {post.saved ? (
                    <BookmarkFilled className="w-6 h-6" />
                  ) : (
                    <BookmarkRegular className="w-6 h-6" />
                  )}
                </button>
              </div>

              <div className="font-semibold text-white mb-2">{post.likes?.length || 0} likes</div>

              {/* Caption */}
              <div className="text-white">
                <span 
                  className="font-semibold mr-2 cursor-pointer relative z-10"
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
  );
};

export default Feed;
