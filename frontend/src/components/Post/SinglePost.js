import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../App';
import { 
  HeartRegular, 
  HeartFilled, 
  ShareRegular, 
  BookmarkRegular, 
  BookmarkFilled, 
  DismissRegular,
  PersonRegular 
} from '@fluentui/react-icons';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';

const SinglePost = () => {
  const { theme } = useContext(ThemeContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);
  const [showAllComments, setShowAllComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const visibleComments = post?.comments 
    ? showAllComments 
      ? post.comments 
      : post.comments.slice(0, 3)
    : [];

  const getMediaUrl = (mediaPath) => {
    if (!mediaPath) return '';
    return mediaPath.startsWith('http') 
      ? mediaPath 
      : `${API_URL}/uploads/${mediaPath}`;
  };
  
  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/posts/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch post');
        }

        const data = await response.json();
        setPost(data);
      } catch (error) {
        console.error('Error fetching post:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handleCommentLike = async (commentId) => {
    if (!commentId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts/${id}/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
  
      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };
  
  const handleCommentReply = async (commentId, replyText) => {
    if (!commentId || !replyText?.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/posts/${id}/comments/${commentId}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ text: replyText })
      });
  
      if (!response.ok) throw new Error('Failed to add reply');
  
      const postResponse = await fetch(`${API_URL}/api/posts/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include'
      });
  
      if (!postResponse.ok) throw new Error('Failed to fetch updated post');
  
      const updatedPost = await postResponse.json();
      setPost(updatedPost);
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const handleLike = async () => {
    if (!id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts/${id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts/${id}/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        setPost(prev => ({ ...prev, saved: result.saved }));
      }
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !id) return;
  
    try {
      const response = await fetch(`${API_URL}/api/posts/${id}/comment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ text: newComment })
      });
  
      if (!response.ok) throw new Error('Failed to add comment');
  
      const updatedPost = await response.json();
      if (!updatedPost?.media) {
        const fullPostResponse = await fetch(`${API_URL}/api/posts/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          credentials: 'include'
        });
        if (fullPostResponse.ok) {
          const fullPost = await fullPostResponse.json();
          setPost(fullPost);
        } else {
          setPost(prev => ({ ...prev, comments: updatedPost.comments }));
        }
      } else {
        setPost(updatedPost);
      }
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'Check out this post',
        url: window.location.href
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${
        theme === 'dark-theme' ? 'bg-black' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={`w-full h-screen flex items-center justify-center ${
        theme === 'dark-theme' ? 'bg-black' : 'bg-gray-50'
      }`}>
        <div className="text-red-500">Error loading post</div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col ${
      theme === 'dark-theme' ? 'bg-black' : 'bg-white'
    }`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className={`p-4 flex justify-between items-center border-b ${
          theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <div className="flex items-center">
            {post.user ? (
              <img
                src={getProfileImageUrl(post.user.profilePicture, post.user.username)}
                alt={post.user.username}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                <PersonRegular className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <span className={`ml-3 font-medium ${
              theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
            }`}>{post.user?.username || 'Unknown User'}</span>
          </div>
          <button 
            onClick={() => navigate(-1)} 
            className={`hover:bg-gray-100 p-2 rounded-full transition-colors ${
              theme === 'dark-theme' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <DismissRegular className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* Media Section */}
          <div className="w-full md:w-7/12 bg-black relative flex items-center justify-center">
            {post.mediaType === 'video' ? (
              <video
                src={getMediaUrl(post.media)}
                controls
                className="w-full h-auto max-h-[calc(100vh-10rem)] object-contain"
                onError={(e) => {
                  console.error('Video load error:', post.media);
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div 
                className={`relative ${isZoomed ? 'cursor-move' : 'cursor-zoom-in'}`}
                onClick={() => !isZoomed && setIsZoomed(true)}
                onMouseDown={e => {
                  if (isZoomed) {
                    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y });
                  }
                }}
                onMouseMove={e => {
                  if (dragStart && isZoomed) {
                    setImagePosition({
                      x: e.clientX - dragStart.x,
                      y: e.clientY - dragStart.y
                    });
                  }
                }}
                onMouseUp={() => setDragStart(null)}
                onMouseLeave={() => setDragStart(null)}
                onDoubleClick={() => setIsZoomed(false)}
              >
                <img
                  src={getMediaUrl(post.media)}
                  alt="Post content"
                  className={`transition-transform duration-300 ${
                    isZoomed 
                      ? 'scale-200 cursor-move'
                      : 'scale-100 cursor-zoom-in'
                  }`}
                  style={isZoomed ? {
                    transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(2)`,
                  } : {}}
                  onError={(e) => {
                    console.error('Image load error:', post.media);
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Comments & Actions Section */}
          <div className="w-full md:w-5/12 flex flex-col min-h-0">
            {/* Actions Bar */}
            <div className={`shrink-0 border-b ${
              theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <div className="p-4">
                <div className="flex justify-between mb-1">
                  <div className="flex space-x-4">
                    <button onClick={handleLike} className={`hover:opacity-70 transition-opacity ${
                      theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}`}>
                      {post.likes?.includes(user?.id) ? (
                        <HeartFilled className="w-6 h-6 text-red-500" />
                      ) : (
                        <HeartRegular className="w-6 h-6" />
                      )}
                    </button>
                    <button onClick={handleShare}
                      className={`hover:opacity-70 transition-opacity ${
                        theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}`}>
                      <ShareRegular className="w-6 h-6" />
                    </button>
                  </div>
                  <button onClick={handleSave}
                    className={`hover:opacity-70 transition-opacity ${
                      theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}`}>
                    {post.saved ? (
                      <BookmarkFilled className="w-6 h-6" />
                    ) : (
                      <BookmarkRegular className="w-6 h-6" />
                    )}
                  </button>
                </div>
                <div className={`font-bold text-sm ${
                  theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}`}>
                  {post.likes?.length || 0} Likes
                </div>
              </div>
            </div>

            {/* Caption */}
            <div className={`shrink-0 p-4 pt-0 border-b ${
              theme === 'dark-theme' ? 'border-gray-800 text-white' : 'border-gray-200'
            }`}>
              <p>
                <span className="font-medium mr-2">{post.user?.username || 'Unknown User'}</span>
                {post.caption}
              </p>
            </div>

            {/* Comments section */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                {visibleComments.map((comment) => (
                  <div key={comment._id} className="mb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1">
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
                        <div className="ml-3 flex-1">
                          <span className={`font-medium ${
                            theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
                          }`}>{comment.user?.username || 'Unknown User'}</span>
                          <p className={`text-sm ${
                            theme === 'dark-theme' ? 'text-gray-300' : 'text-gray-700'
                          }`}>{comment.text}</p>
                          <div className="flex items-center mt-1 space-x-4">
                            <button 
                              onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                              className={`text-sm ${
                                theme === 'dark-theme' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                              }`}
                            >
                              Reply
                            </button>
                            <span className="text-xs text-gray-400">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          {/* Replies section */}
                          {showAllComments && (
                            <>
                              {replyingTo === comment._id && (
                                <form 
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    handleCommentReply(comment._id, replyText);
                                  }}
                                  className="mt-2 flex items-center"
                                >
                                  <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder={`Reply to ${comment.user?.username || 'Unknown User'}...`}
                                    className={`flex-1 text-sm py-1 px-2 rounded-lg border ${
                                      theme === 'dark-theme'
                                        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                                    }`}
                                    autoFocus
                                  />
                                  <button
                                    type="submit"
                                    disabled={!replyText.trim()}
                                    className={`ml-2 text-sm font-semibold ${
                                      replyText.trim()
                                        ? 'text-blue-500 hover:text-blue-600'
                                        : 'text-gray-400 cursor-not-allowed'
                                    }`}
                                  >
                                    Reply
                                  </button>
                                </form>
                              )}

                              {comment.replies?.length > 0 && (
                                <div className="ml-8 mt-2 space-y-2">
                                  {comment.replies.map((reply) => (
                                    <div key={reply._id} className="flex items-start justify-between">
                                      <div className="flex items-start flex-1">
                                        {reply.user ? (
                                          <img
                                            src={getProfileImageUrl(reply.user.profilePicture, reply.user.username)}
                                            alt={reply.user.username}
                                            className="h-6 w-6 rounded-full object-cover"
                                          />
                                        ) : (
                                          <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                                            <PersonRegular className="w-4 h-4 text-gray-400" />
                                          </div>
                                        )}
                                        <div className="ml-2">
                                          <span className={`font-medium ${
                                            theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
                                          }`}>{reply.user?.username || 'Unknown User'}</span>
                                          <p className={`text-sm ${
                                            theme === 'dark-theme' ? 'text-gray-300' : 'text-gray-700'
                                          }`}>{reply.text}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleCommentLike(comment._id)}
                        className="ml-2 flex items-center"
                      >
                        {comment.likes?.includes(user?.id) ? (
                          <HeartFilled className="w-4 h-4 text-red-500" />
                        ) : (
                          <HeartRegular className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        )}
                        {comment.likes?.length > 0 && (
                          <span className="ml-1 text-xs text-gray-500">{comment.likes.length}</span>
                        )}
                      </button>
                    </div>
                  </div>
                ))}

                {post?.comments?.length > 3 && !showAllComments && (
                  <button
                    onClick={() => setShowAllComments(true)}
                    className={`text-sm font-medium ${
                      theme === 'dark-theme' 
                        ? 'text-gray-400 hover:text-white' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    View all {post.comments.length} comments
                  </button>
                )}
              </div>
            </div>

            {/* Comment Input */}
            <div className={`shrink-0 border-t mt-auto ${
              theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <form onSubmit={handleComment} className="p-4">
                <div className="flex items-center">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className={`flex-1 text-sm border-0 focus:ring-0 outline-none ${
                      theme === 'dark-theme' 
                        ? 'bg-gray-900 text-white placeholder-gray-500' 
                        : 'bg-white text-gray-900 placeholder-gray-400'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className={`ml-2 text-sm font-semibold ${
                      newComment.trim() 
                        ? theme === 'dark-theme'
                          ? 'text-blue-400 hover:text-blue-300'
                          : 'text-blue-500 hover:text-blue-600'
                        : `${theme === 'dark-theme' ? 'text-gray-600' : 'text-gray-400'} cursor-not-allowed`
                    }`}
                  >
                    Post
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SinglePost;
