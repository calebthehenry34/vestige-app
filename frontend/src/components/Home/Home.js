import React from 'react';
import Navbar from '../Navigation/Navbar';
import WelcomeMessage from '../Common/WelcomeMessage';
import Feed from '../Feed/Feed';

const Home = () => {
  return (
    <div className="min-h-screen bg-black">
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>

      <div className="pt-[72px]">
        <WelcomeMessage />
        <Feed />
      </div>
    </div>
  );
};

export default Home;
