import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from '@carbon/icons-react';
import { ChevronDownRegular, ChevronUpRegular } from '@fluentui/react-icons';
import { ThemeContext } from '../../App';
import { API_URL } from '../../config';

const UserSuggestions = () => {
  const { theme } = useContext(ThemeContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const containerRef = useRef(null);
  
  const fetchSuggestedUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/suggestions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      const formattedUsers = Array.isArray(data) ? data : data.users || [];
      setUsers(formattedUsers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching suggested users:', error);
      setUsers([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  const checkScrollPosition = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition();
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScrollPosition);
      }
    };
  }, []);

  const handleScroll = (direction) => {
    if (containerRef.current) {
      const scrollAmount = 300;
      containerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleFollow = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to follow user');
      
      setUsers(users.map(u => {
        if (u._id === userId) {
          return { ...u, isFollowing: true };
        }
        return u;
      }));
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!users.length) {
    return null;
  }

  return (
    <div className={`rounded-lg shadow-lg mb-6 ${
      theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
    }`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full p-4 flex justify-between items-center border-b ${
          theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
        }`}
      >
        <h2 className={`text-lg font-semibold ${
          theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
        }`}>
          Suggested Users
        </h2>
        {isExpanded ? (
          <ChevronUpRegular className="w-5 h-5" />
        ) : (
          <ChevronDownRegular className="w-5 h-5" />
        )}
      </button>
      
      {isExpanded && (
        <div className="relative">
          {canScrollLeft && (
            <button
              onClick={() => handleScroll('left')}
              className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg ${
                theme === 'dark-theme' 
                  ? 'bg-gray-800 text-white hover:bg-gray-700' 
                  : 'bg-white text-gray-800 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <div 
            ref={containerRef}
            className="flex overflow-x-auto scroll-smooth hide-scrollbar p-4 space-x-4"
            style={{ scrollbarWidth: 'none' }}
          >
            {users.map(user => (
              <div 
                key={user._id}
                className={`flex-none w-48 rounded-lg overflow-hidden ${
                  theme === 'dark-theme' ? 'bg-gray-800' : 'bg-gray-50'
                }`}
              >
                <Link to={`/profile/${user._id}`} className="block">
                  <div className="aspect-square">
                    <img 
                      src={user.profilePicture ? `${API_URL}/uploads/${user.profilePicture}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}`}
                      alt={user.username}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}`;
                      }}
                    />
                  </div>
                  <div className="p-3">
                    <h3 className={`font-medium truncate ${
                      theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {user.username}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleFollow(user._id);
                      }}
                      className={`mt-2 w-full px-3 py-1.5 rounded text-sm font-medium ${
                        user.isFollowing
                          ? theme === 'dark-theme'
                            ? 'bg-gray-700 text-white hover:bg-gray-600'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {user.isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {canScrollRight && (
            <button
              onClick={() => handleScroll('right')}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full shadow-lg ${
                theme === 'dark-theme' 
                  ? 'bg-gray-800 text-white hover:bg-gray-700' 
                  : 'bg-white text-gray-800 hover:bg-gray-100'
              }`}
            >
              <ArrowRight size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSuggestions;
