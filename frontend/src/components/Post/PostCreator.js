import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Cropper from 'react-easy-crop';
import ImageEditor from './ImageEditor';
import {
  ImageRegular,
  ArrowLeftFilled,
  ErrorCircleRegular,
  LocationRegular,
  DismissRegular
} from '@fluentui/react-icons';
import axios from 'axios';
import { API_URL } from '../../config';
import LocationAutocomplete from '../Common/LocationAutocomplete';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const PostCreator = ({ isOpen, onClose, onPostCreated }) => {
  const [step, setStep] = useState('upload');
  const [media, setMedia] = useState(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [imageFilter, setImageFilter] = useState({ filter: '', adjustments: null });

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
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
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          setMedia(reader.result);
          setStep('crop');
        };
        reader.readAsDataURL(file);
      } catch (error) {
        setError('Failed to process image. Please try again.');
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
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImage = async () => {
    try {
      const canvas = document.createElement('canvas');
      const image = await createImage(media);
      const ctx = canvas.getContext('2d');

      const maxSize = Math.max(croppedAreaPixels.width, croppedAreaPixels.height);
      const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));
      
      canvas.width = safeArea;
      canvas.height = safeArea;

      ctx.translate(safeArea / 2, safeArea / 2);
      ctx.translate(-safeArea / 2, -safeArea / 2);
      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        safeArea,
        safeArea
      );

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(URL.createObjectURL(blob));
        }, 'image/jpeg');
      });
    } catch (e) {
      console.error(e);
      setError('Failed to process image');
    }
  };

  const handleShare = async () => {
    try {
      setLoading(true);
      setError(null);

      const croppedImage = await getCroppedImage();
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('media', file);
      formData.append('caption', caption);
      if (location) {
        formData.append('location', location);
      }
      // Add filter and adjustments data
      if (imageFilter.filter || imageFilter.adjustments) {
        formData.append('imageFilter', JSON.stringify(imageFilter));
      }

      const token = localStorage.getItem('token');
      const result = await axios.post(`${API_URL}/api/posts`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });

      onPostCreated?.(result.data);
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Error creating post');
    } finally {
      setLoading(false);
    }
  };

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', reject);
      image.src = url;
    });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-black w-full max-w-xl h-[95vh] rounded-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#333333] flex items-center justify-between">
          <button 
            onClick={() => step !== 'upload' ? setStep('upload') : onClose()}
            className="text-white hover:text-gray-300 transition-colors"
          >
            {step !== 'upload' ? <ArrowLeftFilled className="w-6 h-6" /> : null}
          </button>
          <div className="text-sm text-gray-200">
            {step === 'upload' 
              ? 'New Post' 
              : step === 'crop' 
              ? 'Crop Photo'
              : step === 'edit'
              ? 'Edit Photo'
              : 'Share Post'
            }
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors"
          >
            <DismissRegular className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {step === 'upload' && (
            <div className="h-full p-6">
              <div 
                {...getRootProps()} 
                className="h-full rounded-lg border-2 border-dashed cursor-pointer transition-all hover:border-[#ae52e3] border-gray-800 bg-[#1a1a1a] flex items-center justify-center p-8"
              >
                <input {...getInputProps()} />
                <div className="text-center">
                  <ImageRegular className="w-12 h-12 mx-auto mb-4 text-[#ae52e3]" />
                  <p className="font-medium text-white">
                    {isDragActive ? 'Drop photo here' : 'Add a photo'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'crop' && media && (
            <div className="relative h-full">
              <Cropper
                image={media}
                crop={crop}
                zoom={zoom}
                aspect={4/5}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid={true}
                cropShape="rect"
                objectFit="contain"
              />
              <button
                onClick={async () => {
                  const croppedImage = await getCroppedImage();
                  setMedia(croppedImage);
                  setStep('edit');
                }}
                className="absolute bottom-4 right-4 px-4 py-2 bg-[#ae52e3] text-white rounded-lg hover:bg-[#9a3dd0] transition-colors"
              >
                Next
              </button>
            </div>
          )}

          {step === 'edit' && media && (
            <div className="h-full">
              <ImageEditor
                image={media}
                onSave={(edits) => {
                  setImageFilter(edits);
                }}
              />
              <button
                onClick={() => setStep('caption')}
                className="absolute bottom-4 right-4 px-4 py-2 bg-[#ae52e3] text-white rounded-lg hover:bg-[#9a3dd0] transition-colors"
              >
                Next
              </button>
            </div>
          )}

          {step === 'caption' && media && (
            <div className="h-full overflow-auto">
              <div className="p-6 space-y-6">
                <img
                  src={media}
                  alt="Preview"
                  className="w-full aspect-[4/5] object-cover rounded-lg"
                  style={{
                    filter: `
                      ${imageFilter.filter}
                      ${imageFilter.adjustments ? `
                        brightness(${imageFilter.adjustments.brightness}%)
                        contrast(${imageFilter.adjustments.contrast}%)
                        saturate(${imageFilter.adjustments.saturation}%)
                        sepia(${imageFilter.adjustments.temperature > 100 ? (imageFilter.adjustments.temperature - 100) / 100 : 0})
                        hue-rotate(${imageFilter.adjustments.temperature < 100 ? (100 - imageFilter.adjustments.temperature) * 0.5 : 0}deg)
                      ` : ''}
                    `
                  }}
                />
                <textarea
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full p-3 rounded-lg resize-none border bg-[#1a1a1a] border-gray-800 text-white placeholder-gray-500"
                  rows={3}
                />
                <div className="relative">
                  <LocationAutocomplete
                    onSelect={setLocation}
                    value={location}
                    placeholder="Add location"
                    className="w-full p-3 rounded-lg border bg-[#1a1a1a] border-gray-800 text-white placeholder-gray-500"
                  />
                  <LocationRegular className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
                <button
                  onClick={handleShare}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-[#ae52e3] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#9a3dd0]"
                >
                  {loading ? 'Sharing...' : 'Share'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
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
