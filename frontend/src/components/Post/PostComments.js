import React, { useState, useEffect, useContext } from 'react';
import styles from './PostComments.module.css';
import { ThemeContext } from '../../App';  
import { 
  HeartRegular, 
  HeartFilled,
  MoreVerticalRegular,
  PersonRegular
} from '@fluentui/react-icons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';

const PostComments = ({ post, isOpen, onComment, onReply }) => {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth();
  const [activeCommentMenu, setActiveCommentMenu] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedComment = newComment.trim();
    if (!trimmedComment || !post?._id) return;

    try {
      if (replyTo?._id) {
        await onReply?.(post._id, replyTo._id, trimmedComment);
        setReplyTo(null);
      } else {
        await onComment?.(trimmedComment);
      }
      setNewComment('');
    } catch (error) {
      console.error('Error submitting comment/reply:', error);
    }
  };

  const handleReply = (comment) => {
    if (!comment?.user?._id || !user?.id || comment.user._id === user.id) return;
    setReplyTo(comment);
    const input = document.querySelector('input[name="comment"]');
    if (input) input.focus();
  };

  const handleCommentMenu = (commentId) => {
    setActiveCommentMenu(activeCommentMenu === commentId ? null : commentId);
  };

  const handleLikeComment = async (commentId) => {
    if (!commentId) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token');

      const response = await fetch(`${API_URL}/api/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to like comment');
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeCommentMenu && !event.target.closest('.comment-menu')) {
        setActiveCommentMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeCommentMenu]);

  if (!post) return null;

  return (
    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
      isOpen ? 'max-h-[800px]' : 'max-h-0'
    }`}>
      <div className={`pt-4 pl-4 pr-4 border-[1px] ${
        theme === 'dark-theme' 
          ? 'bg-black border-zinc-800 text-white' 
          : 'bg-white border-gray-200 text-black'
      }`}>
        {/* Likes count and share date */}
        <div className="flex justify-between items-center mb-4">
          <div className={`font-medium text-sm ${
            theme === 'dark-theme' ? 'text-white' : 'text-black'
          }`}>
            {post.likes?.length || 0} likes
          </div>
          <div className={`text-xs flex items-center space-x-2 ${
            theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <span>
              {new Date(post.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
            {post.location && (
              <>
                <span>•</span>
                <span>{post.location}</span>
              </>
            )}
          </div>
        </div>

        {/* Caption */}
        {post.caption && post.user && (
          <div className="mb-3">
            <span className={`font-medium mr-2 text-sm ${
              theme === 'dark-theme' ? 'text-white' : 'text-black'
            }`}>
              {post.user.username}
            </span>
            <span className={`text-sm ${
              theme === 'dark-theme' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {post.caption}
            </span>
          </div>
        )}

        {/* Comments list with replies */}
        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
          {post.comments?.map((comment) => (
            <div key={comment._id} className="space-y-2">
              {/* Main comment */}
              <div className="flex items-start space-x-2">
                {comment.user ? (
                  <img
                    src={getProfileImageUrl(comment.user.profilePicture, comment.user.username)}
                    alt={comment.user.username}
                    className="h-8 w-8 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-md bg-gray-200 flex items-center justify-center">
                    <PersonRegular className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div className={`inline-block rounded-lg px-3 py-2 ${
                      theme === 'dark-theme' ? 'bg-zinc-800' : 'bg-gray-100'
                    }`}>
                      <span className="text-xs mr-2">{comment.user?.username || 'Unknown User'}</span>
                      <span className="text-xs">{comment.text}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleLikeComment(comment._id)}
                        className="text-gray-500 hover:text-red-500 transition-colors"
                      >
                        {comment.likes?.includes(user?.id) ? (
                          <HeartFilled className="w-4 h-4 text-red-500" />
                        ) : (
                          <HeartRegular className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 ml-2">
                    {comment.user?._id !== user?.id && (
                      <button 
                        onClick={() => handleReply(comment)}
                        className="hover:text-blue-500"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Replies */}
              {comment.replies?.map((reply) => (
                <div key={reply._id} className="text-xs ml-8 flex items-start space-x-2">
                  {reply.user ? (
                    <img
                      src={getProfileImageUrl(reply.user.profilePicture, reply.user.username)}
                      alt={reply.user.username}
                      className="w-6 h-6 rounded-md text-sm"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-md bg-gray-200 flex items-center justify-center">
                      <PersonRegular className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div className={`inline-block rounded-lg px-3 py-2 ${
                        theme === 'dark-theme' ? 'bg-zinc-800' : 'bg-gray-100'
                      }`}>
                        <span className={`mr-2 text-sm ${
                          theme === 'dark-theme' ? 'text-white' : 'text-black'
                        }`}>
                          {reply.user?.username || 'Unknown User'}
                        </span>
                        {reply.mentionedUser && (
                          <span className="text-blue-500 mr-2 text-sm">
                            @{reply.mentionedUser.username}
                          </span>
                        )}
                        <span className={
                          theme === 'dark-theme' ? 'text-gray-300' : 'text-gray-700'
                        }>
                          {reply.text}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <button 
                          onClick={() => handleLikeComment(reply._id)}
                          className="text-gray-500 hover:text-red-500 transition-colors"
                        >
                          {reply.likes?.includes(user?.id) ? (
                            <HeartFilled className="w-4 h-4 text-red-500" />
                          ) : (
                            <HeartRegular className="w-4 h-4" />
                          )}
                        </button>
                        {(user?.id === reply.user?._id || user?.isAdmin) && (
                          <div className="relative">
                            <button 
                              onClick={() => handleCommentMenu(reply._id)}
                              className={`text-gray-500 ${
                                theme === 'dark-theme' 
                                  ? 'hover:text-gray-300' 
                                  : 'hover:text-gray-700'
                              }`}
                            >
                              <MoreVerticalRegular className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Comment input */}
        <form onSubmit={handleSubmit} className={`flex items-center relative ${styles.commentForm} ${
          theme === 'dark-theme' 
            ? 'border-t border-zinc-800' 
            : 'border-t border-gray-200'
        }`}>
          {replyTo && (
            <div 
              className={`absolute -top-6 text-sm ${styles.replyBox}`}
              data-theme={theme}
            >
              <span className={
                theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-600'
              }>
                Replying to <span className="text-blue-500">@{replyTo.user?.username || 'Unknown User'}</span>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className={`flex-1 border-0 focus:ring-0 outline-none ml-2 ${
                  theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                ×
              </button>
            </div>
          )}
          <input
            type="text"
            name="comment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyTo ? `Reply to ${replyTo.user?.username || 'Unknown User'}...` : "Add a comment..."}
            className={`text-sm flex-1 border-0 focus:ring-0 outline-none ${styles.commentInput} ${
              theme === 'dark-theme' 
                ? 'text-white placeholder-gray-500 bg-black' 
                : 'text-black placeholder-gray-500 bg-white'
            }`}
          />
          <button
            type="submit"
            disabled={!newComment.trim()}
            className={`${styles.postButton} ${
              newComment.trim()
                ? theme === 'dark-theme'
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-blue-500 hover:text-blue-600'
                : theme === 'dark-theme'
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
};

export default PostComments;
