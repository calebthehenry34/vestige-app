import React, { useState, useCallback, useContext } from 'react';
import Cropper from 'react-easy-crop';
import {
  ArrowLeft,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import { ThemeContext } from '../../App';
import Slider from '@mui/material/Slider';
import styles from '../Onboarding/OnboardingFlow.module.css';

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
  
  const [step, setStep] = useState('crop');
  const [slideDirection, setSlideDirection] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100
  });
  
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleNext = () => {
    if (step === 'crop') {
      setSlideDirection(styles.slideLeft);
      setTimeout(() => {
        setStep('filter');
        setSlideDirection(styles.slideNext);
      }, 300);
    } else if (step === 'filter') {
      setSlideDirection(styles.slideLeft);
      setTimeout(() => {
        setStep('adjust');
        setSlideDirection(styles.slideNext);
      }, 300);
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    if (step === 'adjust') {
      setSlideDirection(styles.slideRight);
      setTimeout(() => {
        setStep('filter');
        setSlideDirection(styles.slideNext);
      }, 300);
    } else if (step === 'filter') {
      setSlideDirection(styles.slideRight);
      setTimeout(() => {
        setStep('crop');
        setSlideDirection(styles.slideNext);
      }, 300);
    } else {
      onBack();
    }
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
        aspectRatio: 4/5
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

  const renderNavigation = () => (
    <div className="p-6 border-b border-[#333333] grid grid-cols-3 items-center">
      <div className="flex items-center">
        <button onClick={handleBack} className="text-white hover:text-gray-300 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>
      <div className="flex text-xs justify-center text-gray-200">
        {step === 'crop' ? 'Crop' : step === 'filter' ? 'Filters' : 'Adjustments'}
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={loading}
          className="px-4 py-2 bg-[#ae52e3] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#9a3dd0]"
        >
          {step === 'adjust' ? 'Done' : 'Next'}
        </button>
      </div>
    </div>
  );

  const renderCropping = () => (
    <div className={`${styles.cardContainer} ${slideDirection}`}>
      <div className={`${styles.card} h-full`}>
        <div className="relative h-full">
          {!imageError ? (
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={4/5}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid={true}
              cropShape="rect"
              objectFit="contain"
              classes={{
                containerClassName: 'h-full',
                mediaClassName: isDarkTheme ? 'brightness-100' : '',
              }}
              onError={handleImageError}
              zoomWithScroll={true}
              minZoom={1}
              maxZoom={3}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <ErrorCircleRegular className="w-12 h-12 mx-auto mb-2 text-red-400" />
                <p className="text-white">Failed to load image</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className={`${styles.cardContainer} ${slideDirection}`}>
      <div className={`${styles.card} overflow-auto`}>
        <div className="grid grid-cols-3 gap-3 p-4">
          {Object.entries(filters).map(([name, value]) => (
            <button
              key={name}
              onClick={() => setSelectedFilter(name)}
              className={`flex flex-col items-center p-1 rounded-lg transition-all ${
                selectedFilter === name 
                  ? 'ring-2 ring-[#ae52e3] bg-[#ae52e3]/10' 
                  : 'hover:bg-white/5'
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
              <span className="text-xs text-white">
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAdjustments = () => (
    <div className={`${styles.cardContainer} ${slideDirection}`}>
      <div className={`${styles.card} overflow-auto`}>
        <div className="p-4 space-y-6">
          {Object.entries(adjustments).map(([name, value]) => (
            <div key={name} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white">
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </span>
                <button
                  onClick={() => setAdjustments(prev => ({
                    ...prev,
                    [name]: 100
                  }))}
                  className="text-xs px-2 py-1 rounded text-[#ae52e3] hover:bg-[#ae52e3]/10 transition-colors"
                >
                  Reset
                </button>
              </div>
              <Slider
                value={value}
                min={0}
                max={200}
                onChange={(_, newValue) => setAdjustments(prev => ({
                  ...prev,
                  [name]: newValue
                }))}
                sx={{
                  color: '#ae52e3',
                  '& .MuiSlider-thumb': {
                    backgroundColor: '#fff',
                    border: '2px solid #ae52e3',
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: '#ae52e3',
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: '#4b5563',
                  },
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-black flex flex-col">
      {renderNavigation()}
      <div className="flex-1 relative overflow-hidden">
        {step === 'crop' && renderCropping()}
        {step === 'filter' && renderFilters()}
        {step === 'adjust' && renderAdjustments()}
      </div>

      {error && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-500/90 text-white p-4 rounded-lg backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <ErrorCircleRegular className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Error</p>
              <p>{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageEditor;
