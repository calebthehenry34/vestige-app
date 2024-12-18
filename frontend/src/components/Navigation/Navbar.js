import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  CompassNorthwestRegular, 
  HeartRegular, 
  PersonRegular, 
  AddCircleRegular,
  DocumentRegular,
  ImageMultipleRegular,
  VideoPersonPulseRegular, 
  SettingsRegular,
  ShieldRegular,
  SignOutRegular,
  SparkleRegular,
  BeakerRegular,
} from '@fluentui/react-icons';
import { useAuth } from '../../context/AuthContext';
import PostCreator from '../Post/PostCreator';
import { ThemeContext } from '../../App';
import { API_URL } from '../../config';

const Navbar = () => {
  const { theme } = useContext(ThemeContext);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showFeedMenu, setShowFeedMenu] = useState(false);
  const [hasNotifications] = useState(true);
  const [isPostCreatorOpen, setIsPostCreatorOpen] = useState(false);
  const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [visible, setVisible] = useState(true);

  // Check if we're on the settings page
  const isSettingsPage = location.pathname === '/settings';
  
  // Hide navbar if post creator is open or we're on settings page
  const shouldHideNavbar = isPostCreatorOpen || isSettingsPage;

  useEffect(() => {
    if (showFeedMenu || isPostCreatorOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [showFeedMenu, isPostCreatorOpen]);

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

  const DesktopOverlay = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 hidden md:flex items-center justify-center">
        <div className="max-w-md p-8 rounded-lg bg-white dark:bg-gray-800 text-center">
          <BeakerRegular className="w-16 h-16 mx-auto text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold mb-4 dark:text-white">In Development</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            We're currently in beta testing on mobile devices. A full web app version will be rolled out soon with enhanced features and functionality.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            For the best experience, please use the mobile version.
          </p>
        </div>
      </div>
    );
  };

  const navigationItems = [
    { 
      action: () => setShowFeedMenu(prev => !prev),
      icon: <ImageMultipleRegular className="w-6 h-6" />, 
      label: 'Feed' 
    },
    { path: '/explore', icon: <CompassNorthwestRegular className="w-6 h-6" />, label: 'Explore' },
    { action: () => setIsPostCreatorOpen(true), icon: <AddCircleRegular className="w-6 h-6" />, label: 'Create' },
    { path: '/activity', icon: <HeartRegular className="w-6 h-6" />, label: 'Activity' }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderDropdownMenu = () => (
    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg py-1 z-50">
      <div className="px-4 py-3">
        <div className="flex items-center">
          <div className="relative w-10 h-10">
            <img
              src={user?.profilePicture 
                ? `${API_URL}/uploads/${user.profilePicture}`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}`
              }
              alt={user?.username}
              className="w-full h-full rounded-md object-cover"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}`;
              }}
            />
          </div>
          <div className="ml-3">
            <div className="font-medium text-black">{user?.username}</div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100">
        <Link
          to="/activity"
          className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          onClick={() => setShowDropdown(false)}
        >
          <div className="flex items-center">
            <HeartRegular className="w-5 h-5 mr-3" />
            <span>Notifications</span>
          </div>
          {hasNotifications && (
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          )}
        </Link>

        <Link
          to={`/profile/${user.username}`}
          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          onClick={() => setShowDropdown(false)}
        >
          <PersonRegular className="w-5 h-5 mr-3" />
          <span>Profile</span>
        </Link>

        <Link
          to="/settings"
          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          onClick={() => setShowDropdown(false)}
        >
          <SettingsRegular className="w-5 h-5 mr-3" />
          <span>Settings</span>
        </Link>

        <Link
          to="/roadmap"
          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          onClick={() => setShowDropdown(false)}
        >
          <DocumentRegular className="w-5 h-5 mr-3" />
          <span>Roadmap</span>
        </Link>

        {user?.isAdmin && (
          <Link
            to="/admin"
            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setShowDropdown(false)}
          >
            <ShieldRegular className="w-5 h-5 mr-3" />
            <span>Admin Dashboard</span>
          </Link>
        )}

        <div className="border-t my-1"></div>

        <button
          onClick={() => {
            handleLogout();
            setShowDropdown(false);
          }}
          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
        >
          <SignOutRegular className="w-5 h-5 mr-3" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <DesktopOverlay />
      <div className={`fixed top-0 left-0 right-0 z-[100] transition-transform duration-300 ${
        visible ? 'translate-y-0' : '-translate-y-full'
      } ${
        theme === 'dark-theme'
          ? 'bg-gray-900 border-gray-800'
          : 'bg-white border-gray-200'
      } border-b`}>
        <div className="flex items-center h-16 px-4 max-w-6xl mx-auto justify-between">
          <Link to="/" className="flex items-center">
            <span className={`text-xl font-semibold ${
              theme === 'dark-theme' ? 'text-white' : 'text-black'
            }`}>
              <img src="/logos/logofull.svg" alt="Logo" className="mr-3 h-4 w-auto"/>
            </span>
          </Link>

          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`md:hidden p-2 rounded-md ${
              theme === 'dark-theme' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            <img
              src={user?.profilePicture 
                ? `${API_URL}/uploads/${user.profilePicture}`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}`
              }
              alt={user?.username}
              className="w-8 h-8 rounded-md object-cover"
              onError={(e) => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.username || 'User')}`;
              }}
            />
          </button>

          {showDropdown && (
            <div className="absolute top-full right-4 mt-1">
              {renderDropdownMenu()}
            </div>
          )}
        </div>
      </div>

      {/* Floating Mobile Navigation */}
      {!shouldHideNavbar && (
        <div className="md:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[90] w-50">
          <div className={`rounded-xl shadow-lg ${
            theme === 'dark-theme'
              ? 'bg-gray-900 border-gray-800'
              : 'bg-white border-gray-200'
          } border px-2`}>
            <div className="flex items-center h-14">
              {navigationItems.map((item, index) => (
                <div key={index} className="px-2">
                  {item.path ? (
                    <Link
                      to={item.path}
                      className={`p-2 rounded-full transition-colors ${
                        theme === 'dark-theme'
                          ? 'text-white hover:bg-gray-800'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {item.icon}
                    </Link>
                  ) : (
                    <button
                      onClick={item.action}
                      className={`p-2 rounded-full transition-colors ${
                        theme === 'dark-theme'
                          ? 'text-white hover:bg-gray-800'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {item.icon}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Feed Selection Menu */}
      {showFeedMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-[95] md:hidden flex items-end justify-center mb-5"
          onClick={() => setShowFeedMenu(false)}
        >
          <div 
            className="w-60 rounded-t-xl overflow-hidden transform transition-all duration-500 ease-in-out"
            style={{marginBottom: "calc(3rem + 8px)"}}
            onClick={e => e.stopPropagation()}
          >
            <div className={`p-4 border-b ${
              theme === 'dark-theme' ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
            }`}>
              <h3 className={`text-sm font-semibold ${
                theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
              }`}>Explore Feeds</h3>
            </div>
            <div className={`p-2 ${
              theme === 'dark-theme' ? 'bg-gray-900' : 'bg-white'
            }`}>
              <Link 
                to="/"
                className={`flex items-center p-3 rounded-lg ${
                  theme === 'dark-theme'
                    ? 'hover:bg-gray-800 text-white'
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
                onClick={() => setShowFeedMenu(false)}
              >
                <ImageMultipleRegular className="w-6 h-6 mr-3" />
                <span>Photos</span>
              </Link>
              <Link 
                to="/videos"
                className={`flex items-center p-3 rounded-lg ${
                  theme === 'dark-theme'
                    ? 'hover:bg-gray-800 text-white'
                    : 'hover:bg-gray-100 text-gray-900'
                }`}
                onClick={() => setShowFeedMenu(false)}
              >
                <VideoPersonPulseRegular className="w-6 h-6 mr-3" />
                <span>Moments</span>
              </Link>
              <div 
                className={`flex items-center p-3 rounded-lg opacity-50 cursor-not-allowed ${
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

      {/* Post Creator Modal */}
      <PostCreator 
        isOpen={isPostCreatorOpen}
        onClose={() => setIsPostCreatorOpen(false)}
      />
    </>
  );
};

export default Navbar;
