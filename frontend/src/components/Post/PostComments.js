import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PostComments.module.css';
import { ThemeContext } from '../../App';  
import { 
  HeartRegular, 
  HeartFilled,
  DeleteRegular
} from '@fluentui/react-icons';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';

const PostComments = ({ post, isOpen, onComment, onReply }) => {
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth();
  const commentsListRef = useRef(null);
  const [activeCommentMenu, setActiveCommentMenu] = useState(null);
  const [optimisticComments, setOptimisticComments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedComment = newComment.trim();
    if (!trimmedComment || !post?._id || isSubmitting) return;

    setIsSubmitting(true);

    // Create optimistic comment
    const optimisticComment = {
      _id: Date.now().toString(), // Temporary ID
      text: trimmedComment,
      user: {
        _id: user.id,
        username: user.username,
        profilePicture: user.profilePicture
      },
      likes: [],
      replies: [],
      isOptimistic: true
    };

    try {
      if (replyTo?._id) {
        // Add optimistic reply
        const updatedComments = post.comments.map(comment => {
          if (comment._id === replyTo._id) {
            return {
              ...comment,
              replies: [...(comment.replies || []), optimisticComment]
            };
          }
          return comment;
        });
        setOptimisticComments(updatedComments);

        const response = await fetch(`${API_URL}/api/posts/${post._id}/comments/${replyTo._id}/replies`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ text: trimmedComment })
        });

        if (!response.ok) throw new Error('Failed to add reply');
        const updatedPost = await response.json();
        onReply?.(updatedPost);
        setReplyTo(null);
      } else {
        // Add optimistic comment
        const newComments = [...(post.comments || []), optimisticComment];
        setOptimisticComments(newComments);

        const response = await fetch(`${API_URL}/api/posts/${post._id}/comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ text: trimmedComment })
        });

        if (!response.ok) throw new Error('Failed to add comment');
        const updatedPost = await response.json();
        // Only update if the response is successful
        onComment?.(updatedPost);
      }
      setNewComment('');
    } catch (error) {
      console.error('Error submitting comment/reply:', error);
      // Revert to original comments on error
      setOptimisticComments(post.comments || []);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const response = await fetch(`${API_URL}/api/posts/${post._id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete comment');
      const updatedPost = await response.json();
      onComment?.(updatedPost);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleDeleteReply = async (commentId, replyId) => {
    try {
      const response = await fetch(`${API_URL}/api/posts/${post._id}/comments/${commentId}/replies/${replyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete reply');
      const updatedPost = await response.json();
      onComment?.(updatedPost);
    } catch (error) {
      console.error('Error deleting reply:', error);
    }
  };

  const handleReply = (comment) => {
    if (!comment?.user?._id || !user?.id || comment.user._id === user.id) return;
    setReplyTo(comment);
  };

  const [isLikingComment, setIsLikingComment] = useState({});
  const [previousComments, setPreviousComments] = useState(post?.comments || []);

  // Keep previousComments in sync with post updates
  useEffect(() => {
    setPreviousComments(post?.comments || []);
  }, [post?.comments]);

  const handleLikeComment = async (commentId, isReply = false, parentCommentId = null) => {
    // Prevent multiple simultaneous likes on the same comment
    const likeKey = isReply ? `${parentCommentId}-${commentId}` : commentId;
    if (isLikingComment[likeKey]) return;
    
    try {
      setIsLikingComment(prev => ({ ...prev, [likeKey]: true }));

      // Optimistic update
      const updatedComments = previousComments.map(comment => {
        if (isReply && comment._id === parentCommentId) {
          return {
            ...comment,
            replies: comment.replies.map(reply => {
              if (reply._id === commentId) {
                const isLiked = reply.likes?.includes(user?.id);
                return {
                  ...reply,
                  likes: isLiked
                    ? reply.likes.filter(id => id !== user?.id)
                    : [...(reply.likes || []), user?.id]
                };
              }
              return reply;
            })
          };
        } else if (!isReply && comment._id === commentId) {
          const isLiked = comment.likes?.includes(user?.id);
          return {
            ...comment,
            likes: isLiked
              ? comment.likes.filter(id => id !== user?.id)
              : [...(comment.likes || []), user?.id]
          };
        }
        return comment;
      });

      // Update UI optimistically
      onComment?.({ ...post, comments: updatedComments });

      const endpoint = isReply 
        ? `${API_URL}/api/posts/${post._id}/comments/${parentCommentId}/replies/${commentId}/like`
        : `${API_URL}/api/posts/${post._id}/comments/${commentId}/like`;
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to like comment');
      const updatedPost = await response.json();
      
      // Only update if server response is different to avoid unnecessary re-renders
      if (JSON.stringify(updatedPost.comments) !== JSON.stringify(post.comments)) {
        onComment?.(updatedPost);
        setPreviousComments(updatedPost.comments || []);
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      // Revert to previous state on error
      onComment?.({ ...post, comments: previousComments });
    } finally {
      setIsLikingComment(prev => ({ ...prev, [likeKey]: false }));
    }
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
              onClick={() => navigate(`/explore/hashtag/${word.slice(1)}`)}
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
              onClick={() => navigate(`/profile/${word.slice(1)}`)}
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeCommentMenu && !event.target.closest('.comment-menu')) {
        setActiveCommentMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeCommentMenu]);

  // Handle auto-scrolling and optimistic comments updates
  useEffect(() => {
    if (!isSubmitting) {
      setOptimisticComments(post?.comments || []);
    }
  }, [post?.comments, isSubmitting]);

  // Handle auto-scrolling when comments are opened
  useEffect(() => {
    if (isOpen && commentsListRef.current) {
      commentsListRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [isOpen]);

  if (!post) return null;

  const displayComments = optimisticComments.length > 0 ? optimisticComments : post.comments;

  return (
    <div 
      ref={commentsListRef}
      data-theme={theme}
      className={`${styles.commentsContainer} ${!isOpen ? styles.closed : ''} overflow-hidden transition-all duration-300 ease-in-out ${
        isOpen ? 'max-h-[800px]' : 'max-h-0'
      }`}>
      <div className={`pt-4 pl-4 pr-4 border-[1px] ${
        theme === 'dark-theme' 
          ? 'bg-black border-zinc-800 text-white' 
          : 'bg-white border-gray-200 text-black'
      }`}
      data-theme={theme}>
        {/* Likes count and share date */}
        <div className="flex justify-between items-center mb-4">
          <div className={`font-medium text-sm ${
            theme === 'dark-theme' ? 'text-white' : 'text-black'
          }`}>
            {post?.likes?.length || 0} likes
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
              {renderText(post.caption)}
            </span>
          </div>
        )}

        {/* Comments list with replies */}
        <div className={`${styles.commentsList} space-y-3 mb-4 max-h-[300px]`} data-theme={theme}>
          {displayComments?.map((comment) => (
            <div key={comment._id} className="space-y-2">
              {/* Main comment */}
              <div className={`flex items-start space-x-2 ${styles.comment}`} data-theme={theme}>
                <img
                  src={getProfileImageUrl(comment.user)}
                  alt={comment.user?.username || 'User'}
                  className="h-8 w-8 rounded-md object-cover"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${comment.user?.username || 'user'}&background=random`;
                  }}
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div className={`inline-block rounded-lg px-3 py-2 ${
                      theme === 'dark-theme' ? 'bg-zinc-800' : 'bg-gray-100'
                    }`}>
                      <span className="text-xs mr-2">{comment.user?.username || 'Unknown User'}</span>
                      <span className="text-xs">{renderText(comment.text)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!comment.isOptimistic && (
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
                      )}
                      {(user?.id === comment.user?._id || user?.id === post.user?._id) && !comment.isOptimistic && (
                        <button
                          onClick={() => handleDeleteComment(comment._id)}
                          className="text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <DeleteRegular className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 ml-2">
                    {comment.user?._id !== user?.id && !comment.isOptimistic && (
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
                <div key={reply._id} className={`text-xs ml-8 flex items-start space-x-2 ${styles.comment}`} data-theme={theme}>
                  <img
                    src={getProfileImageUrl(reply.user)}
                    alt={reply.user?.username || 'User'}
                    className="w-6 h-6 rounded-md text-sm"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${reply.user?.username || 'user'}&background=random`;
                    }}
                  />
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
                          {renderText(reply.text)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        {!reply.isOptimistic && (
                          <button 
                            onClick={() => handleLikeComment(reply._id, true, comment._id)}
                            className="text-gray-500 hover:text-red-500 transition-colors"
                          >
                            {reply.likes?.includes(user?.id) ? (
                              <HeartFilled className="w-4 h-4 text-red-500" />
                            ) : (
                              <HeartRegular className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        {(user?.id === reply.user?._id || user?.id === post.user?._id) && !reply.isOptimistic && (
                          <button
                            onClick={() => handleDeleteReply(comment._id, reply._id)}
                            className="text-gray-500 hover:text-red-500 transition-colors"
                          >
                            <DeleteRegular className="w-4 h-4" />
                          </button>
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
        <form onSubmit={handleSubmit} 
          className={`flex items-center relative ${styles.commentForm} ${
            theme === 'dark-theme' 
              ? 'border-t border-zinc-800' 
              : 'border-t border-gray-200'
          }`}
          data-theme={theme}>
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
            placeholder={replyTo 
              ? `Reply to ${replyTo.user?.username || 'Unknown User'}...` 
              : "Add a comment... (Use @ to mention users, # for hashtags)"
            }
            className={`text-sm flex-1 border-0 focus:ring-0 outline-none ${styles.commentInput}`}
            data-theme={theme}
            readOnly={!isOpen}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className={`${styles.postButton} ${
              newComment.trim() && !isSubmitting
                ? theme === 'dark-theme'
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-blue-500 hover:text-blue-600'
                : theme === 'dark-theme'
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PostComments;
