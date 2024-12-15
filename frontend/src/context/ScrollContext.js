import React, { createContext, useContext, useState } from 'react';

const ScrollContext = createContext();

export const ScrollProvider = ({ children }) => {
  const [scrollPositions, setScrollPositions] = useState({});

  const saveScrollPosition = (route) => {
    setScrollPositions(prev => ({
      ...prev,
      [route]: window.scrollY
    }));
  };

  const restoreScrollPosition = (route) => {
    requestAnimationFrame(() => {
      if (scrollPositions[route] !== undefined) {
        window.scrollTo(0, scrollPositions[route]);
      }
    });
  };

  return (
    <ScrollContext.Provider value={{ saveScrollPosition, restoreScrollPosition }}>
      {children}
    </ScrollContext.Provider>
  );
};

export const useScroll = () => {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScroll must be used within a ScrollProvider');
  }
  return context;
};