import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PostSkeleton } from '../Common/Skeleton';
import Post from '../Post/post';
import axios from 'axios';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';
import PostCreator from '../Post/PostCreator';
import PostComments from '../Post/PostComments';
import { useAuth } from '../../context/AuthContext';
import MobileNav from '../Navigation/MobileNav';

const Feed = ({ onStoryClick, onRefreshNeeded }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showComments, setShowComments] = useState({});
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [showMobileNav, setShowMobileNav] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      
      // Show nav when scrolling up, hide when scrolling down
      if (currentScrollY > lastScrollY.current && currentScrollY > 10) {
        setShowMobileNav(false);
      } else {
        setShowMobileNav(true);
      }
      
      // Update CSS variable for scroll position
      document.documentElement.style.setProperty('--scroll-y', currentScrollY);
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const handleDelete = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setPosts(posts.filter(post => post._id !== postId));
      }
    } catch (error) {
      console.error('Error deleting post:', error);
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
    return <PostSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    );
  }

  return (
    <>
      <div className="max-w-xl mx-auto relative z-[5]">
        {/* Post Creator Modal */}
        <PostCreator
          isOpen={showPostCreator}
          onClose={() => setShowPostCreator(false)}
          onPostCreated={handlePostCreated}
        />

        {/* Posts */}
        <div className="space-y-0">
          {posts.map((post) => (
            <Post
              key={post._id}
              post={post}
              onDelete={handleDelete}
              onReport={() => {}}
              onEdit={() => {}}
            />
          ))}
        </div>
      </div>
      <MobileNav 
        visible={showMobileNav} 
        onPostCreatorClick={() => setShowPostCreator(true)}
      />
    </>
  );
};

export default Feed;
