import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { useScroll } from '../../context/ScrollContext';
import { ThemeContext } from '../../context/ThemeContext';

const ExploreMessage = () => {
  const { scrollY } = useScroll();
  const { theme } = useContext(ThemeContext);

  // Calculate opacity based on scroll position
  const opacity = Math.max(0, 1 - (scrollY / 100));

  return (
    <div 
      className={`welcome-message px-4 py-6 ${theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}`}
      style={{ 
        opacity,
        transform: `translateY(${-scrollY * 0.3}px)`,
        pointerEvents: opacity === 0 ? 'none' : 'auto',
        transition: 'opacity 0.3s ease-out'
      }}
    >
      <div className={`text-xl font-headlines mb-2 ${theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}`}>
        Explore
      </div>
      <div className="flex flex-col space-y-1">
        <Link to="/usersuggestions" className={`text-sm transition-colors cursor-pointer ${theme === 'dark-theme' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}>
          find users to connect with
        </Link>
        <Link to="/search/hashtags" className={`text-sm transition-colors cursor-pointer ${theme === 'dark-theme' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'}`}>
          discover trending topics
        </Link>
      </div>
    </div>
  );
};

export default ExploreMessage;
