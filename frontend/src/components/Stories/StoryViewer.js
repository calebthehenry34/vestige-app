import React, { useState, useEffect, useCallback } from 'react';
import {
  DismissRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  ArrowLeftFilled
} from '@fluentui/react-icons';

const StoryViewer = ({ stories, currentIndex = 0, onClose }) => {
  const [activeStory, setActiveStory] = useState(currentIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const mockStories = [
    {
      id: 1,
      user: {
        username: 'johndoe',
        profilePicture: '/api/placeholder/32/32'
      },
      media: '/api/placeholder/1080/1920',
      type: 'image',
      duration: 5000,
      createdAt: '2h'
    },
    {
      id: 2,
      user: {
        username: 'janedoe',
        profilePicture: '/api/placeholder/32/32'
      },
      media: '/api/placeholder/1080/1920',
      type: 'image',
      duration: 5000,
      createdAt: '1h'
    }
  ];

  const storiesData = stories || mockStories;

  useEffect(() => {
    let intervalId;
    if (!isPaused) {
      intervalId = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            if (activeStory < storiesData.length - 1) {
              setActiveStory(prev => prev + 1);
              return 0;
            } else {
              clearInterval(intervalId);
              onClose();
              return 100;
            }
          }
          return prev + (100 / (storiesData[activeStory].duration / 100));
        });
      }, 100);
    }

    return () => clearInterval(intervalId);
  }, [activeStory, isPaused, storiesData, onClose]);

  const handlePrevStory = useCallback(() => {
    if (activeStory > 0) {
      setActiveStory(prev => prev - 1);
      setProgress(0);
    }
  }, [activeStory]);

  const handleNextStory = useCallback(() => {
    if (activeStory < storiesData.length - 1) {
      setActiveStory(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [activeStory, storiesData.length, onClose]);

  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowLeftFilled':
        handlePrevStory();
        break;
      case 'ArrowRight':
        handleNextStory();
        break;
      case 'Escape':
        onClose();
        break;
      default:
        break;
    }
  }, [handlePrevStory, handleNextStory, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1">
        {storiesData.map((story, index) => (
          <div
            key={story.id}
            className="h-0.5 bg-gray-600 flex-1 overflow-hidden"
          >
            <div
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{
                width: `${index === activeStory ? progress : index < activeStory ? '100' : '0'}%`
              }}
            />
          </div>
        ))}
      </div>

      {/* User info */}
      <div className="absolute top-8 left-4 flex items-center">
        <img
          src={storiesData[activeStory].user.profilePicture}
          alt={storiesData[activeStory].user.username}
          className="w-8 h-8 rounded-full"
        />
        <span className="ml-2 text-white font-semibold">
          {storiesData[activeStory].user.username}
        </span>
        <span className="ml-2 text-gray-300 text-sm">
          {storiesData[activeStory].createdAt}
        </span>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-8 right-4 text-white p-2 hover:bg-gray-800 rounded-full"
      >
        <DismissRegular className="w-6 h-6" />
      </button>

      {/* Story content */}
      <div
        className="relative max-w-lg w-full h-[calc(100vh-120px)]"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {storiesData[activeStory].type === 'image' && (
          <img
            src={storiesData[activeStory].media}
            alt=""
            className="w-full h-full object-contain"
          />
        )}

        {/* Navigation buttons */}
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 hover:bg-gray-800/50 rounded-full"
          onClick={handlePrevStory}
          disabled={activeStory === 0}
        >
          <ChevronLeftRegular className="w-6 h-6" />
        </button>

        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 hover:bg-gray-800/50 rounded-full"
          onClick={handleNextStory}
          disabled={activeStory === storiesData.length - 1}
        >
          <ChevronRightRegular className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default StoryViewer;