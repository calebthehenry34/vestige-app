import React, { useState, useEffect } from 'react';
import Navbar from '../Navigation/Navbar';
import WelcomeMessage from '../Common/WelcomeMessage';
import Feed from '../Feed/Feed';
import { useScroll } from '../../context/ScrollContext';
import { PostSkeleton } from '../Common/Skeleton';

const Home = () => {
  const { isScrolled } = useScroll();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>

      <div className="feed-layout">
        {loading ? (
          <>
            <div className="p-4">
              <PostSkeleton />
            </div>
            <div className={`feed-container ${isScrolled ? 'scrolled' : ''}`}>
              <div className="max-w-xl mx-auto space-y-6">
                {[...Array(3)].map((_, index) => (
                  <PostSkeleton key={index} />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <WelcomeMessage />
            <div className={`feed-container ${isScrolled ? 'scrolled' : ''}`}>
              <Feed />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
