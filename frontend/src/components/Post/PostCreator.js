import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  ImageRegular,
  SparkleRegular,
  ArrowLeftFilled,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import ImageEditor from './ImageEditor';
import axios from 'axios';
import { API_URL } from '../../config';
import styles from '../Onboarding/OnboardingFlow.module.css';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const PostCreator = ({ isOpen, onClose, onPostCreated }) => {
  const initialState = {
    step: 'type',
    slideDirection: '',
    media: null,
    editedMedia: null,
    caption: '',
    uploadProgress: 0,
    error: null
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
            step: 'editor',
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

  const handleEditComplete = async ({ croppedImage, filter, adjustments }) => {
    setState(prev => ({
      ...prev,
      editedMedia: {
        url: croppedImage,
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
        step: 'details',
        slideDirection: styles.slideNext
      }));
    }, 300);
  };

  const handleShare = async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
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

      // Reset state and close
      resetState();
      onClose();
      
      // Notify parent of new post
      if (onPostCreated) {
        onPostCreated(result.data);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Error creating post';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        uploadProgress: 0
      }));
    }
  };

  const handleBack = () => {
    switch (state.step) {
      case 'editor':
        setState(prev => ({
          ...prev,
          slideDirection: styles.slideRight
        }));
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            step: 'type',
            slideDirection: styles.slideNext
          }));
        }, 300);
        break;
      case 'details':
        setState(prev => ({
          ...prev,
          slideDirection: styles.slideRight
        }));
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            step: 'editor',
            slideDirection: styles.slideNext
          }));
        }, 300);
        break;
      default:
        resetState();
        onClose();
    }
  };

  const handleMomentClick = () => {
    setState(prev => ({ ...prev, error: 'Moments feature coming soon!' }));
  };

  const renderNavigation = () => (
    <div className="p-6 border-b border-[#333333] grid grid-cols-3 items-center">
      <div className="flex items-center">
        <button onClick={handleBack} className="text-white hover:text-gray-300 transition-colors">
          <ArrowLeftFilled className="w-6 h-6" />
        </button>
      </div>
      <div className="flex text-xs justify-center text-gray-200">
        {state.step === 'type' ? 'New Post' : state.step === 'editor' ? 'Edit Photo' : 'Share Post'}
      </div>
      <div className="flex justify-end">
        {state.step === 'details' && (
          <button
            onClick={handleShare}
            disabled={state.uploadProgress > 0 && state.uploadProgress < 100}
            className="px-4 py-2 bg-[#ae52e3] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#9a3dd0]"
          >
            {state.uploadProgress > 0 && state.uploadProgress < 100 ? 'Sharing...' : 'Share'}
          </button>
        )}
      </div>
    </div>
  );

  const renderTypeSelection = () => (
    <div className={`${styles.cardContainer} ${state.slideDirection}`}>
      <div className={`${styles.card} overflow-auto p-4`}>
        {state.media ? (
          <div className="relative w-full aspect-[4/5] mb-4">
            <img
              src={state.media}
              alt="Selected"
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <p className="text-white">Click Next to Edit</p>
            </div>
          </div>
        ) : (
          <>
            <div {...getRootProps()} className="p-8 mb-4 rounded-lg border-2 border-dashed cursor-pointer transition-all hover:border-[#ae52e3] border-gray-800 bg-[#1a1a1a]">
              <input {...getInputProps()} />
              <div className="text-center">
                <ImageRegular className="w-12 h-12 mx-auto mb-4 text-[#ae52e3]" />
                <p className="font-medium text-white">
                  {isDragActive ? 'Drop photo here' : 'Add a photo'}
                </p>
              </div>
            </div>

            <button
              onClick={handleMomentClick}
              className="w-full p-6 rounded-lg border-2 transition-all border-gray-800 hover:border-[#ae52e3] bg-[#1a1a1a]"
            >
              <div className="flex items-center justify-center">
                <SparkleRegular className="w-8 h-8 text-[#ae52e3]" />
              </div>
              <p className="mt-2 font-medium text-white">Moment</p>
              <p className="text-gray-400 text-sm">Videos that disappear in 24 hours</p>
            </button>
          </>
        )}
      </div>
    </div>
  );

  const renderDetails = () => (
    <div className={`${styles.cardContainer} ${state.slideDirection}`}>
      <div className={`${styles.card} overflow-auto`}>
        <div className="h-full flex flex-col">
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
          
          <div className="p-4 flex-shrink-0">
            <textarea
              placeholder="Write a caption..."
              value={state.caption}
              onChange={(e) => setState(prev => ({ ...prev, caption: e.target.value }))}
              className="w-full p-3 rounded-lg resize-none border bg-[#1a1a1a] border-gray-800 text-white placeholder-gray-500"
              rows={4}
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <div className="h-[100vh] flex flex-col max-h-screen">
        {renderNavigation()}
        <div className="flex-1 relative overflow-hidden">
          {state.step === 'type' && renderTypeSelection()}
          {state.step === 'editor' && state.media && (
            <ImageEditor 
              image={state.media} 
              onSave={handleEditComplete} 
              onBack={handleBack} 
            />
          )}
          {state.step === 'details' && state.editedMedia && renderDetails()}
        </div>

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
