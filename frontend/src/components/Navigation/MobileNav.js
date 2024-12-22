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

const MobileNav = ({ visible, onPostCreatorClick }) => {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);

  return (
    <div className={`fixed bottom-0 left-0 right-0 transform transition-transform duration-300 ${
      theme === 'dark-theme' ? 'bg-[#0d0d0d] border-gray-800' : 'bg-white border-gray-200'} border-t ${
      visible ? 'translate-y-0' : 'translate-y-full'
    }`}>
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
