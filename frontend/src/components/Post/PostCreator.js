import React, { useState } from 'react';
import {
  ImageRegular,
  VideoRegular,
  DismissRegular
} from '@fluentui/react-icons';
import axios from 'axios';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';

const PostCreator = ({ isOpen, onClose, onPostCreated, user }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [postType, setPostType] = useState('post'); // 'post' or 'story'
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  const handleMediaUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSelectedImage(file);

      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('token');
      const result = await axios.post(
        `${API_URL}/api/posts/upload`, 
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          withCredentials: true
        }
      );

      setImageUrl(result.data.imageUrl);
    } catch (error) {
      setError(error.response?.data?.error || 'Error uploading image');
      setSelectedImage(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const postData = {
        content,
        type: postType
      };

      if (imageUrl) {
        postData.imageUrl = imageUrl;
      }

      const result = await axios.post(
        `${API_URL}/api/posts`, 
        postData,
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
          disabled={(!content.trim() && !selectedImage) || loading}
          className="text-pink-500 font-medium disabled:opacity-50"
        >
          Publish
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <div className="flex gap-3">
          <img 
            src={getProfileImageUrl(user?.profileImage, user?.username)} 
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
            {selectedImage && (
              <div className="mt-4 relative">
                <img
                  src={URL.createObjectURL(selectedImage)}
                  alt="Selected"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setImageUrl(null);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/50 hover:bg-black/70"
                >
                  <DismissRegular className="w-5 h-5 text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex flex-col gap-4">
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
          
          <div className="flex gap-4 pt-2 border-t border-gray-800">
            <input
              type="file"
              id="imageUpload"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleMediaUpload(e.target.files)}
            />
            <label 
              htmlFor="imageUpload"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 cursor-pointer"
            >
              <ImageRegular className="w-5 h-5" />
              <span>Photo</span>
            </label>
            
            <button 
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 opacity-50 cursor-not-allowed"
              disabled
            >
              <VideoRegular className="w-5 h-5" />
              <span>Video</span>
            </button>
          </div>
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
