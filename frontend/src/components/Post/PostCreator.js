import React, { useState, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  ImageRegular,
  SparkleRegular,
  ArrowLeftRegular,
  DismissRegular,
} from '@fluentui/react-icons';
import { ThemeContext } from '../../App';
import ImageEditor from './ImageEditor';
import axios from 'axios';
import { API_URL } from '../../config';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const PostCreator = ({ isOpen, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const [step, setStep] = useState('type');
  const [postType, setPostType] = useState('photo');
  const [media, setMedia] = useState(null);
  const [editedMedia, setEditedMedia] = useState(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  
  // Helper component for styled caption

  const StyledCaption = ({ text }) => {
    if (!text) return null;
  
    const parts = text.split(/(#[\w]+|@[\w]+)/g);
  
    return (
      <div>
        {parts.map((part, index) => {
          if (part.startsWith('#')) {
            return (
              <Link 
                key={index}
                to={`/explore/tags/${part.slice(1)}`}
                className="text-blue-500 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {part}
              </Link>
            );
          }
          if (part.startsWith('@')) {
            return (
              <Link
                key={index}
                to={`/profile/${part.slice(1)}`}
                className="text-blue-500 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {part}
              </Link>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  }; 


  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      const { errors } = rejectedFiles[0];
      if (errors[0]?.code === 'file-too-large') {
        setError('File is too large. Maximum size is 10MB.');
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
        setStep('editor');
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


  // Handlers
  const handleCaptionChange = (e) => {
    const newValue = e.target.value;
    setCaption(newValue);

    // Extract hashtags and mentions
    const hashtagMatches = newValue.match(/#[\w]+/g) || [];
    const mentionMatches = newValue.match(/@[\w]+/g) || [];

    // Update hashtags and mentions state
    setHashtags(hashtagMatches.map(tag => tag.slice(1)));
    setTaggedUsers(mentionMatches.map(mention => mention.slice(1)));
  };

  const handleEditComplete = async ({ croppedImage, filter, adjustments, aspectRatio }) => {
    setEditedMedia({
      url: croppedImage,
      filter: filter || '',
      adjustments: adjustments ? 
        `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)` 
        : '',
      aspectRatio,
      rawAdjustments: adjustments
    });
    setStep('details');
  };

  
  const processImage = async (imageUrl) => {
    // Create a canvas to apply filters and get the processed image
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image with filters
        ctx.filter = `${editedMedia.filter} ${editedMedia.adjustments}`;
        ctx.drawImage(img, 0, 0);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.85);
      };
      
      img.onerror = reject;
      img.src = imageUrl;
    });
  };

  const handleShare = async () => {
    try {
      setError(null);
      
      // Process the image with filters applied
      const processedBlob = await processImage(editedMedia.url);
      
      // Create file from blob
      const file = new File([processedBlob], 'image.jpg', { type: 'image/jpeg' });
      
      // Create form data
      const formData = new FormData();
      formData.append('media', file);
      formData.append('caption', caption);
      formData.append('location', location);
      formData.append('hashtags', JSON.stringify(hashtags));
      formData.append('taggedUsers', JSON.stringify(taggedUsers.map(user => user.id)));

      // Get auth token from localStorage
      const token = localStorage.getItem('token');

      // Upload to backend
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

      // Close modal and reset state
      onClose();
      setStep('type');
      setMedia(null);
      setEditedMedia(null);
      setCaption('');
      setLocation('');
      setHashtags([]);
      setTaggedUsers([]);
      setUploadProgress(0);

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
        setStep('type');
        setMedia(null);
        setEditedMedia(null);
        break;
      case 'details':
        setStep('editor');
        break;
      case 'share':
        setStep('details');
        break;
      default:
        onClose();
    }
  };

  const handleTypeSelect = (type) => {
    setPostType(type);
    if (type === 'moment') {
      // Future: handle moment creation
      console.log('Moments coming soon!');
    }
  };

  const renderTypeSelection = () => (
    <div className="p-4 min-h-screen">
      <div {...getRootProps()} className={`
        p-8 mb-4 rounded-lg border-2 border-dashed cursor-pointer
        transition-all hover:border-blue-500
        ${isDragActive ? 'border-blue-500 bg-blue-50' : ''}
        ${theme === 'dark-theme' 
          ? 'border-gray-800 bg-gray-900' 
          : 'border-gray-200 bg-white'}
      `}>
        <input {...getInputProps()} />
        <div className="text-center">
          <ImageRegular className={`w-12 h-12 mx-auto mb-4 ${
            theme === 'dark-theme' ? 'text-blue-400' : 'text-blue-500'
          }`} />
          <p className={`font-medium ${
            theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
          }`}>
            {isDragActive
              ? 'Add a photo'
              : 'Add a photo'}
          </p>
          <p className={`mt-2 text-sm ${
            theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
          }`}>
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 text-red-500 bg-red-100 rounded-lg">
          {error}
        </div>
      )}

      <button
        onClick={() => handleTypeSelect('moment')}
        className={`w-full p-6 rounded-lg border-2 transition-all ${
          postType === 'moment' && 'border-blue-500'
        } ${
          theme === 'dark-theme'
            ? 'border-gray-800 hover:border-blue-500 bg-gray-900'
            : 'border-gray-200 hover:border-blue-500 bg-white'
        }`}>
        <div className="flex items-center justify-center">
          <SparkleRegular className={`w-8 h-8 ${
            theme === 'dark-theme' ? 'text-blue-400' : 'text-blue-500'
          }`} />
        </div>
        <p className={`mt-2 font-medium ${
          theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
        }`}>Moment</p>
        <p className="text-gray-800 text-sm" >Videos that disappear in 24 hours</p>
      </button>
    </div>
  );

  
  const renderDetails = () => (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto">
        {editedMedia && (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <div
              className="relative w-full"
              style={{
                paddingBottom: `${(1 / editedMedia.aspectRatio) * 100}%`,
                overflow: 'hidden'
              }}
            >
              <img
                src={editedMedia.url}
                alt="Preview"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ 
                  filter: `${editedMedia.filter} ${editedMedia.adjustments}`
                }}
              />
            </div>
          </div>
        )}
        
        {/* Caption Section */}
        <div className="p-4">
          <div className="relative">
            <textarea
              placeholder="Write a caption... Use # for hashtags and @ to tag people"
              value={caption}
              onChange={handleCaptionChange}
              className={`w-full p-3 rounded-lg resize-none border ${
                theme === 'dark-theme'
                  ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-500'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              }`}
              rows={4}
            />
            {caption && (
              <div className="mt-2">
                <StyledCaption text={caption} />
              </div>
            )}
            <div className={`mt-2 text-sm ${
              theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Use # to add topics and @ to mention people
            </div>
          </div>
        </div>
      </div>
  
      {/* Upload Progress and Share Button */}
      <div className={`p-4 border-t ${
        theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
      }`}>
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mb-4">
            <div className="h-2 bg-gray-200 rounded-full">
              <div 
                className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
        <button
          onClick={handleShare}
          disabled={uploadProgress > 0 && uploadProgress < 100}
          className={`w-full py-2 rounded-lg ${
            uploadProgress > 0 && uploadProgress < 100
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
        >
          {uploadProgress > 0 && uploadProgress < 100 ? 'Uploading...' : 'Share'}
        </button>
      </div>
    </div>
  );
  

  if (!isOpen) return null;
  
  return (
    <div className="min-h-screen fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-8 overflow-auto">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative w-full max-w-lg rounded-xl overflow-hidden shadow-xl ${
          theme === 'dark-theme' ? 'bg-black' : 'bg-white'
        }`}
      >
        <div
          className={`flex items-center justify-between p-4 border-b ${
            theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
          }`}
        >
          <button
            onClick={handleBack}
            className={theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}
          >
            <ArrowLeftRegular className="w-6 h-6" />
          </button>
          <h2
            className={`text-lg font-semibold ${
              theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
            }`}
          >
            Create New Post
          </h2>
          <button
            onClick={onClose}
            className={theme === 'dark-theme' ? 'text-white' : 'text-gray-900'}
          >
            <DismissRegular className="w-6 h-6" />
          </button>
        </div>

        {step === 'type' && renderTypeSelection()}
        {step === 'editor' && media && (
          <ImageEditor image={media} onSave={handleEditComplete} onBack={handleBack} />
        )}
        {step === 'details' && renderDetails()}
      </div>
    </div>
  );
};

export default PostCreator;