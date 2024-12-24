import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScroll } from '../../context/ScrollContext';
import { useNotifications } from '../../context/NotificationContext';
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
  DocumentRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
} from '@fluentui/react-icons';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../App';
import { getProfileImageUrl } from '../../utils/imageUtils';
import PostCreator from '../Post/PostCreator';
import MobileNav from './MobileNav';
const Navbar = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { user, logout } = useAuth();
  const { scrollY } = useScroll();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = scrollY;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsHeaderHidden(true);
      } else {
        setIsHeaderHidden(false);
      }
      lastScrollY.current = currentScrollY;
    };

    handleScroll();
  }, [scrollY]);

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
        { icon: <DocumentRegular />, label: 'Roadmap', action: () => handleNavigation('/roadmap') },
        { 
          icon: theme === 'dark-theme' ? <WeatherSunnyRegular /> : <WeatherMoonRegular />, 
          label: `${theme === 'dark-theme' ? 'Light' : 'Dark'} Mode`, 
          action: () => toggleTheme(theme === 'dark-theme' ? 'light-theme' : 'dark-theme')
        },
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
    }
  ];

  return (
    <>
      <div className={`fixed top-0 left-0 right-0 header ${
        theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
      } ${isHeaderHidden ? 'header-hidden' : ''}`}>
        <div className="border-b border-gray-800 relative z-[80] bg-inherit">
          <div className="flex items-center justify-between h-16 px-4 w-screen">
            <button onClick={() => handleNavigation('/')} className="flex items-center">
              <img src="/logos/logov.png" alt="Logo" className="h-7 w-auto"/>
            </button>

            <div className="flex items-center">
              <button 
                onClick={() => setShowDrawer(true)} 
                className="flex items-center ml-4 relative"
              >
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
                {user ? (
                  <div className="flex items-center space-x-2">
                    <img
                      src={getProfileImageUrl(user)}
                      alt={user?.username || 'User'}
                      className="w-10 h-10 rounded-md object-cover"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${user?.username || 'user'}&background=random`;
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-md bg-gray-200 flex items-center justify-center">
                    <PersonRegular className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

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
        <div className="p-6 border-b border-gray-800 flex flex-col items-center relative">
          <img
            src={getProfileImageUrl(user)}
            alt={user?.username || 'User'}
            className="w-24 h-24 rounded-lg object-cover mb-4"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${user?.username || 'user'}&background=random`;
            }}
          />
          <button
            onClick={() => {
              handleNavigation('/settings/profile');
              setShowDrawer(false);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Edit Profile
          </button>
          <button
            onClick={() => setShowDrawer(false)}
            className={`absolute top-4 right-4 p-2 rounded-lg transition-colors ${
              theme === 'dark-theme' 
                ? 'text-gray-400 hover:text-white hover:bg-gray-800' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <DismissRegular className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-120px)] hide-scrollbar">
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

        {user?.isAdmin && (
          <button
            onClick={() => handleNavigation('/admin')}
            className={`absolute bottom-[60px] left-0 right-0 flex items-center justify-center w-full p-4 transition-colors border-t ${
              theme === 'dark-theme'
                ? 'text-gray-300 hover:bg-gray-800 border-gray-800'
                : 'text-gray-700 hover:bg-gray-50 border-gray-200'
            }`}
          >
            <ShieldRegular className="w-5 h-5 mr-3" />
            <span>Admin Dashboard</span>
          </button>
        )}
        <button
          onClick={handleLogout}
          className={`absolute bottom-0 left-0 right-0 flex items-center justify-center w-full p-4 transition-colors border-t ${
            theme === 'dark-theme'
              ? 'text-red-400 hover:bg-gray-800 border-gray-800'
              : 'text-red-600 hover:bg-gray-50 border-gray-200'
          }`}
          style={{ height: '60px' }}
        >
          <SignOutRegular className="w-5 h-5 mr-3" />
          <span>Log Out</span>
        </button>
      </div>

      <PostCreator
        isOpen={showPostCreator}
        onClose={() => setShowPostCreator(false)}
        onPostCreated={() => setShowPostCreator(false)}
      />

      <MobileNav 
        onPostCreatorClick={() => setShowPostCreator(true)}
        isHidden={showDrawer}
      />
    </>
  );
};

export default Navbar;
