import React, { useState, useRef } from 'react';
import {
  ImageRegular,
  VideoRegular,
  DismissRegular,
  TextBulletListRegular,
  StarRegular,
  BrightnessHighRegular,
  DarkThemeFilled,
  ColorRegular,
  FilterRegular
} from '@fluentui/react-icons';
import axios from 'axios';
import { API_URL } from '../../config';
import { getProfileImageUrl } from '../../utils/imageUtils';

const PostCreator = ({ isOpen, onClose, onPostCreated, user }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [postType, setPostType] = useState('post'); // 'post', 'story', 'moment'
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [imageFilters, setImageFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0
  });
  const canvasRef = useRef(null);

  const handleMediaUpload = async (files, type) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (type === 'image' && !file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    
    if (type === 'video' && !file.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      if (type === 'image') {
        setSelectedImage(file);
        setShowImageEditor(true);
      } else if (type === 'video') {
        setSelectedVideo(file);
        setVideoUrl(URL.createObjectURL(file));
      }

      const formData = new FormData();
      formData.append('media', file);

      const token = localStorage.getItem('token');
      const result = await axios.post(
        `${API_URL}/api/posts`, 
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          withCredentials: true
        }
      );

      const mediaUrl = result.data.mediaUrl || result.data.url;
      if (type === 'image') {
        setImageUrl(mediaUrl);
      } else if (type === 'video') {
        setVideoUrl(mediaUrl);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Error uploading image');
      if (type === 'image') {
        setSelectedImage(null);
        setShowImageEditor(false);
      } else if (type === 'video') {
        setSelectedVideo(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const applyImageFilters = () => {
    if (!canvasRef.current || !selectedImage) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.filter = `
        brightness(${imageFilters.brightness}%) 
        contrast(${imageFilters.contrast}%) 
        saturate(${imageFilters.saturation}%)
        blur(${imageFilters.blur}px)
      `;
      
      ctx.drawImage(img, 0, 0);
      
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'filtered-image.jpg', { type: 'image/jpeg' });
        await handleMediaUpload([file], 'image');
      }, 'image/jpeg');
    };
    
    img.src = URL.createObjectURL(selectedImage);
  };

  const handlePublish = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const postData = {
        caption: content,
        type: postType,
        transparency: true // Adding transparency field
      };

      if (imageUrl) {
        postData.imageUrl = imageUrl;
      }
      if (videoUrl) {
        postData.videoUrl = videoUrl;
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
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex gap-3">
          <img 
            src={getProfileImageUrl(user)} 
            alt="Profile" 
            className="w-8 h-8 rounded-full"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${user?.username || 'user'}&background=random`;
            }}
          />
          <div className="flex-1">
            <textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-transparent border-none outline-none resize-none text-white placeholder-gray-500"
              rows={4}
            />
            {selectedImage && !showImageEditor && (
              <div className="mt-4 relative">
                <img
                  src={URL.createObjectURL(selectedImage)}
                  alt="Selected"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={() => setShowImageEditor(true)}
                  className="absolute bottom-2 right-2 p-2 rounded-full bg-black/50 hover:bg-black/70"
                >
                  <FilterRegular className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setImageUrl(null);
                    setShowImageEditor(false);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/50 hover:bg-black/70"
                >
                  <DismissRegular className="w-5 h-5 text-white" />
                </button>
              </div>
            )}
            
            {showImageEditor && selectedImage && (
              <div className="mt-4 space-y-4">
                <canvas ref={canvasRef} className="hidden" />
                <img
                  src={URL.createObjectURL(selectedImage)}
                  alt="Editor Preview"
                  className="w-full h-48 object-cover rounded-lg"
                  style={{
                    filter: `
                      brightness(${imageFilters.brightness}%) 
                      contrast(${imageFilters.contrast}%) 
                      saturate(${imageFilters.saturation}%)
                      blur(${imageFilters.blur}px)
                    `
                  }}
                />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BrightnessHighRegular className="w-5 h-5" />
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={imageFilters.brightness}
                      onChange={(e) => setImageFilters(prev => ({
                        ...prev,
                        brightness: e.target.value
                      }))}
                      className="flex-1"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DarkThemeFilled className="w-5 h-5" />
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={imageFilters.contrast}
                      onChange={(e) => setImageFilters(prev => ({
                        ...prev,
                        contrast: e.target.value
                      }))}
                      className="flex-1"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <ColorRegular className="w-5 h-5" />
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={imageFilters.saturation}
                      onChange={(e) => setImageFilters(prev => ({
                        ...prev,
                        saturation: e.target.value
                      }))}
                      className="flex-1"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <FilterRegular className="w-5 h-5" />
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={imageFilters.blur}
                      onChange={(e) => setImageFilters(prev => ({
                        ...prev,
                        blur: e.target.value
                      }))}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowImageEditor(false);
                      setImageFilters({
                        brightness: 100,
                        contrast: 100,
                        saturation: 100,
                        blur: 0
                      });
                    }}
                    className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyImageFilters}
                    className="flex-1 py-2 rounded-lg bg-pink-500 hover:bg-pink-600"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
            
            {selectedVideo && (
              <div className="mt-4 relative">
                <video
                  src={videoUrl}
                  className="w-full h-48 object-cover rounded-lg"
                  controls
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
              className={`flex items-center gap-1 px-4 py-1 rounded-full ${
                postType === 'post' 
                  ? 'bg-pink-500 text-white' 
                  : 'text-gray-400'
              }`}
            >
              <TextBulletListRegular className="w-4 h-4" />
              POST
            </button>
            <button
              onClick={() => setPostType('story')}
              className={`flex items-center gap-1 px-4 py-1 rounded-full ${
                postType === 'story' 
                  ? 'bg-pink-500 text-white' 
                  : 'text-gray-400'
              }`}
            >
              <StarRegular className="w-4 h-4" />
              STORY
            </button>
            <button
              onClick={() => setPostType('moment')}
              className={`flex items-center gap-1 px-4 py-1 rounded-full ${
                postType === 'moment' 
                  ? 'bg-pink-500 text-white' 
                  : 'text-gray-400'
              }`}
            >
              <ImageRegular className="w-4 h-4" />
              MOMENT
            </button>
          </div>
          
          <div className="flex gap-4 pt-2 border-t border-gray-800">
            <input
              type="file"
              id="imageUpload"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleMediaUpload(e.target.files, 'image')}
            />
            <label 
              htmlFor="imageUpload"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 cursor-pointer"
            >
              <ImageRegular className="w-5 h-5" />
              <span>Photo</span>
            </label>
            
            <input
              type="file"
              id="videoUpload"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleMediaUpload(e.target.files, 'video')}
            />
            <label 
              htmlFor="videoUpload"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 cursor-pointer"
            >
              <VideoRegular className="w-5 h-5" />
              <span>Video</span>
            </label>
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
