import React from 'react';
import { Link } from 'react-router-dom';
import { useScroll } from '../../context/ScrollContext';

const WelcomeMessage = () => {
  const { scrollY } = useScroll();
  const opacity = Math.max(0, 1 - (scrollY / 100));

  return (
    <div 
      className="welcome-message px-4 py-6"
      style={{ 
        opacity,
        transform: `translateY(${-scrollY * 0.3}px)`,
        pointerEvents: opacity === 0 ? 'none' : 'auto',
        transition: 'opacity 0.3s ease-out'
      }}
    >
      <div className="text-xl font-headlines text-white mb-2">
        Explore
      </div>
      <Link 
        to="/explore/users"
        className="block text-gray-400 hover:text-gray-200 text-sm transition-colors cursor-pointer mb-2"
      >
        find people to connect with
      </Link>
      <Link 
        to="/explore/hashtags"
        className="block text-gray-400 hover:text-gray-200 text-sm transition-colors cursor-pointer"
      >
        discover trending topics
      </Link>
    </div>
  );
};

export default WelcomeMessage;
