// frontend/src/components/Post/ShareModal.js
import React, { useState } from 'react';
import { DismissRegular, CopyRegular, } from '@fluentui/react-icons';

const ShareModal = ({ isOpen, onClose, post }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const postUrl = `${window.location.origin}/post/${post._id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Share Post</h3>
            <button onClick={onClose}>
              <DismissRegular className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Copy Link */}
          <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg mb-4">
            <div className="truncate flex-1 mr-4">
              {postUrl}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <CopyRegular className="w-5 h-5 mr-1" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          
        </div>
      </div>
    </div>
  );
};

export default ShareModal;