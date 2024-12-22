import React, { createContext, useContext, useState, useEffect } from 'react';

const ScrollContext = createContext();

export const ScrollProvider = ({ children }) => {
  const [scrollPositions, setScrollPositions] = useState({});
  const [scrollY, setScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      setScrollY(currentScroll);
      setIsScrolled(currentScroll > 0);
      
      // Update CSS variable for scroll-driven animations
      document.documentElement.style.setProperty('--scroll-y', currentScroll);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <ScrollContext.Provider value={{ 
      saveScrollPosition, 
      restoreScrollPosition,
      scrollY,
      isScrolled
    }}>
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
