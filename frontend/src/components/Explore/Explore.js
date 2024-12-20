import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChatRegular, HeartRegular, SearchRegular } from '@fluentui/react-icons';
import UserSuggestions from './UserSuggestions';
import { ThemeContext } from '../../App';
import { API_URL } from '../../config';

const Explore = () => {
  const { theme } = useContext(ThemeContext);
  const { hashtag } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(hashtag ? 'hashtags' : 'posts');
  const [searchQuery, setSearchQuery] = useState(hashtag || '');
  const [trendingHashtags, setTrendingHashtags] = useState([]);

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

  const fetchPostsByHashtag = useCallback(async (tag) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts/hashtag/${tag}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch hashtag posts');
      }

      setPosts(data.posts || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching hashtag posts:', error);
      setError(error.message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hashtag) {
      fetchPostsByHashtag(hashtag);
    } else {
      fetchExplorePosts();
    }
  }, [hashtag, fetchExplorePosts, fetchPostsByHashtag]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore/hashtag/${searchQuery.trim().replace('#', '')}`);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark-theme' ? 'bg-black' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen px-4 flex items-center justify-center ${
        theme === 'dark-theme' ? 'bg-black' : 'bg-gray-50'
      }`}>
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen mb-50 ${
      theme === 'dark-theme' ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <UserSuggestions />
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => {
              setActiveTab('posts');
              navigate('/explore');
            }}
            className={`px-4 py-2 mx-2 rounded-full ${
              activeTab === 'posts'
                ? theme === 'dark-theme'
                  ? 'bg-white text-black'
                  : 'bg-black text-white'
                : theme === 'dark-theme'
                ? 'text-white'
                : 'text-black'
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('hashtags')}
            className={`px-4 py-2 mx-2 rounded-full ${
              activeTab === 'hashtags'
                ? theme === 'dark-theme'
                  ? 'bg-white text-black'
                  : 'bg-black text-white'
                : theme === 'dark-theme'
                ? 'text-white'
                : 'text-black'
            }`}
          >
            Hashtags
          </button>
        </div>

        {/* Hashtag Search */}
        {activeTab === 'hashtags' && (
          <div className="mb-6">
            <form onSubmit={handleSearch} className="flex justify-center">
              <div className="relative w-full max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search hashtags..."
                  className={`w-full px-4 py-2 rounded-full pr-10 ${
                    theme === 'dark-theme'
                      ? 'bg-gray-800 text-white placeholder-gray-400'
                      : 'bg-white text-black placeholder-gray-500'
                  }`}
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <SearchRegular className={
                    theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
                  } />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Posts Grid */}
      <div className="max-w-6xl mx-auto px-4">
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
              
              {/* Hover Overlay */}
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

              {/* Hashtags Overlay (only show when viewing hashtag posts) */}
              {activeTab === 'hashtags' && post.hashtags?.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/70">
                  <div className="flex flex-wrap gap-1">
                    {post.hashtags.map((tag, index) => (
                      <span key={index} className="text-xs text-white">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Explore;
