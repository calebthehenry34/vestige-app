import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { 
  getProfileImageUrl, 
  getImageDimensions,
  getAspectRatioDimensions 
} from '../../utils/imageUtils';
import { motion } from 'framer-motion';
import {
  BrightnessHighRegular,
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
        className="w-8 h-8 rounded-md"
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
  const [showFilters, setShowFilters] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [activeAdjustment, setActiveAdjustment] = useState(null);
  // Remove global crop/zoom state since each image will have its own
  const [defaultAspectRatio, setDefaultAspectRatio] = useState(null);
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const captionRef = useRef(null);
  // Define Instagram-like filter presets
  const FILTER_PRESETS = {
    Normal: { brightness: 100, contrast: 100, saturation: 100, vibrance: 100, clarity: 100, exposure: 100, highlights: 100, shadows: 100, blur: 0 },
    Clarendon: { brightness: 110, contrast: 130, saturation: 120, vibrance: 110, clarity: 110, exposure: 105, highlights: 110, shadows: 90, blur: 0 },
    Gingham: { brightness: 105, contrast: 90, saturation: 95, vibrance: 95, clarity: 95, exposure: 100, highlights: 95, shadows: 105, blur: 0 },
    Moon: { brightness: 95, contrast: 95, saturation: 0, vibrance: 0, clarity: 110, exposure: 95, highlights: 90, shadows: 110, blur: 0 },
    Lark: { brightness: 105, contrast: 95, saturation: 110, vibrance: 110, clarity: 100, exposure: 105, highlights: 105, shadows: 100, blur: 0 },
    Reyes: { brightness: 110, contrast: 85, saturation: 80, vibrance: 85, clarity: 90, exposure: 95, highlights: 90, shadows: 105, blur: 0 },
    Juno: { brightness: 105, contrast: 115, saturation: 115, vibrance: 110, clarity: 105, exposure: 100, highlights: 105, shadows: 95, blur: 0 }
  };

  const [selectedFilter, setSelectedFilter] = useState('Normal');
  const [imageFilters, setImageFilters] = useState(FILTER_PRESETS.Normal);

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
            originalAspectRatio: dimensions.aspectRatio,
            crop: { x: 0, y: 0 },
            zoom: 1
          };
        })
      );
      // Set default aspect ratio from first image if not already set
      if (!defaultAspectRatio && processedImages.length > 0) {
        setDefaultAspectRatio(processedImages[0].aspectRatio);
      }

      // Apply default aspect ratio to all images
      const aspectRatio = defaultAspectRatio || processedImages[0].aspectRatio;
      const imagesWithAspectRatio = processedImages.map(img => ({
        ...img,
        aspectRatio
      }));

      setImages(prev => [...prev, ...imagesWithAspectRatio].slice(0, 10));
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

  const handleFilterChange = (type, value, preset = null) => {
    if (preset) {
      setImageFilters(preset);
      setImages(prev => prev.map((img, idx) => 
        idx === currentImageIndex 
          ? { ...img, filters: preset }
          : img
      ));
      return;
    }

    // Convert the -100 to 100 range to 0 to 200 range
    const adjustedValue = Number(value) + 100;
    
    const newFilters = {
      ...imageFilters,
      [type]: adjustedValue
    };
    
    setImageFilters(newFilters);
    
    // Update current image's filters
    setImages(prev => prev.map((img, idx) => 
      idx === currentImageIndex 
        ? { ...img, filters: newFilters }
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
    // Use first image's aspect ratio for consistency
    const firstImageAspectRatio = images[0].aspectRatio;
    const processedImages = await Promise.all(images.map(async (img, index) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const image = new Image();
      
      await new Promise((resolve) => {
        image.onload = resolve;
        image.src = img.preview;
      });

      // Get dimensions based on first image's aspect ratio
      const { width: aspectWidth, height: aspectHeight } = getAspectRatioDimensions(firstImageAspectRatio);
      const aspectRatio = aspectWidth / aspectHeight;
      
      // Calculate dimensions to maintain first image's aspect ratio
      const currentRatio = image.width / image.height;
      let targetWidth, targetHeight;
      
      if (currentRatio > aspectRatio) {
        // Image is wider than target ratio
        targetHeight = image.height;
        targetWidth = targetHeight * aspectRatio;
      } else {
        // Image is taller than target ratio
        targetWidth = image.width;
        targetHeight = targetWidth / aspectRatio;
      }
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Apply filters
      ctx.filter = `
        brightness(${img.filters.brightness}%) 
        contrast(${img.filters.contrast}%) 
        saturate(${img.filters.saturation}%)
        opacity(${img.filters.vibrance}%)
        sepia(${img.filters.clarity - 100}%)
        brightness(${img.filters.exposure}%)
        brightness(${img.filters.highlights}%)
        brightness(${img.filters.shadows}%)
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
            <div className="relative rounded-lg overflow-hidden bg-black flex items-center justify-center" style={{ 
              height: images[currentImageIndex] ? 
                // If aspect ratio is greater than 9:16 (0.5625), use normal calculation
                // Otherwise, scale down the height for portrait images
                images[currentImageIndex].aspectRatio > 0.5625 ?
                  `min(${Math.round(window.innerWidth * (images[currentImageIndex].aspectRatio || 1))}px, calc(90vh - 300px))` :
                  `min(${Math.round(window.innerWidth * 0.5625)}px, calc(180vh - 300px))` 
                : 'min(600px, calc(90vh - 300px))',
              maxWidth: '100%'
            }}>
              {/* Overlay to close menus when clicking outside */}
              {(showImageEditor || showCropper || showFilters) && (
                <div 
                  className="absolute inset-0 bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowImageEditor(false);
                    setShowCropper(false);
                    setShowFilters(false);
                  }}
                />
              )}

              {showCropper ? (
                <>
                  {/* Close button for crop menu */}
                  <div className="absolute top-4 right-4 z-50">
                    <button
                      onClick={() => setShowCropper(false)}
                      className="p-2 rounded-full bg-black/50 hover:bg-black/70"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <Cropper
                    image={images[currentImageIndex].preview}
                    crop={images[currentImageIndex].crop}
                    zoom={images[currentImageIndex].zoom}
                    aspect={(() => {
                      const { width, height } = getAspectRatioDimensions(images[0].aspectRatio);
                      return width / height;
                    })()}
                    onCropChange={(newCrop) => {
                      setImages(prev => prev.map((img, idx) => 
                        idx === currentImageIndex 
                          ? { ...img, crop: newCrop }
                          : img
                      ));
                    }}
                    onZoomChange={(newZoom) => {
                      setImages(prev => prev.map((img, idx) => 
                        idx === currentImageIndex 
                          ? { ...img, zoom: newZoom }
                          : img
                      ));
                    }}
                    objectFit="contain"
                    showGrid={true}
                    style={{
                      containerStyle: {
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#000'
                      },
                      mediaStyle: {
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      },
                      cropAreaStyle: {
                        border: '2px solid #fff',
                        color: 'rgba(255, 255, 255, 0.5)'
                      }
                    }}
                  />
                </>
              ) : showImageEditor ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={images[currentImageIndex].preview}
                    alt={`Preview ${currentImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    console.error('Error loading image:', e);
                  }}
                    style={{
                      filter: `
                        brightness(${images[currentImageIndex].filters.brightness}%) 
                        contrast(${images[currentImageIndex].filters.contrast}%) 
                        saturate(${images[currentImageIndex].filters.saturation}%)
                        opacity(${images[currentImageIndex].filters.vibrance}%)
                        sepia(${images[currentImageIndex].filters.clarity - 100}%)
                        brightness(${images[currentImageIndex].filters.exposure}%)
                        brightness(${images[currentImageIndex].filters.highlights}%)
                        brightness(${images[currentImageIndex].filters.shadows}%)
                        blur(${images[currentImageIndex].filters.blur}px)
                      `
                    }}
                  />
                </div>
              ) : (
                <img
                  src={images[currentImageIndex].preview}
                  alt={`Preview ${currentImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                  style={{
                    filter: `
                      brightness(${images[currentImageIndex].filters.brightness}%) 
                      contrast(${images[currentImageIndex].filters.contrast}%) 
                      saturate(${images[currentImageIndex].filters.saturation}%)
                      opacity(${images[currentImageIndex].filters.vibrance}%)
                      sepia(${images[currentImageIndex].filters.clarity - 100}%)
                      brightness(${images[currentImageIndex].filters.exposure}%)
                      brightness(${images[currentImageIndex].filters.highlights}%)
                      brightness(${images[currentImageIndex].filters.shadows}%)
                      blur(${images[currentImageIndex].filters.blur}px)
                    `
                  }}
                />
              )}
              
              {/* Swipeable Image Container with Animations */}
              {images.length > 1 && (
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = offset.x;
                    if (Math.abs(swipe) > 50) {
                      if (swipe > 0 && currentImageIndex > 0) {
                        setCurrentImageIndex(prev => prev - 1);
                      } else if (swipe < 0 && currentImageIndex < images.length - 1) {
                        setCurrentImageIndex(prev => prev + 1);
                      }
                    }
                  }}
                  className="absolute inset-0"
                  initial={false}
                  animate={{
                    x: 0,
                    opacity: 1,
                    transition: {
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    }
                  }}
                  exit={{
                    opacity: 0,
                    transition: {
                      duration: 0.2
                    }
                  }}
                />
              )}

              {/* Slide Indicators with connecting lines - Moved to top */}
              {images.length > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center z-10">
                  {images.map((_, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && (
                        <motion.div 
                          className={`w-6 h-0.5 ${
                            idx === currentImageIndex || idx === currentImageIndex + 1
                              ? 'bg-white'
                              : 'bg-white/30'
                          }`}
                          initial={false}
                          animate={{
                            backgroundColor: idx === currentImageIndex || idx === currentImageIndex + 1
                              ? 'rgb(255, 255, 255)'
                              : 'rgba(255, 255, 255, 0.3)',
                          }}
                          transition={{
                            duration: 0.3
                          }}
                        />
                      )}
                      <motion.div
                        className={`w-2.5 h-2.5 rounded-full ${
                          idx === currentImageIndex ? 'bg-white' : 'bg-white/30'
                        }`}
                        animate={{
                          scale: idx === currentImageIndex ? 1.25 : 1,
                          backgroundColor: idx === currentImageIndex
                            ? 'rgb(255, 255, 255)'
                            : 'rgba(255, 255, 255, 0.3)',
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20
                        }}
                        onClick={() => setCurrentImageIndex(idx)}
                        style={{ cursor: 'pointer' }}
                      />
                    </React.Fragment>
                  ))}
                </div>
              )}


              {/* Editor Controls - Adjusted z-index */}
              <div className="absolute bottom-4 right-4 flex gap-2 z-20">
                <button
                  onClick={() => {
                    setShowCropper(false);
                    setShowFilters(false);
                    setShowImageEditor(!showImageEditor);
                  }}
                  className="p-2 rounded-full bg-black/50 hover:bg-black/70"
                >
                  <BrightnessHighRegular className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => {
                    setShowImageEditor(false);
                    setShowFilters(false);
                    setShowCropper(!showCropper);
                  }}
                  className="p-2 rounded-full bg-black/50 hover:bg-black/70"
                >
                  <CropRegular className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => {
                    setShowImageEditor(false);
                    setShowCropper(false);
                    setShowFilters(!showFilters);
                  }}
                  className="p-2 rounded-full bg-black/50 hover:bg-black/70"
                >
                  <FilterRegular className="w-5 h-5 text-white" />
                </button>
                {images.length > 1 && (
                  <button
                    onClick={() => setShowReorderModal(true)}
                    className="p-2 rounded-full bg-black/50 hover:bg-black/70"
                  >
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Aspect Ratio Indicator - Moved to bottom left */}
              <div className="absolute bottom-20 left-4 px-3 py-1 rounded-full bg-black/50 text-white/70 text-sm">
                {images[currentImageIndex]?.aspectRatio || defaultAspectRatio}
              </div>

              {/* Aspect Ratio Info */}
              {showCropper && (
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/50 text-white/70 text-sm">
                  Aspect ratio locked to first image
                </div>
              )}
            </div>

            {/* Caption and Details - Hidden during editing */}
            {!showCropper && !showImageEditor && !showFilters && (
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
            )}
          </div>
        )}
      </div>

      {/* Adjustment Controls */}
      {showImageEditor && images.length > 0 && (
        <div className="p-4 border-t border-white/10">
          {/* Close button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowImageEditor(false)}
              className="p-2 rounded-full hover:bg-white/10"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable Icons */}
          <div className="flex overflow-x-auto gap-6 py-4 px-2">
            {[
              { name: 'brightness', icon: <BrightnessHighRegular className="w-6 h-6" /> },
              { name: 'contrast', icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                  <path d="M12 2v20" strokeWidth="2"/>
                </svg>
              )},
              { name: 'saturation', icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 2v20M17 12H7" strokeWidth="2"/>
                </svg>
              )},
              { name: 'vibrance', icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 2v20M17 12H7M12 7v10" strokeWidth="2"/>
                </svg>
              )},
              { name: 'clarity', icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 4l16 16M4 20L20 4" strokeWidth="2"/>
                </svg>
              )},
              { name: 'exposure', icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="5" strokeWidth="2"/>
                  <path d="M12 2v4M12 18v4M4 12H2M22 12h-2M6 6l-2-2M18 18l2 2M18 6l2-2M6 18l-2 2" strokeWidth="2"/>
                </svg>
              )},
              { name: 'highlights', icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 2v20M17 12h5M2 12h5" strokeWidth="2"/>
                </svg>
              )},
              { name: 'shadows', icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 2v20M7 12H2M22 12h-5" strokeWidth="2"/>
                </svg>
              )}
            ].map(({ name, icon }) => (
              <div key={name} className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setActiveAdjustment(activeAdjustment === name ? null : name)}
                  className={`p-3 rounded-full ${
                    activeAdjustment === name ? 'bg-white/20' : 'bg-white/5'
                  } hover:bg-white/10 transition-colors`}
                >
                  <div className="text-white/70">{icon}</div>
                </button>
                <span className="text-xs text-white/70 capitalize">{name}</span>
              </div>
            ))}
          </div>

          {/* Active Adjustment Slider */}
          {activeAdjustment && (
            <div className="mt-4 px-4">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={images[currentImageIndex].filters[activeAdjustment] - 100}
                  onChange={(e) => handleFilterChange(activeAdjustment, e.target.value)}
                  className="flex-1"
                />
                <button
                  onClick={() => handleFilterChange(activeAdjustment, 0)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10"
                >
                  <svg className="w-4 h-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l16 16m0-16L4 20" />
                  </svg>
                </button>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-white/50">-100</span>
                <span className="text-xs text-white/50">0</span>
                <span className="text-xs text-white/50">+100</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Controls */}
      {showFilters && images.length > 0 && (
        <div className="p-4 border-t border-white/10">
          {/* Close button */}
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setShowFilters(false)}
              className="p-2 rounded-full hover:bg-white/10"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Selected Filter Name */}
          <div className="text-center mb-4">
            <span className="text-white/70">{selectedFilter}</span>
          </div>
          
          {/* Filter Presets */}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {Object.entries(FILTER_PRESETS).map(([name, filters]) => (
              <button
                key={name}
                onClick={() => {
                  setSelectedFilter(name);
                  handleFilterChange(null, null, filters);
                }}
                className={`flex-shrink-0 flex flex-col items-center gap-2 ${
                  selectedFilter === name ? 'opacity-100' : 'opacity-70'
                }`}
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden">
                  <img
                    src={images[currentImageIndex].preview}
                    alt={`Preview with ${name} filter applied`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Error loading filter preview:', e);
                    }}
                    style={{
                      filter: `
                        brightness(${filters.brightness}%) 
                        contrast(${filters.contrast}%) 
                        saturate(${filters.saturation}%)
                        opacity(${filters.vibrance}%)
                        sepia(${filters.clarity - 100}%)
                        brightness(${filters.exposure}%)
                        brightness(${filters.highlights}%)
                        brightness(${filters.shadows}%)
                      `
                    }}
                  />
                </div>
                <span className="text-xs text-white/70">{name}</span>
              </button>
            ))}
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
            Cancel
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

      {/* Reorder Modal */}
      {showReorderModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white text-lg">Reorder Images</h3>
              <button
                onClick={() => setShowReorderModal(false)}
                className="text-white/70 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, idx) => (
                <motion.div
                  key={img.preview}
                  drag
                  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                  dragElastic={1}
                  className={`relative aspect-square rounded-lg overflow-hidden cursor-move
                    ${currentImageIndex === idx ? 'ring-2 ring-pink-500' : ''}`}
                  whileDrag={{
                    scale: 1.1,
                    zIndex: 50,
                    transition: {
                      duration: 0.2
                    }
                  }}
                  onDragEnd={(e, { offset, velocity }) => {
                    const moveThreshold = 50;
                    if (Math.abs(offset.x) >= moveThreshold || Math.abs(offset.y) >= moveThreshold) {
                      // Find the closest position based on mouse/touch position
                      const element = e.target;
                      const rect = element.getBoundingClientRect();
                      const centerX = rect.x + rect.width / 2;
                      const centerY = rect.y + rect.height / 2;
                      
                      // Find the element we're hovering over
                      const elements = document.elementsFromPoint(centerX, centerY);
                      const dropTarget = elements.find(el => 
                        el !== element && el.getAttribute('data-image-index') !== null
                      );
                      
                      if (dropTarget) {
                        const newIndex = parseInt(dropTarget.getAttribute('data-image-index'));
                        if (newIndex !== idx) {
                          const newImages = [...images];
                          const [movedImage] = newImages.splice(idx, 1);
                          newImages.splice(newIndex, 0, movedImage);
                          setImages(newImages);
                          setCurrentImageIndex(newIndex);
                        }
                      }
                    }
                  }}
                  data-image-index={idx}
                >
                  <img
                    src={img.preview}
                    alt={`Preview of uploaded post ${idx + 1} - Click and drag to reorder`}
                    className="w-full h-full object-cover pointer-events-none"
                    onError={(e) => {
                      console.error('Error loading thumbnail:', e);
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm">#{idx + 1}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <button
              onClick={() => setShowReorderModal(false)}
              className="w-full mt-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
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
