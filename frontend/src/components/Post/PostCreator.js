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

const PostCreator = ({ isOpen, onClose }) => {
  const [step, setStep] = useState('type');
  const [slideDirection, setSlideDirection] = useState('');
  const [media, setMedia] = useState(null);
  const [editedMedia, setEditedMedia] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      const { errors } = rejectedFiles[0];
      if (errors[0]?.code === 'file-too-large') {
        setError('File is too large. Maximum size is 50MB.');
      } else if (errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Please upload a JPEG or PNG image.');
      }
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMedia(reader.result);
        setSlideDirection(styles.slideLeft);
        setTimeout(() => {
          setStep('editor');
          setSlideDirection(styles.slideNext);
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
    setEditedMedia({
      url: croppedImage,
      filter: filter || '',
      adjustments: adjustments ? 
        `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)` 
        : ''
    });
    setSlideDirection(styles.slideLeft);
    setTimeout(() => {
      setStep('details');
      setSlideDirection(styles.slideNext);
    }, 300);
  };

  const handleShare = async () => {
    try {
      setError(null);
      
      // Create a canvas to apply filters
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      const processedImage = await new Promise((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          canvas.width = img.width;
          canvas.height = img.height;
          
          ctx.filter = `${editedMedia.filter} ${editedMedia.adjustments}`;
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            resolve(new File([blob], 'image.jpg', { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.85);
        };
        
        img.onerror = reject;
        img.src = editedMedia.url;
      });

      const formData = new FormData();
      formData.append('media', processedImage);
      formData.append('caption', caption);

      const token = localStorage.getItem('token');
      const result = await axios.post(`${API_URL}/api/posts`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      onClose();
      return result.data;
    } catch (error) {
      console.error('Error creating post:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Error creating post';
      setError(errorMessage);
      setUploadProgress(0);
      throw error;
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'editor':
        setSlideDirection(styles.slideRight);
        setTimeout(() => {
          setStep('type');
          setSlideDirection(styles.slideNext);
          setMedia(null);
        }, 300);
        break;
      case 'details':
        setSlideDirection(styles.slideRight);
        setTimeout(() => {
          setStep('editor');
          setSlideDirection(styles.slideNext);
        }, 300);
        break;
      default:
        onClose();
    }
  };

  const handleMomentClick = () => {
    setError('Moments feature coming soon!');
  };

  const renderNavigation = () => (
    <div className="p-6 border-b border-[#333333] grid grid-cols-3 items-center">
      <div className="flex items-center">
        <button onClick={handleBack} className="text-white hover:text-gray-300 transition-colors">
          <ArrowLeftFilled className="w-6 h-6" />
        </button>
      </div>
      <div className="flex text-xs justify-center text-gray-200">
        {step === 'type' ? 'New Post' : step === 'editor' ? 'Edit Photo' : 'Share Post'}
      </div>
      <div className="flex justify-end">
        {step === 'details' && (
          <button
            onClick={handleShare}
            disabled={uploadProgress > 0 && uploadProgress < 100}
            className="px-4 py-2 bg-[#ae52e3] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#9a3dd0]"
          >
            {uploadProgress > 0 && uploadProgress < 100 ? 'Sharing...' : 'Share'}
          </button>
        )}
      </div>
    </div>
  );

  const renderTypeSelection = () => (
    <div className={`${styles.cardContainer} ${slideDirection}`}>
      <div className={`${styles.card} overflow-auto p-4`}>
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
      </div>
    </div>
  );

  const renderDetails = () => (
    <div className={`${styles.cardContainer} ${slideDirection}`}>
      <div className={`${styles.card} overflow-auto`}>
        <div className="relative w-full aspect-[4/5]">
          <img
            src={editedMedia.url}
            alt="Preview"
            className="w-full h-full object-cover"
            style={{ 
              filter: `${editedMedia.filter} ${editedMedia.adjustments}`
            }}
          />
        </div>
        
        <div className="p-4">
          <textarea
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full p-3 rounded-lg resize-none border bg-[#1a1a1a] border-gray-800 text-white placeholder-gray-500"
            rows={4}
          />
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
          {step === 'type' && renderTypeSelection()}
          {step === 'editor' && media && (
            <ImageEditor 
              image={media} 
              onSave={handleEditComplete} 
              onBack={handleBack} 
            />
          )}
          {step === 'details' && editedMedia && renderDetails()}
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
    </div>
  );
};

export default PostCreator;
