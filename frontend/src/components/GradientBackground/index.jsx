import React from 'react';

const GradientBackground = ({ children }) => {
  return (
    <div className="relative min-h-screen">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 opacity-90" />
      
      {/* Blur elements */}
      <div className="absolute top-[10%] left-[10%] w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
      <div className="absolute top-[20%] right-[20%] w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute bottom-[20%] left-[30%] w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />

      {/* Content overlay */}
      <div className="relative min-h-screen flex items-center justify-center px-4">
        {children}
      </div>
    </div>
  );
};

export default GradientBackground;