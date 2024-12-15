import React, { useState, useEffect, useRef } from 'react';
import { Users, X } from 'lucide-react';

const UserSearch = ({ onTagUser, taggedUsers, onRemoveTag }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  // Simulated user data - replace with API call
  const searchUsers = async (query) => {
    setIsLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockUsers = [
      { id: '1', username: 'john_doe', name: 'John Doe', profilePicture: '/api/placeholder/32/32' },
      { id: '2', username: 'jane_smith', name: 'Jane Smith', profilePicture: '/api/placeholder/32/32' },
      { id: '3', username: 'mike_wilson', name: 'Mike Wilson', profilePicture: '/api/placeholder/32/32' },
    ].filter(user => 
      user.username.toLowerCase().includes(query.toLowerCase()) ||
      user.name.toLowerCase().includes(query.toLowerCase())
    );

    setSearchResults(mockUsers);
    setIsLoading(false);
  };

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <Users className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search for users to tag"
        />
      </div>

      {/* Search Results Dropdown */}
      {showResults && (searchResults.length > 0 || isLoading) && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : (
            searchResults.map(user => (
              <button
                key={user.id}
                onClick={() => {
                  onTagUser(user);
                  setSearchQuery('');
                  setShowResults(false);
                }}
                className="w-full px-4 py-2 hover:bg-gray-50 flex items-center gap-3"
                disabled={taggedUsers.some(u => u.id === user.id)}
              >
                <img
                  src={user.profilePicture}
                  alt={user.username}
                  className="w-8 h-8 rounded-full"
                />
                <div className="text-left">
                  <div className="font-semibold">{user.username}</div>
                  <div className="text-sm text-gray-500">{user.name}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Tagged Users */}
      {taggedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {taggedUsers.map(user => (
            <span
              key={user.id}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              @{user.username}
              <button
                type="button"
                onClick={() => onRemoveTag(user.id)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                <X className="w-4 h-4" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserSearch;