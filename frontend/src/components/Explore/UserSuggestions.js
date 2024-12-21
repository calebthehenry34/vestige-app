import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from '@carbon/icons-react';
import { ChevronDownRegular, ChevronUpRegular } from '@fluentui/react-icons';
import { ThemeContext } from '../../App';
import { API_URL } from '../../config';
import { debounce } from 'lodash';
import { getProfileImageUrl } from '../../utils/imageUtils';

const UserSuggestions = () => {
  const { theme } = useContext(ThemeContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const containerRef = useRef(null);
  
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/suggestions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      const data = await response.json();
      const formattedUsers = Array.isArray(data) ? data : data.users || [];
      setUsers(formattedUsers);
      setError(null);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId) => {
    try {
      const method = users.find(u => u._id === userId)?.isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`${API_URL}/api/users/follow/${userId}`, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to update follow status');
      }

      // Wait for the response to complete
      await response.json();
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user._id === userId 
            ? { ...user, isFollowing: !user.isFollowing }
            : user
        )
      );
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
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
      const debouncedCheck = debounce(() => checkScrollPosition(), 100);
      container.addEventListener('scroll', debouncedCheck);
      checkScrollPosition();
      return () => {
        container.removeEventListener('scroll', debouncedCheck);
        debouncedCheck.cancel();
      };
    }
  }, []);

  useEffect(() => {
    if (isExpanded && containerRef.current) {
      containerRef.current.scrollLeft = 0;
      checkScrollPosition();
    }
  }, [isExpanded]);

  const handleScroll = (direction) => {
    if (containerRef.current) {
      const scrollAmount = 300;
      containerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <div className={`rounded-lg shadow-lg mb-6 pt-10 ${
        theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className="p-4 border-b border-gray-200">
          <div className="h-6 bg-gray-300 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="p-4">
          <div className="flex space-x-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex-none w-48">
                <div className={`aspect-square rounded-lg ${
                  theme === 'dark-theme' ? 'bg-gray-800' : 'bg-gray-300'
                }`}></div>
                <div className="mt-2 h-4 bg-gray-300 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-100 rounded-lg pt-10">
        Failed to load suggestions: {error}
      </div>
    );
  }

  if (!users.length) {
    return (
      <div className={`p-6 text-center rounded-lg shadow-lg pt-10 ${
        theme === 'dark-theme' ? 'bg-gray-900 text-gray-400' : 'bg-white text-gray-500'
      }`}>
        <p>No suggestions available right now</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow-lg mb-6 pt-10 ${
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
          Discover People
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
                <Link to={`/profile/${user.username}`} className="block relative">
                  <div className="aspect-square relative">
                    <img 
                      src={getProfileImageUrl(user.profilePicture, user.username)}
                      alt={user.username}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}`;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <h3 className="font-medium truncate">
                        {user.username}
                      </h3>
                      {user.bio && (
                        <p className="text-sm mt-1 line-clamp-2 text-gray-200">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="p-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleFollow(user._id);
                    }}
                    className={`w-full py-2 rounded-lg font-medium ${
                      user.isFollowing
                        ? theme === 'dark-theme'
                          ? 'bg-gray-700 text-white'
                          : 'bg-gray-100 text-gray-800'
                        : 'bg-blue-500 text-white'
                    }`}
                  >
                    {user.isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
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
