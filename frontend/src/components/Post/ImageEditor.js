import React, { useState, useCallback, useContext } from 'react';
import Cropper from 'react-easy-crop';
import {
  FilterRegular,
  SelectObjectSkewEditRegular,
  CropRegular,
  ResizeVideoRegular,
} from '@fluentui/react-icons';
import { ThemeContext } from '../../App';
import Slider from '@mui/material/Slider';

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
  cool: 'brightness(1.1) saturate(.8) hue-rotate(30deg)',
  vintage: 'sepia(.5) hue-rotate(-30deg)',
  dramatic: 'contrast(1.4) brightness(.9)',
  silver: 'saturate(.6) brightness(1.1)',
  matte: 'contrast(.95) brightness(1.05) saturate(.9)',
};

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Set canvas size to match the desired crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Canvas is empty');
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, 'image/jpeg', 1);
  });
};

const ImageEditor = ({ image, onSave, onBack }) => {
  const { theme } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState('crop');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    temperature: 0,
  });
  
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(ASPECT_RATIOS['1:1']);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getPreviewStyle = () => {
    const filterStyle = filters[selectedFilter];
    const { brightness, contrast, saturation, blur, temperature } = adjustments;
    return `${filterStyle} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) hue-rotate(${temperature}deg)`;
  };

  const handleSave = async () => {
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      onSave({
        croppedImage,
        filter: selectedFilter,
        adjustments
      });
    } catch (e) {
      console.error('Error getting cropped image:', e);
    }
  };

  const renderCropping = () => (
    <div className="relative h-[60vh]">
      <Cropper
        image={image}
        crop={crop}
        zoom={zoom}
        aspect={aspect}
        onCropChange={setCrop}
        onZoomChange={setZoom}
        onCropComplete={onCropComplete}
        classes={{
          containerClassName: 'h-full',
          mediaClassName: theme === 'dark-theme' ? 'brightness-90' : '',
        }}
      />
      <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-4 bg-black/50 p-4 rounded-lg">
        <div>
          <p className="text-white text-sm mb-2">Zoom</p>
          <Slider
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            onChange={(_, value) => setZoom(value)}
          />
        </div>
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {Object.entries(ASPECT_RATIOS).map(([name, ratio]) => (
            <button
              key={name}
              onClick={() => setAspect(ratio)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                aspect === ratio
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/20 text-white'
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
      {Object.entries(adjustments).map(([name, value]) => {
        const getConfig = () => {
          switch (name) {
            case 'brightness':
            case 'contrast':
            case 'saturation':
              return { min: 0, max: 200, defaultValue: 100 };
            case 'blur':
              return { min: 0, max: 10, defaultValue: 0 };
            case 'temperature':
              return { min: -30, max: 30, defaultValue: 0 };
            default:
              return { min: 0, max: 100, defaultValue: 100 };
          }
        };

        const { min, max, defaultValue } = getConfig();

        return (
          <div key={name}>
            <div className="flex justify-between mb-2">
              <span className={`text-sm ${
                theme === 'dark-theme' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </span>
              <button
                onClick={() => setAdjustments(prev => ({
                  ...prev,
                  [name]: defaultValue
                }))}
                className="text-blue-500 text-sm"
              >
                Reset
              </button>
            </div>
            <Slider
              value={value}
              min={min}
              max={max}
              onChange={(_, newValue) => setAdjustments(prev => ({
                ...prev,
                [name]: newValue
              }))}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={`flex flex-col h-full ${
      theme === 'dark-theme' ? 'bg-black' : 'bg-white'
    }`}>
      {activeTab === 'crop' ? renderCropping() : (
        <div className="relative aspect-square bg-black">
          <img
            src={image}
            alt="Preview"
            className="w-full h-full object-contain"
            style={{ filter: getPreviewStyle() }}
          />
        </div>
      )}
      
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
          onClick={handleSave}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ImageEditor;
