import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize user from localStorage if available
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (token, userData) => {
    try {
      if (!token) {
        throw new Error('No token provided');
      }

      // Verify token format
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }

      // Store token
      localStorage.setItem('token', token);
      
      // Store user data
      const userString = JSON.stringify(userData);
      localStorage.setItem('user', userString);
      
      // Update state
      setUser(userData);

      // Verify storage
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken !== token) {
        throw new Error('Token storage verification failed');
      }
      
      if (storedUser !== userString) {
        throw new Error('User data storage verification failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      // Clean up any partial data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');  // Changed from 'userData' to match storage key
    setUser(null);
  };

  const updateUser = (updatedData) => {
    try {
      const userString = JSON.stringify(updatedData);
      localStorage.setItem('user', userString);  // Changed from 'userData' to 'user'
      setUser(updatedData);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};