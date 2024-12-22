import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HeartRegular, 
  PersonRegular, 
  SettingsRegular,
  ShieldRegular,
  SignOutRegular,
  ChevronRightRegular,
  DismissRegular,
  LockClosedRegular,
  PeopleRegular,
  PersonSquareCheckmarkRegular,
  MoneyRegular,
  ChartMultipleRegular,
  ShareRegular,
  VirtualNetworkFilled,
  PresenceBlockedRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
  DocumentRegular,
} from '@fluentui/react-icons';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../App';
import { getProfileImageUrl } from '../../utils/imageUtils';
import PostCreator from '../Post/PostCreator';

import ActivityFeed from '../Activity/ActivityFeed';
import Toast from '../Common/Toast';
import { useNotifications } from '../../context/NotificationContext';
import WelcomeMessage from '../Common/WelcomeMessage';

const Navbar = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { user, logout } = useAuth();
  const { currentNotification, clearCurrentNotification } = useNotifications();
  const navigate = useNavigate();
  const [showDrawer, setShowDrawer] = useState(false);
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeToast, setActiveToast] = useState(null);



  useEffect(() => {
    if (currentNotification) {
      setActiveToast(currentNotification);
      clearCurrentNotification();
    }
  }, [currentNotification, clearCurrentNotification]);


  useEffect(() => {
    if (showDrawer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  
    return () => {
      document.body.style.overflow = '';
    };
  }, [showDrawer]);

  const handleNavigation = (path) => {
    setShowDrawer(false);
    navigate(path);
  };

  const handleLogout = () => {
    setShowDrawer(false);
    logout();
    navigate('/login');
  };

  const settingsSections = [
    {
      id: 'account',
      label: 'Account',
      items: [
        { icon: <PersonRegular />, label: 'Profile', action: () => user?.username && handleNavigation(`/profile/${user.username}`) },
        { icon: <HeartRegular />, label: 'Notifications', action: () => handleNavigation('/activity') },
        { icon: <SettingsRegular />, label: 'Settings', action: () => handleNavigation('/settings') },
      ]
    },
    {
      id: 'privacy',
      label: 'Privacy & Security',
      items: [
        { icon: <LockClosedRegular />, label: 'Privacy', action: () => handleNavigation('/settings/privacy') },
        { icon: <PeopleRegular />, label: 'Manage Followers', action: () => handleNavigation('/settings/followers') },
        { icon: <PresenceBlockedRegular />, label: 'Blocked Users', action: () => handleNavigation('/settings/blocked') },
      ]
    },
    {
      id: 'features',
      label: 'Features',
      items: [
        { icon: <PersonSquareCheckmarkRegular />, label: 'Verification', action: () => handleNavigation('/settings/verification') },
        { icon: <MoneyRegular />, label: 'Subscription', action: () => handleNavigation('/settings/subscription') },
        { icon: <ShareRegular />, label: 'Affiliate Program', action: () => handleNavigation('/settings/affiliate') },
      ]
    },
    {
      id: 'data',
      label: 'Data & Analytics',
      items: [
        { icon: <ChartMultipleRegular />, label: 'Analytics', action: () => handleNavigation('/settings/analytics') },
        { icon: <VirtualNetworkFilled />, label: 'Sessions', action: () => handleNavigation('/settings/sessions') },
      ]
    },
    {
      id: 'other',
      label: 'Other',
      items: [
        { icon: <DocumentRegular />, label: 'Roadmap', action: () => handleNavigation('/roadmap') },
        ...(user?.isAdmin ? [{ icon: <ShieldRegular />, label: 'Admin Dashboard', action: () => handleNavigation('/admin') }] : []),
      ]
    }
  ];

  

  return (
    <>
      {activeToast && (
        <Toast 
          notification={activeToast} 
          onClose={() => setActiveToast(null)}
        />
      )}

      <div className={`fixed top-0 left-0 right-0 ${
        theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
      }`}>
        {/* Top Row - Always visible */}
        <div className="border-b border-gray-800 relative z-[100] bg-inherit">
          <div className="flex items-center h-16 px-4 max-w-6xl mx-auto justify-between">
            <button onClick={() => handleNavigation('/')} className="flex items-center">
              <img src="/logos/logov.png" alt="Logo" className="h-7 w-auto"/>
            </button>

            <div className="flex items-center space-x-4">
                {user ? (
                  <img
                    src={getProfileImageUrl(user?.profilePicture, user?.username)}
                    alt={user?.username}
                    className="w-6 h-6 rounded-md object-cover"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}`;
                      e.target.onError = null;
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-gray-200 flex items-center justify-center">
                    <PersonRegular className="w-5 h-5 text-gray-400" />
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Drawer */}
      {showDrawer && (
        <div 
          className="fixed inset-0 bg-black/50 z-[150] transition-opacity duration-300"
          onClick={() => setShowDrawer(false)}
        />
      )}
      
      <div 
        className={`fixed top-0 right-0 h-full w-80 ${
          theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
        } shadow-xl z-[151] transform transition-transform duration-300 ease-in-out ${
          showDrawer ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className={`flex items-center justify-between p-4 border-b ${
          theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            {user ? (
             <img
             src={getProfileImageUrl(user?.profilePicture, user?.username)}
             alt={user?.username}
             className="w-6 h-6 rounded-md object-cover"
             onError={(e) => {
               e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}`;
               e.target.onError = null;
             }}
           />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <PersonRegular className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div>
              <div className={`font-medium ${theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}`}>
                {user?.username || 'Guest'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowDrawer(false)}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark-theme' 
                ? 'text-gray-400 hover:text-white hover:bg-gray-800' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <DismissRegular className="w-5 h-5" />
          </button>
        </div>

        <div className={`p-4 border-b ${
          theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between space-x-2">
            <button
              onClick={() => toggleTheme('light-theme')}
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                theme !== 'dark-theme'
                  ? theme === 'dark-theme'
                    ? 'bg-gray-800 text-blue-400'
                    : 'bg-blue-50 text-blue-600'
                  : theme === 'dark-theme'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <WeatherSunnyRegular className="w-5 h-5 mr-2" />
              Light
            </button>
            <button
              onClick={() => toggleTheme('dark-theme')}
              className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
                theme === 'dark-theme'
                  ? theme === 'dark-theme'
                    ? 'bg-gray-800 text-blue-400'
                    : 'bg-blue-50 text-blue-600'
                  : theme === 'dark-theme'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <WeatherMoonRegular className="w-5 h-5 mr-2" />
              Dark
            </button>
          </div>
        </div>

        <div className="overflow-y-auto h-[calc(100%-180px)] hide-scrollbar">
          {settingsSections.map((section) => (
            <div 
              key={section.id} 
              className={`border-b ${
                theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
              }`}
            >
              <button
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                className={`flex items-center justify-between w-full p-4 transition-colors ${
                  theme === 'dark-theme'
                    ? 'text-white hover:bg-gray-800'
                    : 'text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">{section.label}</span>
                <ChevronRightRegular 
                  className={`w-5 h-5 transform transition-transform duration-200 ${
                    expandedSection === section.id ? 'rotate-90' : ''
                  }`} 
                />
              </button>
              
              <div className={`overflow-hidden transition-all duration-200 ${
                expandedSection === section.id ? 'max-h-96' : 'max-h-0'
              }`}>
                {section.items.map((item, index) => (
                  <button
                    key={index}
                    onClick={item.action}
                    className={`flex items-center justify-between w-full p-4 pl-8 transition-colors ${
                      theme === 'dark-theme'
                        ? 'text-gray-300 hover:bg-gray-800'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="mr-3">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className={`absolute bottom-0 left-0 right-0 flex items-center justify-center w-full p-4 transition-colors ${
            theme === 'dark-theme'
              ? 'text-red-400 hover:bg-gray-800 border-t border-gray-800'
              : 'text-red-600 hover:bg-gray-50 border-t border-gray-200'
          }`}
        >
          <SignOutRegular className="w-5 h-5 mr-3" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Post Creator Modal */}
      <PostCreator
        isOpen={showPostCreator}
        onClose={() => setShowPostCreator(false)}
        onPostCreated={() => setShowPostCreator(false)}
      />

      {/* Notifications Panel */}
      {showNotifications && (
        <div 
          className="fixed inset-0 bg-black/50 z-[91] md:hidden flex items-end justify-center"
          onClick={() => setShowNotifications(false)}
        >
          <div 
            className={`w-full h-[60vh] rounded-t-xl overflow-hidden transform transition-all duration-500 ease-in-out ${
              theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <ActivityFeed 
              isOpen={showNotifications} 
              onClose={() => setShowNotifications(false)}
              onNotificationsUpdate={() => {}}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
