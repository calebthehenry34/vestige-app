import React, { useState, useEffect, useCallback } from 'react';
import {
  HeartRegular,
  HeartFilled,
  ChatRegular,
  SendRegular,
  BookmarkRegular,
  BookmarkFilled,
} from '@fluentui/react-icons';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../config';

const CommentSection = ({ post, onAddComment }) => {
  const [commentText, setCommentText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment(post.id, commentText);
      setCommentText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex items-center border-t pt-4">
      <input
        type="text"
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="Add a comment..."
        className="flex-1 outline-none bg-transparent text-white placeholder-gray-400"
      />
      <button 
        type="submit" 
        className="text-[#ae52e3] font-semibold ml-2 disabled:opacity-50"
        disabled={!commentText.trim()}
      >
        Post
      </button>
    </form>
  );
};

const Feed = ({ onStoryClick, onRefreshNeeded }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showComments, setShowComments] = useState({});

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

  // Expose refresh method to parent
  useEffect(() => {
    if (onRefreshNeeded) {
      onRefreshNeeded(fetchPosts);
    }
  }, [onRefreshNeeded, fetchPosts]);

  const toggleLike = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/posts/${postId}/like`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setPosts(posts.map(post => {
        if (post._id === postId) {
          const isLiked = post.likes.includes(localStorage.getItem('userId'));
          return {
            ...post,
            likes: isLiked 
              ? post.likes.filter(id => id !== localStorage.getItem('userId'))
              : [...post.likes, localStorage.getItem('userId')]
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const toggleSave = (postId) => {
    setPosts(posts.map(post => {
      if (post._id === postId) {
        return {
          ...post,
          saved: !post.saved
        };
      }
      return post;
    }));
  };

  const toggleComments = (postId) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const addComment = async (postId, commentText) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/posts/${postId}/comments`, {
        text: commentText
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setPosts(posts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            comments: [...post.comments, response.data]
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ae52e3]"></div>
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
    <div className="max-w-xl mx-auto py-8">
      {/* Stories Section */}
      <div className="bg-[#1a1a1a] rounded-lg shadow mb-6 p-4 overflow-x-auto">
        <div className="flex space-x-4">
          {[1, 2, 3, 4, 5].map((story) => (
            <div 
              key={story} 
              className="flex-shrink-0 cursor-pointer"
              onClick={() => onStoryClick?.(story - 1)}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#ae52e3] to-[#685ee7] p-0.5">
                <div className="w-full h-full rounded-full border-2 border-[#1a1a1a]">
                  <img
                    src={`https://picsum.photos/64/64?random=${story}`}
                    alt={`Story ${story}`}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post._id} className="bg-[#1a1a1a] rounded-lg shadow">
            {/* Post Header */}
            <div className="flex items-center p-4">
              <Link to={`/profile/${post.user.username}`} className="flex items-center">
                <img
                  src={post.user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.username)}`}
                  alt={post.user.username}
                  className="h-10 w-10 rounded-full object-cover"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.username)}`;
                    e.target.onError = null;
                  }}
                />
                <span className="ml-3 font-medium text-white">{post.user.username}</span>
              </Link>
            </div>

            {/* Post Image */}
            <div className="relative">
              <img 
                src={post.media}
                alt={post.caption}
                className="w-full object-cover"
                onDoubleClick={() => toggleLike(post._id)}
              />
            </div>

            {/* Post Actions */}
            <div className="p-4">
              <div className="flex justify-between mb-2">
                <div className="flex space-x-4">
                  <button onClick={() => toggleLike(post._id)}>
                    {post.likes.includes(localStorage.getItem('userId')) ? (
                      <HeartFilled className="w-6 h-6 text-red-500" />
                    ) : (
                      <HeartRegular className="w-6 h-6 text-white" />
                    )}
                  </button>
                  <button onClick={() => toggleComments(post._id)}>
                    <ChatRegular className="w-6 h-6 text-white" />
                  </button>
                  <button>
                    <SendRegular className="w-6 h-6 text-white" />
                  </button>
                </div>
                <button onClick={() => toggleSave(post._id)}>
                  {post.saved ? (
                    <BookmarkFilled className="w-6 h-6 text-[#ae52e3]" />
                  ) : (
                    <BookmarkRegular className="w-6 h-6 text-white" />
                  )}
                </button>
              </div>

              <div className="font-semibold mb-2 text-white">{post.likes.length} likes</div>

              {/* Caption */}
              <div className="text-white">
                <span className="font-semibold mr-2">{post.user.username}</span>
                {post.caption}
              </div>

              {/* Comments */}
              {(showComments[post._id] || (post.comments && post.comments.length < 3)) && (
                <div className="mt-2 text-white">
                  {post.comments && post.comments.map((comment) => (
                    <div key={comment._id} className="mt-1">
                      <span className="font-semibold mr-2">{comment.user.username}</span>
                      {comment.text}
                    </div>
                  ))}
                </div>
              )}

              {post.comments && post.comments.length >= 3 && !showComments[post._id] && (
                <button
                  className="text-gray-400 mt-2"
                  onClick={() => toggleComments(post._id)}
                >
                  View all {post.comments.length} comments
                </button>
              )}

              {/* Timestamp */}
              <div className="text-gray-400 text-xs mt-2">
                {new Date(post.createdAt).toLocaleDateString()}
              </div>

              {/* Comment Input */}
              <CommentSection post={post} onAddComment={addComment} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Feed;
