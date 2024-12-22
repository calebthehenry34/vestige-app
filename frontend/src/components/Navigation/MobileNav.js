import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HomeFilled,
  SearchRegular,
  AddCircleRegular,
  HeartRegular,
  PersonRegular
} from '@fluentui/react-icons';

const MobileNav = ({ visible, onPostCreatorClick }) => {
  const navigate = useNavigate();

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-[#0d0d0d] border-t border-gray-800 transform transition-transform duration-300 ${
      visible ? 'translate-y-0' : 'translate-y-full'
    }`}>
      <div className="flex justify-around items-center h-16 max-w-xl mx-auto px-4">
        <button 
          onClick={() => navigate('/')}
          className="text-white hover:text-[#ae52e3] transition-colors"
        >
          <HomeFilled className="w-6 h-6" />
        </button>
        <button 
          onClick={() => navigate('/explore')}
          className="text-white hover:text-[#ae52e3] transition-colors"
        >
          <SearchRegular className="w-6 h-6" />
        </button>
        <button 
          onClick={onPostCreatorClick}
          className="text-white hover:text-[#ae52e3] transition-colors"
        >
          <AddCircleRegular className="w-6 h-6" />
        </button>
        <button 
          onClick={() => navigate('/activity')}
          className="text-white hover:text-[#ae52e3] transition-colors"
        >
          <HeartRegular className="w-6 h-6" />
        </button>
        <button 
          onClick={() => navigate('/profile')}
          className="text-white hover:text-[#ae52e3] transition-colors"
        >
          <PersonRegular className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default MobileNav;
