import React, { createContext, useContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'dark-theme';
  });
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (!isThemeLoaded) setIsThemeLoaded(true);
  }, [theme, isThemeLoaded]);

  const toggleTheme = (selectedTheme) => {
    if (selectedTheme === theme) return;
    setTheme(selectedTheme);
  };

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark-theme',
    isThemeLoaded
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
