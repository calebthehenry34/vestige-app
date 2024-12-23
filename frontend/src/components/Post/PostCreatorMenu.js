import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ImageRegular,
  EditRegular,
  ClockRegular,
  VideoRegular
} from '@fluentui/react-icons';

const PostCreatorMenu = ({ isOpen, onClose, onOptionSelect }) => {
  const handleOptionClick = (option) => {
    if (navigator.vibrate) {
      navigator.vibrate(50); // Haptic feedback
    }
    onOptionSelect(option);
  };

  const menuOptions = [
    {
      id: 'photo',
      icon: <ImageRegular className="w-6 h-6" />,
      label: 'Photo',
      description: 'Share your favorite moments'
    },
    {
      id: 'write',
      icon: <EditRegular className="w-6 h-6" />,
      label: 'Write',
      description: 'Express your thoughts'
    },
    {
      id: 'moments',
      icon: <ClockRegular className="w-6 h-6" />,
      label: 'Moments',
      description: 'Share your day'
    },
    {
      id: 'video',
      icon: <VideoRegular className="w-6 h-6" />,
      label: 'Video',
      description: 'Coming soon',
      disabled: true
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50"
          />

          {/* Menu */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4"
          >
            <div className="relative mx-auto max-w-lg rounded-2xl overflow-hidden">
              {/* Glassmorphism container */}
              <div
                className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-xl"
                style={{
                  backdropFilter: 'blur(20px)',
                }}
              >
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white">Create</h2>
                </div>

                {/* Options */}
                <div className="divide-y divide-white/10">
                  {menuOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => !option.disabled && handleOptionClick(option.id)}
                      className={`w-full px-6 py-4 flex items-center gap-4 text-left transition-colors
                        ${option.disabled 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-white/5 active:bg-white/10'}`
                      }
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                        {option.icon}
                      </div>
                      <div>
                        <div className="font-medium text-white">{option.label}</div>
                        <div className="text-sm text-white/70">{option.description}</div>
                      </div>
                      {option.disabled && (
                        <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-white/10 text-white/70">
                          Coming Soon
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Cancel button */}
                <button
                  onClick={onClose}
                  className="w-full px-6 py-4 text-center text-white font-medium border-t border-white/10 hover:bg-white/5 active:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PostCreatorMenu;
