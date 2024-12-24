import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { StripeProvider } from './context/StripeContext';
import './global.scss';
import './index.css';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Home from './components/Home/Home';
import Profile from './components/Profile/Profile';
import Explore from './components/Explore/Explore';
import ExploreNew from './components/Explore/explorenew';
import HashtagSearch from './components/Explore/HashtagSearch';
import UsersPage from './components/Explore/UsersPage';
import ActivityFeed from './components/Activity/ActivityFeed';
import Navbar from './components/Navigation/Navbar';
import MobileNav from './components/Navigation/MobileNav';
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import AdminDashboard from './components/Admin/Dashboard';
import ProfileSettings from './components/Profile/ProfileSettings';
import Chat from './components/Chat/Chat';
import SinglePost from './components/Post/SinglePost';
import VideoFeed from './components/Feed/VideoFeed';
import Roadmap from './components/Roadmap';
import Toast from './components/Common/Toast';
import { ScrollProvider } from './context/ScrollContext';
import { ErrorCircleRegular } from '@fluentui/react-icons';
import PostCreator from './components/Post/PostCreator';

import { ThemeProvider, useTheme } from './context/ThemeContext';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    const { theme } = this.props;
    if (this.state.hasError) {
      return (
        <div className={`min-h-screen flex items-center justify-center ${
          theme === 'dark-theme' ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
          <div className="text-center p-8">
            <ErrorCircleRegular className={`w-16 h-16 mx-auto mb-4 ${
              theme === 'dark-theme' ? 'text-red-400' : 'text-red-500'
            }`} />
            <h1 className={`text-xl font-bold mb-2 ${
              theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
            }`}>
              Something went wrong
            </h1>
            <p className={
              theme === 'dark-theme' ? 'text-gray-300' : 'text-gray-600'
            }>
              Please try refreshing the page
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const LoadingSpinner = ({ theme }) => (
  <div className={`min-h-screen flex items-center justify-center ${
    theme === 'dark-theme' ? 'bg-gray-900' : 'bg-gray-50'
  }`}>
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

function App() {
  const { theme, isThemeLoaded } = useTheme();

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  const ProtectedRouteWrapper = ({ children, requiresNav = true, requiresAdmin = false }) => {
    const location = useLocation();
    const { user, loading } = useAuth();
    const [showPostCreator, setShowPostCreator] = useState(false);
    
    if (loading || !isThemeLoaded) {
      return <LoadingSpinner theme={theme} />;
    }

    if (!user) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiresAdmin && !user.isAdmin) {
      return <Navigate to="/" replace />;
    }

    if (!user.onboardingComplete && location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }

    if (user.onboardingComplete && location.pathname === '/onboarding') {
      return <Navigate to="/" replace />;
    }

    return requiresNav ? (
      <>
        <Navbar />
        <ErrorBoundary theme={theme}>
          {children}
        </ErrorBoundary>
        <PostCreator
          isOpen={showPostCreator}
          onClose={() => setShowPostCreator(false)}
          onPostCreated={() => setShowPostCreator(false)}
        />
        <MobileNav onPostCreatorClick={() => setShowPostCreator(true)} />
      </>
    ) : (
      <ErrorBoundary theme={theme}>
        {children}
      </ErrorBoundary>
    );
  };

  if (!isThemeLoaded) {
    return <LoadingSpinner theme={theme} />;
  }

  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <ThemeProvider>
            <StripeProvider>
              <ScrollProvider>
              <ErrorBoundary theme={theme}>
                <div className={`${
                  theme === 'dark-theme' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-black'
                } min-h-screen`}>
                  <Toast />
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Videos Route without Navbar */}
                    <Route
                      path="/videos"
                      element={
                        <ProtectedRouteWrapper requiresNav={false}>
                          <VideoFeed />
                        </ProtectedRouteWrapper>
                      }
                    />

                    {/* Protected Routes with Navbar */}
                    {[
                      { path: "/", element: <Home /> },
                      { path: "/explore", element: <Explore /> },
                      { path: "/explore/users", element: <UsersPage /> },
                      { path: "/explore/hashtags", element: <HashtagSearch /> },
                      { path: "/explore/hashtag/:hashtag", element: <HashtagSearch /> },
                      { path: "/explorenew", element: <ExploreNew /> },
                      { path: "/activity", element: <ActivityFeed /> },
                      { path: "/chat", element: <Chat /> },
                      { path: "/settings", element: <ProfileSettings /> },
                      { path: "/profile/:username", element: <Profile /> },
                      { path: "/post/:id", element: <SinglePost /> },
                      { path: "/roadmap", element: <Roadmap /> }
                    ].map(({ path, element }) => (
                      <Route
                        key={path}
                        path={path}
                        element={
                          <ProtectedRouteWrapper>
                            {element}
                          </ProtectedRouteWrapper>
                        }
                      />
                    ))}

                    {/* Special Routes */}
                    <Route 
                      path="/onboarding" 
                      element={
                        <ProtectedRouteWrapper requiresNav={false}>
                          <OnboardingFlow />
                        </ProtectedRouteWrapper>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRouteWrapper requiresNav={false} requiresAdmin={true}>
                          <AdminDashboard />
                        </ProtectedRouteWrapper>
                      }
                    />

                    {/* Catch-all route */}
                    <Route
                      path="*"
                      element={
                        <div className={`min-h-screen flex items-center justify-center ${
                          theme === 'dark-theme' ? 'bg-gray-900' : 'bg-gray-50'
                        }`}>
                          <div className="text-center p-8">
                            <h1 className={`text-xl font-bold mb-2 ${
                              theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
                            }`}>
                              Page Not Found
                            </h1>
                            <p className={
                              theme === 'dark-theme' ? 'text-gray-300' : 'text-gray-600'
                            }>
                              The page you're looking for doesn't exist
                            </p>
                            <button
                              onClick={() => window.history.back()}
                              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                              Go Back
                            </button>
                          </div>
                        </div>
                      }
                    />
                  </Routes>
                </div>
              </ErrorBoundary>
              </ScrollProvider>
            </StripeProvider>
          </ThemeProvider>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
