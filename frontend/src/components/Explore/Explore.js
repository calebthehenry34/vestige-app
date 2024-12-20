import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ChatRegular, HeartRegular } from '@fluentui/react-icons';
import UserSuggestions from './UserSuggestions';
import { ThemeContext } from '../../App';
import { API_URL } from '../../config';

const Explore = () => {
  const { theme } = useContext(ThemeContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchExplorePosts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching explore posts with token:', token ? 'Present' : 'Missing');
  
      const response = await fetch(`${API_URL}/api/posts/explore`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
  
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Received explore data:', data);
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch explore posts');
      }
  
      // Check if data has a posts property
      const postsArray = data.posts || data;
      setPosts(Array.isArray(postsArray) ? postsArray : []);
      setError(null);
  
    } catch (error) {
      console.error('Error fetching explore posts:', error);
      setError(error.message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExplorePosts();
  }, [fetchExplorePosts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!posts.length) {
    return (
      <div className={`min-h-screen bg-gray-50 px-4 flex items-center justify-center ${
        theme === 'dark-theme' ? 'bg-black' : 'bg-gray-50'
      } px-4`}>
        <div className="text-gray-500">No posts to explore yet.</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen m-50 mb-50 p-10 ${
      theme === 'dark-theme' ? 'bg-gray-900' : 'bg-gray-50'
    } px-4`}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <UserSuggestions />
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-3 gap-1 md:grid-cols-2 lg:grid-cols-3 md:gap-4">
          {posts.map((post) => (
            <Link 
              key={post._id} 
              to={`/post/${post._id}`}
              className={`relative aspect-square group overflow-hidden rounded-lg ${
                theme === 'dark-theme' ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              {post.mediaType === 'video' ? (
                <div className="w-full h-full bg-black rounded-lg overflow-hidden">
                  <video
                    src={post.media.startsWith('http') 
                      ? post.media 
                      : API_URL + '/uploads/' + post.media}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <img
                  src={post.media.startsWith('http') 
                    ? post.media 
                    : API_URL + '/uploads/' + post.media}
                  alt=""
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => {
                    console.log('Image load error:', post.media);
                    e.target.src = `https://ui-avatars.com/api/?name=Post&size=400`;
                  }}
                />
              )}
              
              {/* Hover Overlay - Hidden on mobile */}
              <div className="opacity-0 group-hover:opacity-100 absolute inset-0 bg-black/50 hidden md:flex items-center justify-center space-x-6 transition-opacity rounded-lg">
                <div className="flex items-center text-white">
                  <HeartRegular className="w-6 h-6 mr-2" />
                  <span className="font-semibold">{post.likes?.length || 0}</span>
                </div>
                <div className="flex items-center text-white">
                  <ChatRegular className="w-6 h-6 mr-2" />
                  <span className="font-semibold">{post.comments?.length || 0}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Explore;
