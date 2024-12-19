import React, { useState, useCallback, useContext } from 'react';
import Cropper from 'react-easy-crop';
import {
  FilterRegular,
  SelectObjectSkewEditRegular,
  CropRegular,
  ResizeVideoRegular,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import { ThemeContext } from '../../App';
import Slider from '@mui/material/Slider';

const ASPECT_RATIOS = {
  '9:16': 9/16,
  '16:9': 16/9,
  '4:5': 4/5,
  '1:1': 1,
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
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop) => {
  try {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

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

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(URL.createObjectURL(blob));
      }, 'image/jpeg', 1);
    });
  } catch (error) {
    console.error('Error in getCroppedImg:', error);
    throw error;
  }
};

const ImageEditor = ({ image, onSave, onBack }) => {
  const { theme } = useContext(ThemeContext);
  const isDarkTheme = theme === 'dark-theme';
  
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
  const [aspect, setAspect] = useState(ASPECT_RATIOS['4:5']);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getPreviewStyle = () => {
    const filterStyle = filters[selectedFilter];
    const { brightness, contrast, saturation, blur, temperature } = adjustments;
    return `${filterStyle} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) hue-rotate(${temperature}deg)`;
  };

  const handleSave = async () => {
    if (!croppedAreaPixels || !image) {
      setError('Invalid crop area or image');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      await onSave?.({
        croppedImage,
        filter: selectedFilter,
        adjustments,
        aspectRatio: aspect
      });
    } catch (err) {
      console.error('Error saving image:', err);
      setError('Failed to process image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = () => {
    setImageError(true);
    setError('Failed to load image');
  };

  const renderCropping = () => (
    <div className="relative h-[calc(100vh-300px)] min-h-[400px]">
      {!imageError ? (
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          objectFit="contain"
          classes={{
            containerClassName: 'h-full',
            mediaClassName: isDarkTheme ? 'brightness-100' : '',
          }}
          onError={handleImageError}
        />
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <ErrorCircleRegular className={`w-12 h-12 mx-auto mb-2 ${
              isDarkTheme ? 'text-red-400' : 'text-red-500'
            }`} />
            <p className={isDarkTheme ? 'text-gray-300' : 'text-gray-700'}>
              Failed to load image
            </p>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-4 bg-black/60 backdrop-blur-sm p-4 rounded-lg">
        <div>
          <p className="text-white text-sm mb-2">Zoom</p>
          <Slider
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            onChange={(_, value) => setZoom(value)}
            sx={{
              color: '#3b82f6',
              '& .MuiSlider-thumb': {
                backgroundColor: '#fff',
              },
              '& .MuiSlider-track': {
                backgroundColor: '#3b82f6',
              },
              '& .MuiSlider-rail': {
                backgroundColor: '#9ca3af',
              },
            }}
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
                  : 'bg-white/20 text-white hover:bg-white/30 transition-colors'
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
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-4">
      {Object.entries(filters).map(([name, value]) => (
        <button
          key={name}
          onClick={() => setSelectedFilter(name)}
          className={`flex flex-col items-center p-1 rounded-lg transition-all ${
            selectedFilter === name 
              ? 'ring-2 ring-blue-500 bg-blue-500/10' 
              : isDarkTheme
                ? 'hover:bg-gray-800'
                : 'hover:bg-gray-100'
          }`}
        >
          <div className="w-full aspect-square mb-2 rounded-lg overflow-hidden">
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
              style={{ filter: value }}
              onError={handleImageError}
            />
          </div>
          <span className={`text-xs ${
            isDarkTheme ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </span>
        </button>
      ))}
    </div>
  );

  const renderAdjustments = () => (
    <div className="p-4 space-y-6">
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
          <div key={name} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className={`text-sm font-medium ${
                isDarkTheme ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </span>
              <button
                onClick={() => setAdjustments(prev => ({
                  ...prev,
                  [name]: defaultValue
                }))}
                className={`text-xs px-2 py-1 rounded ${
                  isDarkTheme 
                    ? 'text-blue-400 hover:bg-blue-500/10' 
                    : 'text-blue-500 hover:bg-blue-50'
                } transition-colors`}
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
              sx={{
                color: '#3b82f6',
                '& .MuiSlider-thumb': {
                  backgroundColor: '#fff',
                  border: '2px solid #3b82f6',
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#3b82f6',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: isDarkTheme ? '#4b5563' : '#e5e7eb',
                },
              }}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={`flex flex-col h-full ${
      isDarkTheme ? 'bg-gray-900' : 'bg-white'
    }`}>
      {activeTab === 'crop' ? renderCropping() : (
        <div className="relative h-[calc(100vh-300px)] min-h-[400px]">
          <img
            src={image}
            alt="Preview"
            className="w-full h-full object-contain"
            style={{ filter: getPreviewStyle() }}
            onError={handleImageError}
          />
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className={`p-4 ${
          isDarkTheme ? 'bg-red-900/50 text-red-200' : 'bg-red-50 text-red-500'
        }`}>
          <div className="flex items-center">
            <ErrorCircleRegular className="w-5 h-5 mr-2" />
            {error}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className={`flex justify-around p-2 border-b ${
        isDarkTheme ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <button
          onClick={() => setActiveTab('crop')}
          className={`flex items-center p-3 rounded-lg transition-colors ${
            activeTab === 'crop' 
              ? 'bg-blue-500 text-white' 
              : isDarkTheme 
                ? 'text-gray-300 hover:bg-gray-800' 
                : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <CropRegular className="w-5 h-5 mr-2" />
          Crop
        </button>

        <button
          onClick={() => setActiveTab('filter')}
          className={`flex items-center p-3 rounded-lg transition-colors ${
            activeTab === 'filter'
              ? 'bg-blue-500 text-white'
              : isDarkTheme
                ? 'text-gray-300 hover:bg-gray-800'
                : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <FilterRegular className="w-5 h-5 mr-2" />
          Filters
        </button>

        <button
          onClick={() => setActiveTab('adjust')}
          className={`flex items-center p-3 rounded-lg transition-colors ${
            activeTab === 'adjust'
              ? 'bg-blue-500 text-white'
              : isDarkTheme
                ? 'text-gray-300 hover:bg-gray-800'
                : 'text-gray-700 hover:bg-gray-100'
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
        isDarkTheme ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <button
          onClick={onBack}
          disabled={loading}
          className={`px-4 py-2 rounded-lg transition-colors ${
            isDarkTheme
              ? 'bg-gray-800 text-white hover:bg-gray-700'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Back
        </button>
        <button
          onClick={handleSave}
          disabled={loading || imageError}
          className={`px-6 py-2 bg-blue-500 text-white rounded-lg transition-colors ${
            loading || imageError
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-blue-600'
          }`}
        >
          {loading ? 'Processing...' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default ImageEditor;
