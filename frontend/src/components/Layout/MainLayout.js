import React, { useContext } from 'react';
import Navbar from '../Navbar/Navbar';
import { ThemeContext } from '../../App';

const MainLayout = ({ children }) => {
  const { theme } = useContext(ThemeContext);

  return (
    <div className={`h-screen ${
      theme === 'dark-theme' ? 'bg-black' : 'bg-gray-50'
    }`}>
      <Navbar />
      <main className="pt-16 px-4 pb-24 max-w-6xl mx-auto">
        {children}
      </main>
      {/* Bottom spacer for floating nav */}
      <div className="nav-spacer" />
    </div>
  );
};

export default MainLayout;