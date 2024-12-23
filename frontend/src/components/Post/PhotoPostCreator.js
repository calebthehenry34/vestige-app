import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { 
  getProfileImageUrl, 
  getImageDimensions, 
  ASPECT_RATIOS,
  getAspectRatioDimensions 
} from '../../utils/imageUtils';
import { motion } from 'framer-motion';
import {
  BrightnessHighRegular,
  DarkThemeFilled,
  ColorRegular,
  FilterRegular,
  LocationRegular,
  CropRegular
} from '@fluentui/react-icons';
import { useDropzone } from 'react-dropzone';
import Cropper from 'react-easy-crop';
import { debounce } from 'lodash';

const PhotoPostCreator = ({ onBack, onPublish, user }) => {
  // Add profile section above the upload area
  const renderProfileSection = () => (
    <div className="flex items-center gap-3 mb-4">
      <img 
        src={getProfileImageUrl(user)} 
        alt="Profile" 
        className="w-8 h-8 rounded-full"
        onError={(e) => {
          e.target.src = `https://ui-avatars.com/api/?name=${user?.username || 'user'}&background=random`;
        }}
      />
      <span className="text-white/70">{user?.username || 'user'}</span>
    </div>
  );

  const [images, setImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectRatios, setAspectRatios] = useState([]);
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const captionRef = useRef(null);
  const [imageFilters, setImageFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0
  });

  // Function to fetch user suggestions
  const fetchUserSuggestions = async (query) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users/search?q=${query}`);
      const data = await response.json();
      return data.users || [];
    } catch (error) {
      console.error('Error fetching user suggestions:', error);
      return [];
    }
  };

  // Debounced version of the fetch function
  const debouncedFetch = useRef(
    debounce(async (query) => {
      const users = await fetchUserSuggestions(query);
      setUserSuggestions(users);
    }, 300)
  ).current;

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': []
    },
    multiple: true,
    maxFiles: 10,
    onDrop: async (acceptedFiles) => {
      const processedImages = await Promise.all(
        acceptedFiles.map(async (file) => {
          const dimensions = await getImageDimensions(file);
          return {
            file,
            preview: URL.createObjectURL(file),
            filters: { ...imageFilters },
            aspectRatio: dimensions.aspectRatio,
            originalAspectRatio: dimensions.aspectRatio
          };
        })
      );
      setImages(prev => [...prev, ...processedImages].slice(0, 10));
      setAspectRatios(prev => [
        ...prev,
        ...processedImages.map(img => img.aspectRatio)
      ].slice(0, 10));
    }
  });

  // Handle caption changes and @ mentions
  const handleCaptionChange = (e) => {
    const text = e.target.value;
    setCaption(text);
    setCursorPosition(e.target.selectionStart);

    // Check for @ mentions
    const lastAtSymbol = text.lastIndexOf('@', cursorPosition);
    if (lastAtSymbol !== -1) {
      const nextSpace = text.indexOf(' ', lastAtSymbol);
      const endIndex = nextSpace === -1 ? text.length : nextSpace;
      const query = text.slice(lastAtSymbol + 1, endIndex);
      
      if (query.length > 0) {
        setShowSuggestions(true);
        debouncedFetch(query);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle user suggestion selection
  const handleSuggestionClick = (username) => {
    const text = caption;
    const lastAtSymbol = text.lastIndexOf('@', cursorPosition);
    const nextSpace = text.indexOf(' ', lastAtSymbol);
    const endIndex = nextSpace === -1 ? text.length : nextSpace;
    
    const newText = 
      text.slice(0, lastAtSymbol) + 
      `@${username}` + 
      text.slice(endIndex);
    
    setCaption(newText);
    setShowSuggestions(false);
    
    // Focus back on textarea
    if (captionRef.current) {
      captionRef.current.focus();
    }
  };

  const handleFilterChange = (type, value) => {
    setImageFilters(prev => ({
      ...prev,
      [type]: value
    }));
    
    // Update current image's filters
    setImages(prev => prev.map((img, idx) => 
      idx === currentImageIndex 
        ? { ...img, filters: { ...img.filters, [type]: value } }
        : img
    ));
  };

  // Format caption with links
  const formatCaption = (text) => {
    // Replace @ mentions with links
    text = text.replace(/@(\w+)/g, '<a href="/user/$1" class="text-pink-500">@$1</a>');
    // Replace hashtags with links
    text = text.replace(/#(\w+)/g, '<a href="/tag/$1" class="text-pink-500">#$1</a>');
    return text;
  };

  const handlePublish = async () => {
    // Process images with filters and crops before publishing
    const processedImages = await Promise.all(images.map(async (img, index) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const image = new Image();
      
      await new Promise((resolve) => {
        image.onload = resolve;
        image.src = img.preview;
      });

      // Get aspect ratio dimensions
      const { width: aspectWidth, height: aspectHeight } = getAspectRatioDimensions(aspectRatios[index]);
      const aspectRatio = aspectWidth / aspectHeight;
      
      // Calculate dimensions to maintain aspect ratio
      let targetWidth = image.width;
      let targetHeight = image.height;
      const currentRatio = image.width / image.height;
      
      if (currentRatio > aspectRatio) {
        // Image is wider than target ratio
        targetWidth = targetHeight * aspectRatio;
      } else {
        // Image is taller than target ratio
        targetHeight = targetWidth / aspectRatio;
      }
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Apply filters
      ctx.filter = `
        brightness(${img.filters.brightness}%) 
        contrast(${img.filters.contrast}%) 
        saturate(${img.filters.saturation}%)
        blur(${img.filters.blur}px)
      `;
      
      // Calculate cropping position to center the image
      const sx = (image.width - targetWidth) / 2;
      const sy = (image.height - targetHeight) / 2;
      
      ctx.drawImage(image, sx, sy, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(new File([blob], 'processed-image.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg');
      });
    }));

    onPublish({
      type: 'photo',
      images: processedImages,
      caption: formatCaption(caption),
      location
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderProfileSection()}
        {images.length === 0 ? (
          // Upload Area
          <div
            {...getRootProps()}
            className="h-64 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center cursor-pointer hover:border-white/40 transition-colors"
          >
            <input {...getInputProps()} />
            <div className="text-center">
              <p className="text-white/70">Drag photos here or tap to select</p>
              <p className="text-sm text-white/50 mt-2">Up to 10 photos</p>
            </div>
          </div>
        ) : (
          // Image Preview and Editor
          <div className="space-y-4">
            {/* Current Image */}
            <div className="relative aspect-square rounded-lg overflow-hidden bg-black">
              {showCropper ? (
                <Cropper
                  image={images[currentImageIndex].preview}
                  crop={crop}
                  zoom={zoom}
                  aspect={(() => {
                    const { width, height } = getAspectRatioDimensions(aspectRatios[currentImageIndex]);
                    return width / height;
                  })()}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                />
              ) : showImageEditor ? (
                <div className="relative w-full h-full">
                  <img
                    src={images[currentImageIndex].preview}
                    alt={`Preview ${currentImageIndex + 1}`}
                    className="w-full h-full object-contain"
                    style={{
                      filter: `
                        brightness(${images[currentImageIndex].filters.brightness}%) 
                        contrast(${images[currentImageIndex].filters.contrast}%) 
                        saturate(${images[currentImageIndex].filters.saturation}%)
                        blur(${images[currentImageIndex].filters.blur}px)
                      `
                    }}
                  />
                </div>
              ) : (
                <img
                  src={images[currentImageIndex].preview}
                  alt={`Preview ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                  style={{
                    filter: `
                      brightness(${images[currentImageIndex].filters.brightness}%) 
                      contrast(${images[currentImageIndex].filters.contrast}%) 
                      saturate(${images[currentImageIndex].filters.saturation}%)
                      blur(${images[currentImageIndex].filters.blur}px)
                    `
                  }}
                />
              )}
              
              {/* Editor Controls */}
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                  onClick={() => {
                    setShowCropper(false);
                    setShowImageEditor(!showImageEditor);
                  }}
                  className="p-2 rounded-full bg-black/50 hover:bg-black/70"
                >
                  <FilterRegular className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => {
                    setShowImageEditor(false);
                    setShowCropper(!showCropper);
                  }}
                  className="p-2 rounded-full bg-black/50 hover:bg-black/70"
                >
                  <CropRegular className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Aspect Ratio Indicator */}
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/50 text-white/70 text-sm">
                {aspectRatios[currentImageIndex]}
              </div>

              {/* Aspect Ratio Selector */}
              {showCropper && (
                <div className="absolute top-4 right-4 flex gap-2">
                  {Object.values(ASPECT_RATIOS).map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => {
                        const newAspectRatios = [...aspectRatios];
                        newAspectRatios[currentImageIndex] = ratio;
                        setAspectRatios(newAspectRatios);
                      }}
                      className={`px-3 py-1 rounded-full text-sm ${
                        aspectRatios[currentImageIndex] === ratio
                          ? 'bg-pink-500 text-white'
                          : 'bg-black/50 text-white/70 hover:bg-black/70'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Image Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <motion.button
                    key={img.preview}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden
                      ${currentImageIndex === idx ? 'ring-2 ring-pink-500' : ''}`}
                  >
                    <img
                      src={img.preview}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </motion.button>
                ))}
              </div>
            )}

            {/* Caption and Details */}
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  ref={captionRef}
                  placeholder="Write a caption... Use @ to mention users and # for hashtags"
                  value={caption}
                  onChange={handleCaptionChange}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' && showSuggestions) {
                      e.preventDefault();
                      // Handle suggestion navigation
                    }
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/50 resize-none"
                  rows={3}
                />
                
                {/* User Suggestions Dropdown */}
                {showSuggestions && userSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-gray-900 border border-white/10 rounded-lg max-h-40 overflow-y-auto">
                    {userSuggestions.map((user) => (
                      <button
                        key={user.username}
                        onClick={() => handleSuggestionClick(user.username)}
                        className="w-full px-3 py-2 text-left hover:bg-white/5 flex items-center gap-2"
                      >
                        <img
                          src={getProfileImageUrl(user)}
                          alt={user.username}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-white">{user.username}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3">
                <LocationRegular className="w-5 h-5 text-white/70" />
                <input
                  type="text"
                  placeholder="Add location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-transparent text-white placeholder-white/50 flex-1"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      {showImageEditor && images.length > 0 && (
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-2">
            <BrightnessHighRegular className="w-5 h-5 text-white/70" />
            <input
              type="range"
              min="0"
              max="200"
              value={images[currentImageIndex].filters.brightness}
              onChange={(e) => handleFilterChange('brightness', e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <DarkThemeFilled className="w-5 h-5 text-white/70" />
            <input
              type="range"
              min="0"
              max="200"
              value={images[currentImageIndex].filters.contrast}
              onChange={(e) => handleFilterChange('contrast', e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <ColorRegular className="w-5 h-5 text-white/70" />
            <input
              type="range"
              min="0"
              max="200"
              value={images[currentImageIndex].filters.saturation}
              onChange={(e) => handleFilterChange('saturation', e.target.value)}
              className="flex-1"
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10"
          >
            Back
          </button>
          <button
            onClick={handlePublish}
            disabled={images.length === 0}
            className="flex-1 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:hover:bg-pink-500"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

PhotoPostCreator.propTypes = {
  onBack: PropTypes.func.isRequired,
  onPublish: PropTypes.func.isRequired,
  user: PropTypes.shape({
    username: PropTypes.string,
  })
};

export default PhotoPostCreator;
