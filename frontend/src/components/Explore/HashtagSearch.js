import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { SearchRegular, ChatRegular, HeartRegular, ArrowLeftRegular } from '@fluentui/react-icons';
import { ThemeContext } from '../../context/ThemeContext';
import { API_URL } from '../../config';

const HashtagSearch = () => {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const { hashtag } = useParams();
  const [searchQuery, setSearchQuery] = useState(hashtag || '');
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTrendingHashtags = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/posts/trending-hashtags`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch trending hashtags');
      }

      setTrendingHashtags(data.hashtags || []);
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
    }
  }, []);

  const fetchPostsByHashtag = useCallback(async (tag) => {
    try {
      setLoading(true);
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
    } catch (error) {
      console.error('Error fetching hashtag posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrendingHashtags();
    if (hashtag) {
      fetchPostsByHashtag(hashtag);
    }
  }, [hashtag, fetchTrendingHashtags, fetchPostsByHashtag]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore/hashtag/${searchQuery.trim().replace('#', '')}`);
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark-theme' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 rounded-full mr-2 hover:bg-opacity-10 hover:bg-gray-500 ${
              theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
            }`}
          >
            <ArrowLeftRegular className="w-6 h-6" />
          </button>
          <h1 className={`text-lg font-headlines ${theme === 'dark-theme' ? 'text-white' : 'text-black'}`}>
            {hashtag ? `#${hashtag}` : 'Search Hashtags'}
          </h1>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex justify-center mb-6">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hashtags..."
              className={`w-full px-4 py-3 rounded-full pr-10 ${
                theme === 'dark-theme'
                  ? 'bg-gray-800 text-white placeholder-gray-400'
                  : 'bg-white text-black placeholder-gray-500'
              }`}
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <SearchRegular className={theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'} />
            </button>
          </div>
        </form>

        {/* Show trending hashtags only when not viewing specific hashtag */}
        {!hashtag && (
          <div className={`max-w-2xl mx-auto p-6 rounded-lg ${
            theme === 'dark-theme' ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h3 className={`text-md font-headlines mb-4 ${
              theme === 'dark-theme' ? 'text-white' : 'text-black'
            }`}>
              Popular Hashtags
            </h3>
            <div className="flex flex-wrap gap-3">
              {trendingHashtags.map((tag, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchQuery(tag);
                    navigate(`/explore/hashtag/${tag.replace('#', '')}`);
                  }}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    theme === 'dark-theme'
                      ? 'bg-gray-700 text-white hover:bg-gray-600'
                      : 'bg-gray-100 text-black hover:bg-gray-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Posts Grid - Show when viewing specific hashtag */}
        {hashtag && (
          <div className="mt-8">
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
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
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HashtagSearch;
