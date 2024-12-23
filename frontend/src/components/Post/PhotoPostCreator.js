import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { getProfileImageUrl } from '../../utils/imageUtils';
import { motion } from 'framer-motion';
import {
  BrightnessHighRegular,
  DarkThemeFilled,
  ColorRegular,
  FilterRegular,
  LocationRegular,
  TagRegular,
  HashtagRegular
} from '@fluentui/react-icons';
import { useDropzone } from 'react-dropzone';
import Cropper from 'react-easy-crop';

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
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [imageFilters, setImageFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0
  });
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': []
    },
    multiple: true,
    maxFiles: 10,
    onDrop: (acceptedFiles) => {
      const newImages = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        filters: { ...imageFilters }
      }));
      setImages(prev => [...prev, ...newImages].slice(0, 10));
    }
  });

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

  const handlePublish = async () => {
    // Process images with filters and crops before publishing
    const processedImages = await Promise.all(images.map(async (img) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const image = new Image();
      
      await new Promise((resolve) => {
        image.onload = resolve;
        image.src = img.preview;
      });
      
      canvas.width = image.width;
      canvas.height = image.height;
      
      // Apply filters
      ctx.filter = `
        brightness(${img.filters.brightness}%) 
        contrast(${img.filters.contrast}%) 
        saturate(${img.filters.saturation}%)
        blur(${img.filters.blur}px)
      `;
      
      ctx.drawImage(image, 0, 0);
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(new File([blob], 'processed-image.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg');
      });
    }));

    onPublish({
      type: 'photo',
      images: processedImages,
      caption,
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
              {showImageEditor ? (
                <Cropper
                  image={images[currentImageIndex].preview}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                />
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
                  onClick={() => setShowImageEditor(!showImageEditor)}
                  className="p-2 rounded-full bg-black/50 hover:bg-black/70"
                >
                  <FilterRegular className="w-5 h-5 text-white" />
                </button>
              </div>
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
              <textarea
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-white/50 resize-none"
                rows={3}
              />
              
              <div className="flex gap-2">
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
                
                <button className="p-3 bg-white/5 border border-white/10 rounded-lg">
                  <TagRegular className="w-5 h-5 text-white/70" />
                </button>
                
                <button className="p-3 bg-white/5 border border-white/10 rounded-lg">
                  <HashtagRegular className="w-5 h-5 text-white/70" />
                </button>
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
