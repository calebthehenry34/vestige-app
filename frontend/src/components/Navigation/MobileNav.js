import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../../App';
import { useNotifications } from '../../context/NotificationContext';
import ActivityFeed from '../Activity/ActivityFeed';
import { 
  HomeFilled,
  SearchRegular,
  AddCircleRegular,
  HeartRegular,
  ChatRegular
} from '@fluentui/react-icons';

const MobileNav = ({ onPostCreatorClick, isHidden }) => {
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const { unreadCount, showMobileNotifications, setShowMobileNotifications } = useNotifications();

  return (
    <div className={`fixed inset-x-0 bottom-0 mx-4 mb-4 z-[90] backdrop-blur-xl shadow-lg rounded-2xl ${
      theme === 'dark-theme' ? 'bg-[#0d0d0d]/95 border-gray-800' : 'bg-white/95 border-gray-200'} border w-auto pb-[env(safe-area-inset-bottom)] transition-all duration-300 ${
      isHidden ? 'hidden' : 'block'
    }`}>
        <div className="flex justify-around items-center h-16 max-w-xl mx-auto px-4">
          <button 
            onClick={() => navigate('/')}
            className={`${theme === 'dark-theme' ? 'text-white' : 'text-gray-700'} hover:text-[#ae52e3] transition-colors`}
          >
            <HomeFilled className="w-6 h-6" />
          </button>
          <button 
            onClick={() => navigate('/explorenew')}
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
            onClick={() => setShowMobileNotifications(true)}
            className={`${theme === 'dark-theme' ? 'text-white' : 'text-gray-700'} hover:text-[#ae52e3] transition-colors relative`}
          >
            <HeartRegular className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                {unreadCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => navigate('/chat')}
            className={`${theme === 'dark-theme' ? 'text-white' : 'text-gray-700'} hover:text-[#ae52e3] transition-colors`}
          >
            <ChatRegular className="w-6 h-6" />
          </button>
        </div>
      {showMobileNotifications && (
        <div 
          className="fixed inset-0 bg-black/50 z-[200] flex items-end justify-center"
          onClick={() => setShowMobileNotifications(false)}
        >
          <div 
            className={`w-full h-[50vh] rounded-t-xl overflow-hidden transform transition-all duration-300 ease-out ${
              theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <ActivityFeed 
              isOpen={showMobileNotifications} 
              onClose={() => setShowMobileNotifications(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileNav;
