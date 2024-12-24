import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../Navigation/Navbar';
import { ThemeContext } from '../../App';

const MainLayout = ({ children }) => {
  const { theme } = useContext(ThemeContext);
  const location = useLocation();
  const isRootPath = location.pathname === '/';

  return (
    <div className={`h-screen ${
      theme === 'dark-theme' ? 'bg-black' : 'bg-gray-50'
    } ${isRootPath ? 'root-path' : ''}`}>
      <div className="nav-spacer" />
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
