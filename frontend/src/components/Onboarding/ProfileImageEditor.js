import React, { useState, useCallback, useContext } from 'react';
import Cropper from 'react-easy-crop';
import { ThemeContext } from '../../App';
import { ErrorCircleRegular } from '@fluentui/react-icons';

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

const ProfileImageEditor = ({ image, onSave, onBack }) => {
  const { theme } = useContext(ThemeContext);
  const isDarkTheme = theme === 'dark-theme';

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels || !image) {
      setError('Invalid crop area or image');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      await onSave?.({ croppedImage });
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

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${
      isDarkTheme ? 'bg-gray-900' : 'bg-black'
    }`}>
      <div className="relative flex-1">
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
            zoomWithScroll={true}  // Enable pinch zoom
            minZoom={1}
            maxZoom={3}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <ErrorCircleRegular className={`w-12 h-12 mx-auto mb-2 ${
                isDarkTheme ? 'text-red-400' : 'text-red-500'
              }`} />
              <p className="text-white">
                Failed to load image
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-900/50 text-red-200">
          <div className="flex items-center">
            <ErrorCircleRegular className="w-5 h-5 mr-2" />
            {error}
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex justify-between p-4 bg-black/90 backdrop-blur-sm">
        <button
          onClick={onBack}
          disabled={loading}
          className={`px-6 py-2 bg-white/10 text-white rounded-lg transition-colors ${
            loading 
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-white/20'
          }`}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading || imageError}
          className={`px-6 py-2 bg-[#ae52e3] text-white rounded-lg transition-colors ${
            loading || imageError
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-[#9a3dd0]'
          }`}
        >
          {loading ? 'Processing...' : 'Choose'}
        </button>
      </div>
    </div>
  );
};

export default ProfileImageEditor;
