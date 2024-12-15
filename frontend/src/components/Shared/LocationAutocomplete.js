import React, { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

const LocationAutocomplete = ({ onSelectLocation }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  // Simulated location data - replace with actual API call
  const searchLocations = async (searchQuery) => {
    setIsLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockLocations = [
      { id: '1', name: 'New York, NY', type: 'city' },
      { id: '2', name: 'Times Square, New York', type: 'landmark' },
      { id: '3', name: 'Central Park, New York', type: 'park' },
    ].filter(location => 
      location.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setSuggestions(mockLocations);
    setIsLoading(false);
  };

  useEffect(() => {
    if (query.length >= 2) {
      searchLocations(query);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="w-full pl-10 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search for a location"
        />
      </div>

      {/* Location Suggestions Dropdown */}
      {showSuggestions && (suggestions.length > 0 || isLoading) && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : (
            suggestions.map(location => (
              <button
                key={location.id}
                onClick={() => {
                  onSelectLocation(location);
                  setQuery(location.name);
                  setShowSuggestions(false);
                }}
                className="w-full px-4 py-2 hover:bg-gray-50 flex items-center"
              >
                <MapPin className="w-5 h-5 mr-3 text-gray-400" />
                <div className="text-left">
                  <div className="font-medium">{location.name}</div>
                  <div className="text-sm text-gray-500 capitalize">
                    {location.type}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;