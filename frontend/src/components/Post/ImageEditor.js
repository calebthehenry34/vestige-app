import React, { useState, useRef, useContext, useEffect } from 'react';
import {
  FilterRegular,
  SelectObjectSkewEditRegular,
  CropRegular,
  ResizeVideoRegular,
} from '@fluentui/react-icons';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { ThemeContext } from '../../App';

const ASPECT_RATIOS = {
  'original': undefined,
  '1:1': 1,
  '4:5': 4/5,
  '16:9': 16/9,
};


const filters = {
  none: '',
  chrome: 'brightness(1.1) contrast(1.1) saturate(1.1)',
  fade: 'brightness(1.1) contrast(.9) saturate(.8)',
  mono: 'grayscale(1)',
  noir: 'brightness(1.1) contrast(1.2) grayscale(1)',
  vivid: 'brightness(1.1) contrast(1.2) saturate(1.4)',
  warm: 'brightness(1.1) sepia(.3)',
  cool: 'brightness(1.1) saturate(.8) hue-rotate(30deg)'
};

function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

const ImageEditor = ({ image, onSave, onBack }) => {
  const { theme } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState('crop');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100
  });
  
  const [crop, setCrop] = useState();
  const [aspect, setAspect] = useState(ASPECT_RATIOS['1:1']);
  const [completedCrop, setCompletedCrop] = useState();
  const imgRef = useRef(null);
  
  // Initialize crop on image load
  useEffect(() => {
    const initializeCrop = () => {
      if (imgRef.current) {
        const { width, height } = imgRef.current;
        const newCrop = centerAspectCrop(width, height, aspect);
        setCrop(newCrop);
        setCompletedCrop(newCrop);
      }
    };
  
    if (image) {
      // Wait for image to load
      const img = new Image();
      img.src = image;
      img.onload = initializeCrop;
    }
  }, [aspect, image]);

  const getPreviewStyle = () => {
    const filterStyle = filters[selectedFilter];
    const adjustStyle = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;
    return `${filterStyle} ${adjustStyle}`;
  };

  const renderImagePreview = () => (
    <div className="relative aspect-square bg-black">
      <img
        src={image}
        alt="Preview"
        className="w-full h-full object-contain"
        style={{ filter: activeTab !== 'crop' ? getPreviewStyle() : undefined }}
      />
    </div>
  );


  const renderFilters = () => (
    <div className="grid grid-cols-4 gap-2 p-4">
      {Object.entries(filters).map(([name, value]) => (
        <button
          key={name}
          onClick={() => setSelectedFilter(name)}
          className={`flex flex-col items-center ${
            selectedFilter === name ? 'ring-2 ring-blue-500 rounded-lg' : ''
          }`}
        >
          <div className="w-full aspect-square mb-2 rounded-lg overflow-hidden">
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
              style={{ filter: value }}
            />
          </div>
          <span className={`text-xs ${
            theme === 'dark-theme' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </span>
        </button>
      ))}
    </div>
  );
  
  const renderAdjustments = () => (
    <div className="p-4 space-y-4">
      {Object.entries(adjustments).map(([name, value]) => (
        <div key={name}>
          <div className="flex justify-between mb-2">
            <span className={`text-sm ${
              theme === 'dark-theme' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </span>
            <span className={`text-sm ${
              theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {value}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={value}
            onChange={(e) => setAdjustments({
              ...adjustments,
              [name]: parseInt(e.target.value)
            })}
            className="w-full"
          />
        </div>
      ))}
    </div>
  );

  const getCroppedImg = async () => {
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
  
    if (!image || !completedCrop) return null;
  
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
  
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
  
    // Apply current filter and adjustments
    const style = getPreviewStyle();
    ctx.filter = style;
  
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );
  
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedImageUrl = URL.createObjectURL(blob);
          resolve(croppedImageUrl);
        }
      }, 'image/jpeg', 1);
    });
  };
  
  // Update the save button click handler
  <button
    onClick={async () => {
      const croppedImage = await getCroppedImg();
      if (croppedImage) {
        onSave({
          croppedImage,
          filter: selectedFilter,
          adjustments
        });
      }
    }}
    className="px-6 py-2 bg-blue-500 text-white rounded-lg"
  >
    Next
  </button>

const renderCropping = () => (
  <div className="flex flex-col">
    <div className="relative aspect-square bg-black">
      <ReactCrop
        crop={crop}
        onChange={(_, percentCrop) => setCrop(percentCrop)}
        onComplete={(c) => setCompletedCrop(c)}
        aspect={aspect}
        className={theme === 'dark-theme' ? 'dark-crop' : ''}
      >
        <img
          ref={imgRef}
          alt="Crop"
          src={image}
          className="w-full h-full object-contain"
        />
      </ReactCrop>
    </div>
    <div className="p-4">
        <div className="flex space-x-2 overflow-x-auto">
          {Object.entries(ASPECT_RATIOS).map(([name, ratio]) => (
            <button
              key={name}
              onClick={() => setAspect(ratio)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                aspect === ratio
                  ? 'bg-blue-500 text-white'
                  : theme === 'dark-theme'
                    ? 'bg-gray-800 text-gray-300'
                    : 'bg-gray-100 text-gray-900'
              }`}
            >
              <ResizeVideoRegular className="w-4 h-4 mr-2 inline-block" />
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
      
      <div className="relative aspect-square bg-black">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspect}
          className={theme === 'dark-theme' ? 'dark-crop' : ''}
        >
          <img
            ref={imgRef}
            alt="Crop"
            src={image}
            className="w-full h-full object-contain"
          />
        </ReactCrop>
      </div>


  return (
    <div className={`flex flex-col h-full ${
      theme === 'dark-theme' ? 'bg-black' : 'bg-white'
    }`}>
      {activeTab === 'crop' ? renderCropping() : renderImagePreview()}
      
      {/* Tabs */}
      <div className="flex justify-around p-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('crop')}
          className={`flex items-center p-3 rounded-lg ${
            activeTab === 'crop' 
              ? 'bg-blue-500 text-white' 
              : theme === 'dark-theme' 
                ? 'text-gray-300'
                : 'text-gray-700'
          }`}
        >
          <CropRegular className="w-5 h-5 mr-2" />
          Crop
        </button>

        <button
          onClick={() => setActiveTab('filter')}
          className={`flex items-center p-3 rounded-lg ${
            activeTab === 'filter'
              ? 'bg-blue-500 text-white'
              : theme === 'dark-theme'
                ? 'text-gray-300'
                : 'text-gray-700'
          }`}
        >
          <FilterRegular className="w-5 h-5 mr-2" />
          Filters
        </button>
        <button
          onClick={() => setActiveTab('adjust')}
          className={`flex items-center p-3 rounded-lg ${
            activeTab === 'adjust'
              ? 'bg-blue-500 text-white'
              : theme === 'dark-theme'
                ? 'text-gray-300'
                : 'text-gray-700'
          }`}
        >
          <SelectObjectSkewEditRegular className="w-5 h-5 mr-2" />
          Adjust
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'filter'
          ? renderFilters()
          : activeTab === 'adjust'
          ? renderAdjustments()
          : null
        }
      </div>
      {/* Action Buttons */}
      <div className={`flex justify-between p-4 border-t ${
        theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <button
          onClick={onBack}
          className={`px-4 py-2 rounded-lg ${
            theme === 'dark-theme'
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          Back
        </button>
        <button
          onClick={async () => {
            const croppedImage = await getCroppedImg();
            onSave({
              croppedImage,
              filter: selectedFilter,
              adjustments
            });
          }}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ImageEditor;