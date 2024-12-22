import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../../App';
import { 
  HomeFilled,
  SearchRegular,
  AddCircleRegular,
  HeartRegular,
  PersonRegular
} from '@fluentui/react-icons';

const MobileNav = ({ onPostCreatorClick }) => {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);

  return (
    <div className={`fixed left-0 right-0 bottom-0 z-50 backdrop-blur-md ${
      theme === 'dark-theme' ? 'bg-[#0d0d0d]/95 border-gray-800' : 'bg-white/95 border-gray-200'} border-t`}>
      <div className="flex justify-around items-center h-16 max-w-xl mx-auto px-4">
        <button 
          onClick={() => navigate('/')}
          className={`${theme === 'dark-theme' ? 'text-white' : 'text-gray-700'} hover:text-[#ae52e3] transition-colors`}
        >
          <HomeFilled className="w-6 h-6" />
        </button>
        <button 
          onClick={() => navigate('/explore')}
          className={`${theme === 'dark-theme' ? 'text-white' : 'text-gray-700'} hover:text-[#ae52e3] transition-colors`}
        >
          <SearchRegular className="w-6 h-6" />
        </button>
        <button 
          onClick={onPostCreatorClick}
          className={`${theme === 'dark-theme' ? 'text-white' : 'text-gray-700'} hover:text-[#ae52e3] transition-colors`}
        >
          <AddCircleRegular className="w-6 h-6" />
        </button>
        <button 
          onClick={() => navigate('/activity')}
          className={`${theme === 'dark-theme' ? 'text-white' : 'text-gray-700'} hover:text-[#ae52e3] transition-colors`}
        >
          <HeartRegular className="w-6 h-6" />
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className={`${theme === 'dark-theme' ? 'text-white' : 'text-gray-700'} hover:text-[#ae52e3] transition-colors`}
        >
          <PersonRegular className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default MobileNav;
