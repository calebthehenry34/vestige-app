import React, { useState, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './global.scss';
import './index.css';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Home from './components/Home/Home';
import Profile from './components/Profile/Profile';
import Explore from './components/Explore/Explore';
import ActivityFeed from './components/Activity/ActivityFeed';
import Navbar from './components/Navigation/Navbar';
import OnboardingFlow from './components/Onboarding/OnboardingFlow';
import AdminDashboard from './components/Admin/Dashboard';
import ProfileSettings from './components/Profile/ProfileSettings';
import Chat from './components/Chat/Chat';
import SinglePost from './components/Post/SinglePost';
import VideoFeed from './components/Feed/VideoFeed';
import Roadmap from './components/Roadmap';
import { ScrollProvider } from './context/ScrollContext';


export const ThemeContext = createContext();

function App() {
  const [theme, setTheme] = useState('dark-theme');

  const toggleTheme = (selectedTheme) => {
    setTheme(selectedTheme);
    document.documentElement.className = selectedTheme;
    localStorage.setItem('theme', selectedTheme);
  };

  const ProtectedRouteWrapper = ({ children, requiresNav = true }) => {
    const location = useLocation();
    const { user, loading } = useAuth();
    
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" state={{ from: location }} replace />;
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
        {children}
      </>
    ) : children;
  };

  return (
    <Router>
      <AuthProvider>
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
          <ScrollProvider>
            <div className={`${theme === 'dark-theme' ? 'bg-gray-800 text-white' : 'bg-gray-50 text-black'} min-h-screen`}>
              <Routes>
                {/* Development Routes - These bypass authentication */}
                {process.env.NODE_ENV === 'development' && [
                  { path: "/dev/onboarding", element: <DevRouteWrapper component={OnboardingFlow} /> },
                  { path: "/dev/home", element: <DevRouteWrapper component={Home} /> },
                  { path: "/dev/profile", element: <DevRouteWrapper component={Profile} /> },
                  { path: "/dev/explore", element: <DevRouteWrapper component={Explore} /> },
                  { path: "/dev/activity", element: <DevRouteWrapper component={ActivityFeed} /> },
                  { path: "/dev/chat", element: <DevRouteWrapper component={Chat} /> },
                  { path: "/dev/settings", element: <DevRouteWrapper component={ProfileSettings} /> }
                ].map(({ path, element }) => (
                  <Route key={path} path={path} element={element} />
                ))}

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
                    <ProtectedRouteWrapper requiresNav={false}>
                      <AdminDashboard />
                    </ProtectedRouteWrapper>
                  }
                />
              </Routes>
            </div>
          </ScrollProvider>
        </ThemeContext.Provider>
      </AuthProvider>
    </Router>
  );
}

export default App;
