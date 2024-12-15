import React, { useState } from 'react';
import {
  DismissRegular,
  HeartRegular,
  HeartFilled,
  SendRegular
} from '@fluentui/react-icons';

const CommentModal = ({ post, onClose, onAddComment, onLikeComment }) => {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(post.id, newComment);
      setNewComment('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex">
        {/* Image Section */}
        <div className="w-1/2 bg-black flex items-center justify-center">
          <img
            src={post.image}
            alt={post.caption}
            className="max-w-full max-h-[90vh] object-contain"
          />
        </div>

        {/* Comments Section */}
        <div className="w-1/2 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center">
              <img
                src={post.user.profilePicture}
                alt={post.user.username}
                className="w-8 h-8 rounded-full"
              />
              <span className="ml-3 font-semibold">{post.user.username}</span>
            </div>
            <button onClick={onClose}>
              <DismissRegular className="w-6 h-6" />
            </button>
          </div>

          {/* Comments */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Original Caption */}
            <div className="flex items-start mb-4">
              <img
                src={post.user.profilePicture}
                alt={post.user.username}
                className="w-8 h-8 rounded-full mr-3"
              />
              <div>
                <span className="font-semibold mr-2">{post.user.username}</span>
                {post.caption}
              </div>
            </div>

            {/* Comments List */}
            {post.comments.map((comment) => (
              <div key={comment.id} className="flex items-start mb-4">
                <img
                  src="/api/placeholder/32/32"
                  alt={comment.username}
                  className="w-8 h-8 rounded-full mr-3"
                />
                <div className="flex-1">
                  <div>
                    <span className="font-semibold mr-2">{comment.username}</span>
                    {comment.text}
                  </div>
                  <div className="flex items-center mt-1 text-xs text-gray-500">
                    <span>2d</span>
                    <button className="ml-2">Reply</button>
                    {comment.likes > 0 && (
                      <span className="ml-2">{comment.likes} likes</span>
                    )}
                  </div>
                </div>
                <button onClick={() => onLikeComment(comment.id)}>
                  {comment.liked ? (
                    <HeartFilled className="w-4 h-4 text-red-500" />
                  ) : (
                    <HeartRegular className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Comment Input */}
          <form onSubmit={handleSubmit} className="border-t p-4">
            <div className="flex items-center">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 outline-none"
              />
              <button 
                type="submit"
                disabled={!newComment.trim()}
                className="ml-2"
              >
                <SendRegular className="w-6 h-6 text-blue-500" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;