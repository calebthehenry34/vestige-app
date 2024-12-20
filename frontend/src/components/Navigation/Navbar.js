import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  CompassNorthwestRegular, 
  HeartRegular, 
  PersonRegular, 
  ImageMultipleRegular,
  VideoPersonPulseRegular, 
  SettingsRegular,
  ShieldRegular,
  SignOutRegular,
  SparkleRegular,
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
  AddRegular,
  HomeRegular,
  ChatRegular,
} from '@fluentui/react-icons';
import { useAuth } from '../../context/AuthContext';
import { ThemeContext } from '../../App';
import { getProfileImageUrl } from '../../utils/imageUtils';
import PostCreator from '../Post/PostCreator';

const Navbar = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDrawer, setShowDrawer] = useState(false);
  const [showFeedMenu, setShowFeedMenu] = useState(false);
  const [showPostCreator, setShowPostCreator] = useState(false);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);
  const [expandedSection, setExpandedSection] = useState(null);
  const [startY, setStartY] = useState(null);
  const [currentY, setCurrentY] = useState(0);
  const mobileNavRef = useRef(null);

  const isSettingsPage = location.pathname === '/settings';

  useEffect(() => {
    if (showDrawer || showFeedMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  
    return () => {
      document.body.style.overflow = '';
    };
  }, [showDrawer, showFeedMenu]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      const isScrolledUp = prevScrollPos > currentScrollPos;

      setVisible(isScrolledUp || currentScrollPos < 10);
      setPrevScrollPos(currentScrollPos);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prevScrollPos]);

  const handleTouchStart = (e) => {
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (!startY) return;
    
    const deltaY = startY - e.touches[0].clientY;
    if (deltaY > 0 && visible) {
      // Swiping up while visible
      setCurrentY(Math.min(deltaY, 100));
    } else if (deltaY < 0 && !visible) {
      // Swiping down while hidden
      setCurrentY(Math.max(deltaY, -100));
    }
  };

  const handleTouchEnd = () => {
    if (currentY > 50) {
      setVisible(false);
    } else if (currentY < -50) {
      setVisible(true);
    }
    setStartY(null);
    setCurrentY(0);
  };

  const handleNavigation = (path) => {
    setShowDrawer(false);
    setShowFeedMenu(false);
    navigate(path);
  };

  const handleLogout = () => {
    setShowDrawer(false);
    logout();
    navigate('/login');
  };

  const navigationItems = [
    { 
      action: () => setShowFeedMenu(true),
      icon: <HomeRegular className="w-7 h-7" />, 
      label: 'Home' 
    },
    { 
      action: () => handleNavigation('/explore'),
      icon: <CompassNorthwestRegular className="w-7 h-7" />,
      label: 'Explore' 
    },
    {
      action: () => setShowPostCreator(true),
      icon: <AddRegular className="w-6 h-6" />,
      label: 'Create',
      className: `${theme === 'dark-theme' ? 'bg-gray-800' : 'bg-gray-100'} border-2 border-purple-500 p-4 flex items-center justify-center`
    },
    { 
      action: () => handleNavigation('/notifications'),
      icon: <HeartRegular className="w-7 h-7" />,
      label: 'Notifications' 
    },
    {
      action: () => {},
      icon: <ChatRegular className="w-7 h-7" />,
      label: 'Chat',
      className: 'opacity-50 cursor-not-allowed'
    }
  ];

  const settingsSections = [
    {
      id: 'account',
      label: 'Account',
      items: [
        { icon: <PersonRegular />, label: 'Profile', action: () => user?.username && handleNavigation(`/profile/${user.username}`) },
        { icon: <HeartRegular />, label: 'Notifications', action: () => handleNavigation('/notifications') },
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

  const renderDrawer = () => (
    <>
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
    </>
  );

  return (
    <>
      <div className={`fixed top-0 left-0 right-0 z-[100] transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      } ${
        theme === 'dark-theme'
          ? 'bg-gray-900 border-gray-800'
          : 'bg-white border-gray-200'
      } border-b`}>
        <div className="flex items-center h-16 px-4 max-w-6xl mx-auto justify-between">
          <button onClick={() => handleNavigation('/')} className="flex items-center">
            <span className={`text-xl font-semibold ${
              theme === 'dark-theme' ? 'text-white' : 'text-black'
            }`}>
              <img src="/logos/logo.png" alt="Logo" className="mr-3 h-6 w-auto"/>
            </span>
          </button>

          <button
            onClick={() => setShowDrawer(true)}
            className={`md:hidden p-2 rounded-md transition-colors ${
              theme === 'dark-theme'
                ? 'hover:bg-gray-800'
                : 'hover:bg-gray-100'
            }`}
          >
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
          </button>
        </div>
      </div>

      {/* Floating Mobile Navigation */}
      {!isSettingsPage && (
        <div 
          ref={mobileNavRef}
          className={`md:hidden fixed z-[90] left-4 right-4 transition-all duration-300 ease-in-out ${
            visible ? 'bottom-6' : 'translate-y-full bottom-[-100px]'
          }`}
          style={{
            transform: `translateY(${currentY}px)`,
            touchAction: 'none'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="max-w-sm mx-auto relative">
            <div className={`${
              theme === 'dark-theme'
                ? 'bg-gray-900'
                : 'bg-white'
            } rounded-xl shadow-lg px-4 py-3`}>
              <div className="grid grid-cols-5 items-center">
                {navigationItems.map((item, index) => (
                  <div key={index} className="col-span-1 flex justify-center items-center">
                    <button
                      onClick={item.action}
                      className={`p-2 transition-colors ${
                        index === 2 
                          ? `absolute left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center ${
                            theme === 'dark-theme'
                              ? 'bg-gray-900 text-white hover:bg-gray-800'
                              : 'bg-white text-gray-700 hover:bg-gray-100'
                            } shadow-lg border-4 ${
                              theme === 'dark-theme' ? 'border-gray-800' : 'border-white'
                            }`
                          : 'rounded-lg'
                      } ${
                        theme === 'dark-theme'
                          ? 'text-white hover:bg-gray-800'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      disabled={item.className?.includes('cursor-not-allowed')}
                    >
                      {item.icon}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feed Selection Menu */}
      {showFeedMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-[91] md:hidden flex items-end justify-center"
          onClick={() => setShowFeedMenu(false)}
        >
          <div 
            className={`w-full rounded-t-xl overflow-hidden transform transition-all duration-500 ease-in-out ${
              theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-4 border-b ${
              theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <h3 className={`text-sm font-semibold ${
                theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
              }`}>Select Feed</h3>
            </div>
            <div className="p-2">
              <button 
                onClick={() => handleNavigation('/')}
                className={`flex items-center w-full p-4 rounded-lg ${
                  theme === 'dark-theme'
                    ? 'hover:bg-gray-800 text-white'
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
              >
                <ImageMultipleRegular className="w-6 h-6 mr-3" />
                <span>Photos</span>
              </button>
              <button 
                onClick={() => handleNavigation('/videos')}
                className={`flex items-center w-full p-4 rounded-lg ${
                  theme === 'dark-theme'
                    ? 'hover:bg-gray-800 text-white'
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
              >
                <VideoPersonPulseRegular className="w-6 h-6 mr-3" />
                <span>Moments</span>
              </button>
              <div 
                className={`flex items-center p-4 rounded-lg opacity-50 cursor-not-allowed ${
                  theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
                }`}
              >
                <SparkleRegular className="w-6 h-6 mr-3" />
                <span>Videos (Soon)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <PostCreator
        isOpen={showPostCreator}
        onClose={() => setShowPostCreator(false)}
        onPostCreated={() => setShowPostCreator(false)}
      />

      {renderDrawer()}
    </>
  );
};

export default Navbar;
