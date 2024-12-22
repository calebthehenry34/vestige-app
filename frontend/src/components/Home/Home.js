import React from 'react';
import Navbar from '../Navigation/Navbar';
import WelcomeMessage from '../Common/WelcomeMessage';
import Feed from '../Feed/Feed';
import { useScroll } from '../../context/ScrollContext';

const Home = () => {
  const { isScrolled } = useScroll();

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>

      <div className="feed-layout">
        <WelcomeMessage />
        <div className={`feed-container ${isScrolled ? 'scrolled' : ''}`}>
          <Feed />
        </div>
      </div>
    </div>
  );
};

export default Home;
