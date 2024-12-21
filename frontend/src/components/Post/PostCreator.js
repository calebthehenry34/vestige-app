import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
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
import ProfileImageEditor from '../Onboarding/ProfileImageEditor';
import axios from 'axios';
import { API_URL } from '../../config';
import styles from '../Onboarding/OnboardingFlow.module.css';
import LocationAutocomplete from '../Common/LocationAutocomplete';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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
    success: false
  };

  const [state, setState] = useState(initialState);

  const resetState = () => {
    setState(initialState);
  };

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
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

  const handleCropComplete = async ({ croppedImage }) => {
    setState(prev => ({
      ...prev,
      croppedMedia: croppedImage,
      slideDirection: styles.slideLeft
    }));
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        step: 'filters',
        slideDirection: styles.slideNext
      }));
    }, 300);
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
          
          canvas.toBlob((blob) => {
            resolve(new File([blob], 'image.jpg', { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.85);
        };
        
        img.onerror = reject;
        img.src = state.editedMedia.url;
      });

      const formData = new FormData();
      formData.append('media', processedImage);
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
    <div className="p-6 border-b border-[#333333] grid grid-cols-3 items-center">
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
        {state.step === 'filters' && (
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
      <div className={`${styles.card} overflow-hidden`}>
        <ProfileImageEditor
          image={state.media}
          onSave={handleCropComplete}
          aspectRatio={4/5}
          circular={false}
        />
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className={`${styles.cardContainer} ${state.slideDirection}`}>
      <div className={`${styles.card} overflow-hidden`}>
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
          {/* Preview Image */}
          <div className="relative w-full aspect-[4/5]">
            <img
              src={state.editedMedia.url}
              alt="Preview"
              className="w-full h-full object-cover"
              style={{ 
                filter: `${state.editedMedia.filter} ${state.editedMedia.adjustments}`
              }}
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
