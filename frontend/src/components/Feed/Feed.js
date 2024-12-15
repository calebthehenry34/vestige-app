import React, { useState } from 'react';
import {
  HeartRegular,
  HeartFilled,
  ChatRegular,
  SendRegular,
  BookmarkRegular,
  BookmarkFilled,
} from '@fluentui/react-icons';
import { Link } from 'react-router-dom';
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
        className="flex-1 outline-none"
      />
      <button 
        type="submit" 
        className="text-blue-500 font-semibold ml-2"
        disabled={!commentText.trim()}
      >
        Post
      </button>
    </form>
  );
};

const Feed = ({ onStoryClick }) => {
  const [posts, setPosts] = useState([
    {
      id: 1,
      user: {
        id: 1,
        username: 'johndoe',
        profilePicture: '/api/placeholder/32/32'
      },
      image: '/api/placeholder/600/600',
      caption: 'Beautiful sunset 🌅',
      likes: 124,
      liked: false,
      saved: false,
      comments: [
        {
          id: 1,
          username: 'janedoe',
          text: 'Amazing shot! 📸'
        }
      ],
      createdAt: '2h'
    }
  ]);

  const [showComments, setShowComments] = useState({});

  const toggleLike = (postId) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          liked: !post.liked,
          likes: post.liked ? post.likes - 1 : post.likes + 1
        };
      }
      return post;
    }));
  };

  const toggleSave = (postId) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
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

  const addComment = (postId, commentText) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const newComment = {
          id: Date.now(),
          username: 'currentuser',
          text: commentText
        };
        return {
          ...post,
          comments: [...post.comments, newComment]
        };
      }
      return post;
    }));
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      {/* Stories Section */}
      <div className="bg-white rounded-lg shadow mb-6 p-4 overflow-x-auto">
        <div className="flex space-x-4">
          {[1, 2, 3, 4, 5].map((story) => (
            <div 
              key={story} 
              className="flex-shrink-0 cursor-pointer"
              onClick={() => onStoryClick?.(story - 1)}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-500 p-0.5">
                <div className="w-full h-full rounded-full border-2 border-white">
                  <img
                    src={`/api/placeholder/64/64`}
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
          <div key={post.id} className="bg-white rounded-lg shadow">
            {/* Post Header */}
            <div className="flex items-center p-4">
            <Link to={`/profile/${post.user.username}`} className="flex items-center">
    <img
      src={`API_URL + /uploads/${post.user.profilePicture}`}
      alt={post.user.username}
      className="h-10 w-10 rounded-full object-cover"
      onError={(e) => {
        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user.username || 'User')}`;
        e.target.onError = null;
      }}
    />
    <span className="ml-3 font-medium">{post.user.username}</span>
  </Link>
            </div>

            {/* Post Image */}
            <div className="relative">
              <img 
                src={post.image} 
                alt={post.caption}
                className="w-full"
                onDoubleClick={() => toggleLike(post.id)}
              />
            </div>

            {/* Post Actions */}
            <div className="p-4">
              <div className="flex justify-between mb-2">
                <div className="flex space-x-4">
                  <button onClick={() => toggleLike(post.id)}>
                    {post.liked ? (
                      <HeartFilled className="w-6 h-6 text-red-500" />
                    ) : (
                      <HeartRegular className="w-6 h-6" />
                    )}
                  </button>
                  <button onClick={() => toggleComments(post.id)}>
                    <ChatRegular className="w-6 h-6" />
                  </button>
                  <button>
                    <SendRegular className="w-6 h-6" />
                  </button>
                </div>
                <button onClick={() => toggleSave(post.id)}>
                  {post.saved ? (
                    <BookmarkFilled className="w-6 h-6" />
                  ) : (
                    <BookmarkRegular className="w-6 h-6" />
                  )}
                </button>
              </div>

              <div className="font-semibold mb-2">{post.likes} likes</div>

              {/* Caption */}
              <div>
                <span className="font-semibold mr-2">{post.user.username}</span>
                {post.caption}
              </div>

              {/* Comments */}
              {(showComments[post.id] || post.comments.length < 3) && (
                <div className="mt-2">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="mt-1">
                      <span className="font-semibold mr-2">{comment.username}</span>
                      {comment.text}
                    </div>
                  ))}
                </div>
              )}

              {post.comments.length >= 3 && !showComments[post.id] && (
                <button
                  className="text-gray-500 mt-2"
                  onClick={() => toggleComments(post.id)}
                >
                  View all {post.comments.length} comments
                </button>
              )}

              {/* Timestamp */}
              <div className="text-gray-400 text-xs mt-2">
                {post.createdAt}
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