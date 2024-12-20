import React, { useState, useEffect, useCallback } from 'react';
import {
  HeartRegular,
  HeartFilled,
  ChatRegular,
  SendRegular,
  BookmarkRegular,
  BookmarkFilled,
  ImageRegular,
} from '@fluentui/react-icons';
import axios from 'axios';
import { API_URL } from '../../config';
import PostCreator from '../Post/PostCreator';

const CommentSection = ({ post, onAddComment }) => {
  const [commentText, setCommentText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment(commentText);
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

  // Expose refresh method to parent
  useEffect(() => {
    if (onRefreshNeeded) {
      onRefreshNeeded(fetchPosts);
    }
  }, [onRefreshNeeded, fetchPosts]);

  const handlePostCreated = async (newPost) => {
    await fetchPosts(); // Refresh the feed
    setShowPostCreator(false); // Close the creator
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
      {/* Create Post Button */}
      <button
        onClick={() => setShowPostCreator(true)}
        className="w-full mb-6 p-4 rounded-lg border border-gray-800 bg-[#1a1a1a] hover:border-[#ae52e3] transition-colors flex items-center justify-center gap-2 text-white"
      >
        <ImageRegular className="w-6 h-6" />
        <span>Create New Post</span>
      </button>

      {/* Post Creator Modal */}
      <PostCreator
        isOpen={showPostCreator}
        onClose={() => setShowPostCreator(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Posts */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post._id} className="bg-[#1a1a1a] rounded-lg shadow">
            {/* Post Header */}
            <div className="flex items-center p-4">
              <img
                src={post.user.profilePicture}
                alt={post.user.username}
                className="h-10 w-10 rounded-full object-cover"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.username)}`;
                }}
              />
              <span className="ml-3 font-medium text-white">{post.user.username}</span>
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
                  <button className="text-white hover:text-[#ae52e3] transition-colors">
                    <HeartRegular className="w-6 h-6" />
                  </button>
                  <button className="text-white hover:text-[#ae52e3] transition-colors">
                    <ChatRegular className="w-6 h-6" />
                  </button>
                  <button className="text-white hover:text-[#ae52e3] transition-colors">
                    <SendRegular className="w-6 h-6" />
                  </button>
                </div>
                <button className="text-white hover:text-[#ae52e3] transition-colors">
                  <BookmarkRegular className="w-6 h-6" />
                </button>
              </div>

              <div className="font-semibold text-white mb-2">{post.likes?.length || 0} likes</div>

              {/* Caption */}
              <div className="text-white">
                <span className="font-semibold mr-2">{post.user.username}</span>
                {post.caption}
              </div>

              {/* Comments */}
              {post.comments && post.comments.length > 0 && (
                <div className="mt-2 text-gray-400">
                  <button onClick={() => setShowComments(prev => ({ ...prev, [post._id]: !prev[post._id] }))}>
                    View all {post.comments.length} comments
                  </button>
                  {showComments[post._id] && (
                    <div className="mt-2 space-y-2">
                      {post.comments.map(comment => (
                        <div key={comment._id} className="text-white">
                          <span className="font-semibold mr-2">{comment.user.username}</span>
                          {comment.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Add Comment */}
              <CommentSection post={post} onAddComment={(text) => console.log('Comment:', text)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Feed;
