import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftRegular } from '@fluentui/react-icons';
import { ThemeContext } from '../../App';
import { UserSuggestionSkeleton } from '../Common/Skeleton';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';

const UserSuggestions = () => {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();
  const lastUserElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);
  
  const fetchUsers = async (pageNum = 1) => {
    try {
      const response = await fetch(`${API_URL}/api/users/suggestions?page=${pageNum}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      const data = await response.json();
      const newUsers = Array.isArray(data) ? data : data.users || [];
      setUsers(prevUsers => {
        if (pageNum === 1) return newUsers;
        // Create a Set of existing user IDs for O(1) lookup
        const existingUserIds = new Set(prevUsers.map(user => user._id));
        // Filter out any users that already exist in the previous state
        const uniqueNewUsers = newUsers.filter(user => !existingUserIds.has(user._id));
        return [...prevUsers, ...uniqueNewUsers];
      });
      setHasMore(newUsers.length > 0);
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
    fetchUsers(page);
  }, [page]);

  if (loading) {
    return (
      <div className={`rounded-lg shadow-lg mb-6 ${
        theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className="p-4 border-b border-gray-200">
          <div className="h-6 bg-gray-700 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="space-y-4 p-4">
          {[...Array(6)].map((_, i) => (
            <UserSuggestionSkeleton key={i} />
          ))}
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
    <div className={`rounded-lg shadow-lg mb-6 overflow-hidden ${
      theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
    }`}>
      <div className={`p-4 flex items-center border-b ${
        theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <button
          onClick={() => navigate(-1)}
          className={`p-2 rounded-full mr-2 hover:bg-opacity-10 hover:bg-gray-500 ${
            theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
          }`}
        >
          <ArrowLeftRegular className="w-6 h-6" />
        </button>
        <h2 className={`text-lg font-semibold ${
          theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
        }`}>
          Discover People
        </h2>
      </div>
      
      <div className="grid grid-cols-2 gap-4 p-4 max-h-[600px] overflow-y-auto">
        {users.map((user, index) => (
          <div 
            key={user._id}
            ref={index === users.length - 1 ? lastUserElementRef : null}
            className={`relative rounded-lg overflow-hidden aspect-square ${
              theme === 'dark-theme' ? 'bg-gray-800' : 'bg-gray-50'
            }`}
          >
            <Link to={`/profile/${user.username}`} className="block w-full h-full">
              <img 
                src={getProfileImageUrl(user.profilePicture, user.username)}
                alt={user.username}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white z-10">
                <h3 className="font-medium truncate">
                  {user.username}
                </h3>
                {user.bio && (
                  <p className="text-sm mt-1 line-clamp-2 text-gray-200">
                    {user.bio}
                  </p>
                )}
              </div>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                handleFollow(user._id);
              }}
              className={`absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium z-20 transition-all ${
                user.isFollowing
                  ? 'bg-white/10 text-white backdrop-blur hover:bg-white/20'
                  : 'bg-blue-500/80 text-white backdrop-blur hover:bg-blue-500/90'
              }`}
            >
              {user.isFollowing ? '✓' : '+'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserSuggestions;
