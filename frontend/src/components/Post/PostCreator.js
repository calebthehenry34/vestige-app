import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Cropper from 'react-easy-crop';
import {
  ImageRegular,
  ArrowLeftFilled,
  ArrowRightFilled,
  ErrorCircleRegular,
  CheckmarkCircleFilled,
  NumberSymbolFilled,
  PersonTagRegular,
  LocationRegular,
} from '@fluentui/react-icons';
import ImageEditor from './ImageEditor';
import axios from 'axios';
import { API_URL } from '../../config';
import styles from '../Onboarding/OnboardingFlow.module.css';
import LocationAutocomplete from '../Common/LocationAutocomplete';
import { 
  generateImageSizes, 
  clearOldCache, 
  checkWebPSupport,
  generateBlurPlaceholder,
  createImageProps 
} from '../../utils/imageUtils';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        // Convert blob to File for compression
        const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
        resolve(file);
      }, 'image/jpeg', 1);
    });
  } catch (error) {
    console.error('Error in getCroppedImg:', error);
    throw error;
  }
};

const PostCreator = ({ isOpen, onClose, onPostCreated }) => {
  const initialState = {
    step: 'upload',
    slideDirection: '',
    media: null,
    croppedMedia: null,
    editedMedia: null,
    caption: '',
    location: '',
    uploadProgress: 0,
    error: null,
    loading: false,
    success: false,
    crop: { x: 0, y: 0 },
    zoom: 1,
    croppedAreaPixels: null,
    originalFile: null,
    blurPlaceholder: null,
    supportsWebP: false,
    processedImages: null
  };

  const [state, setState] = useState(initialState);

  useEffect(() => {
    const checkWebP = async () => {
      const webpSupported = await checkWebPSupport();
      setState(prev => ({ ...prev, supportsWebP: webpSupported }));
    };
    checkWebP();
  }, []);

  const resetState = () => {
    setState(initialState);
  };

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    setState(prev => ({ ...prev, error: null }));
    
    if (rejectedFiles.length > 0) {
      const { errors } = rejectedFiles[0];
      if (errors[0]?.code === 'file-too-large') {
        setState(prev => ({ ...prev, error: 'File is too large. Maximum size is 50MB.' }));
      } else if (errors[0]?.code === 'file-invalid-type') {
        setState(prev => ({ ...prev, error: 'Invalid file type. Please upload a JPEG or PNG image.' }));
      }
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      try {
        // Generate blur placeholder immediately
        const blurPlaceholder = await generateBlurPlaceholder(file);
        setState(prev => ({ 
          ...prev, 
          originalFile: file,
          blurPlaceholder
        }));

        const reader = new FileReader();
        reader.onloadend = () => {
          setState(prev => ({
            ...prev,
            media: reader.result,
            slideDirection: styles.slideLeft
          }));
          setTimeout(() => {
            setState(prev => ({
              ...prev,
              step: 'crop',
              slideDirection: styles.slideNext
            }));
          }, 300);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Error processing image:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to process image. Please try again.'
        }));
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: MAX_FILE_SIZE,
    multiple: false
  });

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setState(prev => ({ ...prev, croppedAreaPixels }));
  }, []);

  const handleCropSave = async () => {
    try {
      if (!state.croppedAreaPixels || !state.media) {
        throw new Error('Invalid crop area or image');
      }

      const croppedFile = await getCroppedImg(state.media, state.croppedAreaPixels);
      const croppedUrl = URL.createObjectURL(croppedFile);
      
      // Generate new blur placeholder for cropped image
      const blurPlaceholder = await generateBlurPlaceholder(croppedFile);
      
      setState(prev => ({
        ...prev,
        croppedMedia: croppedUrl,
        originalFile: croppedFile,
        blurPlaceholder,
        slideDirection: styles.slideLeft
      }));

      setTimeout(() => {
        setState(prev => ({
          ...prev,
          step: 'filters',
          slideDirection: styles.slideNext
        }));
      }, 300);
    } catch (error) {
      console.error('Error saving crop:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to process image. Please try again.'
      }));
    }
  };

  const handleEditComplete = async ({ filter, adjustments }) => {
    setState(prev => ({
      ...prev,
      editedMedia: {
        url: prev.croppedMedia,
        filter: filter || '',
        adjustments: adjustments ? 
          `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)` 
          : ''
      },
      slideDirection: styles.slideLeft
    }));
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        step: 'caption',
        slideDirection: styles.slideNext
      }));
    }, 300);
  };

  const handleShare = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Apply filters and adjustments to get final image
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      const processedImage = await new Promise((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          canvas.width = img.width;
          canvas.height = img.height;
          
          ctx.filter = `${state.editedMedia.filter} ${state.editedMedia.adjustments}`;
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob(async (blob) => {
            const finalFile = new File([blob], 'image.jpg', { type: state.supportsWebP ? 'image/webp' : 'image/jpeg' });
            
            try {
              // Generate and compress different sizes
              const sizes = await generateImageSizes(finalFile);
              resolve(sizes);
            } catch (error) {
              reject(error);
            }
          }, state.supportsWebP ? 'image/webp' : 'image/jpeg', 0.85);
        };
        
        img.onerror = reject;
        img.src = state.editedMedia.url;
      });

      // Clear old cached images
      await clearOldCache();

      // Create form data with all image sizes
      const formData = new FormData();
      formData.append('media', processedImage.large);
      formData.append('media_small', processedImage.small);
      formData.append('media_medium', processedImage.medium);
      formData.append('media_thumbnail', processedImage.thumbnail);
      formData.append('blur_placeholder', processedImage.blurPlaceholder);
      formData.append('caption', state.caption);
      if (state.location) {
        formData.append('location', state.location);
      }

      const token = localStorage.getItem('token');
      const result = await axios.post(`${API_URL}/api/posts`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setState(prev => ({ ...prev, uploadProgress: progress }));
        }
      });

      setState(prev => ({ ...prev, success: true, loading: false }));
      
      setTimeout(() => {
        resetState();
        onClose();
        if (onPostCreated) {
          onPostCreated(result.data);
        }
      }, 2000);
    } catch (error) {
      console.error('Error creating post:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Error creating post';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        uploadProgress: 0,
        loading: false
      }));
    }
  };

  const handleNext = () => {
    if (state.step === 'filters') {
      handleEditComplete({ filter: '', adjustments: null });
    } else if (state.step === 'crop') {
      handleCropSave();
    }
  };

  const handleBack = () => {
    setState(prev => ({
      ...prev,
      slideDirection: styles.slideRight
    }));
    setTimeout(() => {
      setState(prev => {
        let newStep;
        switch (prev.step) {
          case 'crop':
            newStep = 'upload';
            break;
          case 'filters':
            newStep = 'crop';
            break;
          case 'caption':
            newStep = 'filters';
            break;
          default:
            return prev;
        }
        return {
          ...prev,
          step: newStep,
          slideDirection: styles.slideNext
        };
      });
    }, 300);
  };

  const getStepLabel = () => {
    switch (state.step) {
      case 'upload': return 'New Post';
      case 'crop': return 'Crop Photo';
      case 'filters': return 'Edit Photo';
      case 'caption': return 'Share Post';
      default: return '';
    }
  };

  const renderNavigation = () => (
    <div className="card-header p-6 border-b border-[#333333] grid grid-cols-3 items-center">
      <div className="flex items-center">
        {state.step !== 'upload' && (
          <button onClick={handleBack} className="text-white hover:text-gray-300 transition-colors">
            <ArrowLeftFilled className="w-6 h-6" />
          </button>
        )}
      </div>
      <div className="flex text-xs justify-center text-gray-200">
        {getStepLabel()}
      </div>
      <div className="flex justify-end">
        {(state.step === 'filters' || state.step === 'crop') && (
          <button onClick={handleNext} className="text-white hover:text-gray-300 transition-colors">
            <ArrowRightFilled className="w-6 h-6" />
          </button>
        )}
        {state.step === 'caption' && (
          <button
            onClick={handleShare}
            disabled={state.loading || state.uploadProgress > 0}
            className="px-4 py-2 bg-[#ae52e3] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#9a3dd0]"
          >
            {state.loading ? 'Sharing...' : 'Share'}
          </button>
        )}
      </div>
    </div>
  );

  const renderUpload = () => (
    <div className={`${styles.cardContainer} ${state.slideDirection}`}>
      <div className={`${styles.card} overflow-auto p-4 flex flex-col h-full`}>
        <div {...getRootProps()} className="flex-1 p-8 mb-4 rounded-lg border-2 border-dashed cursor-pointer transition-all hover:border-[#ae52e3] border-gray-800 bg-[#1a1a1a] flex items-center justify-center">
          <input {...getInputProps()} />
          <div className="text-center">
            <ImageRegular className="w-12 h-12 mx-auto mb-4 text-[#ae52e3]" />
            <p className="font-medium text-white">
              {isDragActive ? 'Drop photo here' : 'Add a photo'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCrop = () => (
    <div className={`${styles.cardContainer} ${state.slideDirection}`}>
      <div className={`${styles.card} overflow-hidden`} style={{ height: 'calc(100vh - 200px)' }}>
        <div className="relative h-full">
          <Cropper
            image={state.media}
            crop={state.crop}
            zoom={state.zoom}
            aspect={4/5}
            onCropChange={crop => setState(prev => ({ ...prev, crop }))}
            onZoomChange={zoom => setState(prev => ({ ...prev, zoom }))}
            onCropComplete={onCropComplete}
            showGrid={true}
            cropShape="rect"
            objectFit="contain"
            zoomWithScroll={true}
            minZoom={1}
            maxZoom={3}
          />
        </div>
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className={`${styles.cardContainer} ${state.slideDirection}`}>
      <div className={`${styles.card} overflow-hidden`} style={{ height: 'calc(100vh - 200px)' }}>
        <ImageEditor 
          image={state.croppedMedia}
          onSave={handleEditComplete}
        />
      </div>
    </div>
  );

  const renderCaption = () => (
    <div className={`${styles.cardContainer} ${state.slideDirection}`}>
      <div className={`${styles.card} overflow-auto`}>
        <div className="h-full flex flex-col">
          {/* Preview Image with Blur Placeholder */}
          <div className="relative w-full" style={{ maxHeight: 'calc(100vh - 400px)' }}>
            {state.blurPlaceholder && (
              <div
                className="absolute inset-0 bg-cover bg-center blur-lg"
                style={{
                  backgroundImage: `url(${state.blurPlaceholder})`,
                  opacity: state.editedMedia ? 0 : 1,
                  transition: 'opacity 0.3s ease-in-out'
                }}
              />
            )}
            <img
              alt="Post preview"
              className="w-full h-full object-contain relative z-10"
              style={{ 
                filter: `${state.editedMedia.filter} ${state.editedMedia.adjustments}`,
                opacity: state.editedMedia ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out'
              }}
              onLoad={(e) => {
                e.target.style.opacity = '1';
              }}
              {...createImageProps(
                { medium: state.editedMedia.url },
                'Post preview',
                'medium'
              )}
            />
          </div>
          
          {/* Caption Section */}
          <div className="p-4 flex-shrink-0 space-y-4">
            <textarea
              placeholder="Write a caption..."
              value={state.caption}
              onChange={(e) => setState(prev => ({ ...prev, caption: e.target.value }))}
              className="w-full p-3 rounded-lg resize-none border bg-[#1a1a1a] border-gray-800 text-white placeholder-gray-500"
              rows={3}
            />

            {/* Location */}
            <div className="relative">
              <LocationAutocomplete
                onSelect={(location) => setState(prev => ({ ...prev, location }))}
                value={state.location}
                placeholder="Add location"
                className="w-full p-3 rounded-lg border bg-[#1a1a1a] border-gray-800 text-white placeholder-gray-500"
              />
              <LocationRegular className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
            
            {/* Tag Helpers */}
            <div className="space-y-2 text-gray-400">
              <div className="flex items-center">
                <NumberSymbolFilled className="w-5 h-5 mr-2" />
                <span>Use # to add hashtags</span>
              </div>
              <div className="flex items-center">
                <PersonTagRegular className="w-5 h-5 mr-2" />
                <span>Use @ to tag people</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <div className="h-screen flex flex-col">
        {renderNavigation()}
        <div className="flex-1 relative overflow-hidden">
          {state.step === 'upload' && renderUpload()}
          {state.step === 'crop' && state.media && renderCrop()}
          {state.step === 'filters' && state.croppedMedia && renderFilters()}
          {state.step === 'caption' && state.editedMedia && renderCaption()}
        </div>

        {/* Loading Overlay */}
        {state.loading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-[#1a1a1a] rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#ae52e3] mx-auto mb-4"></div>
              <p className="text-white">Processing your post...</p>
              {state.uploadProgress > 0 && (
                <p className="text-gray-400 mt-2">{state.uploadProgress}%</p>
              )}
            </div>
          </div>
        )}

        {/* Success Message */}
        {state.success && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-[#1a1a1a] rounded-lg p-6 text-center">
              <CheckmarkCircleFilled className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-white">Post created successfully!</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {state.error && (
          <div className="fixed bottom-4 left-4 right-4 bg-red-500/90 text-white p-4 rounded-lg backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <ErrorCircleRegular className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Error</p>
                <p>{state.error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCreator;
