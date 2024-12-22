import React, { useState } from 'react';
import {
  ImageRegular,
  VideoRegular,
  TimerRegular,
  LinkRegular,
  DismissRegular
} from '@fluentui/react-icons';
import axios from 'axios';
import { API_URL } from '../../config';

const PostCreator = ({ isOpen, onClose, onPostCreated, user }) => {
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [postType, setPostType] = useState('post'); // 'post' or 'story'

  const handleMediaUpload = async (acceptedFiles, rejectedFiles) => {
    // TODO: Implement media upload
    console.log('Media upload not implemented yet');
  };

  const handlePublish = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const result = await axios.post(`${API_URL}/api/posts`, 
        { content },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        }
      );

      onPostCreated?.(result.data);
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Error creating post');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-800">
        <button 
          onClick={onClose}
          className="text-blue-500 font-medium"
        >
          Discard
        </button>
        <span className="font-medium">CREATE</span>
        <button
          onClick={handlePublish}
          disabled={!content.trim() || loading}
          className="text-pink-500 font-medium disabled:opacity-50"
        >
          Publish
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <div className="flex gap-3">
          <img 
            src={user?.profileImage || '/default-avatar.png'} 
            alt="Profile" 
            className="w-8 h-8 rounded-full"
          />
          <div className="flex-1">
            <textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-transparent border-none outline-none resize-none text-white placeholder-gray-500"
              rows={4}
            />
            {showMediaOptions && (
              <div className="flex gap-2 mt-2 p-2 bg-gray-900 rounded-lg">
                <button className="p-2 hover:bg-gray-800 rounded-lg">
                  <ImageRegular className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-800 rounded-lg">
                  <VideoRegular className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-800 rounded-lg">
                  <TimerRegular className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-gray-800 rounded-lg">
                  <LinkRegular className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowMediaOptions(!showMediaOptions)}
          className="mt-4 w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center"
        >
          <span className="text-xl font-medium">+</span>
        </button>
      </div>

      {/* Bottom Bar */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-4">
          <button
            onClick={() => setPostType('post')}
            className={`px-4 py-1 rounded-full ${
              postType === 'post' 
                ? 'bg-pink-500 text-white' 
                : 'text-gray-400'
            }`}
          >
            POST
          </button>
          <button
            onClick={() => setPostType('story')}
            className={`px-4 py-1 rounded-full ${
              postType === 'story' 
                ? 'bg-pink-500 text-white' 
                : 'text-gray-400'
            }`}
          >
            STORY
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-500/90 text-white p-4 rounded-lg">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default PostCreator;
