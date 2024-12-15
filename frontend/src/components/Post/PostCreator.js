import React, { useState, useContext } from 'react';
import {
  ImageRegular,
  SparkleRegular,
  DocumentRegular,
  ArrowLeftRegular,
  DismissRegular,
} from '@fluentui/react-icons';
import { ThemeContext } from '../../App';
import ImageEditor from './ImageEditor';
import LocationAutocomplete from '../Common/LocationAutocomplete';
import UserSearch from '../Common/UserSearch';

const PostCreator = ({ isOpen, onClose }) => {
  const { theme } = useContext(ThemeContext);
  const [step, setStep] = useState('type'); // type -> editor -> details -> share
  const [postType, setPostType] = useState('photo');
  const [media, setMedia] = useState(null);
  const [editedMedia, setEditedMedia] = useState(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [taggedUsers, setTaggedUsers] = useState([]);

  const filters = {
    none: '',
    chrome: 'brightness(1.1) contrast(1.1) saturate(1.1)',
    fade: 'brightness(1.1) contrast(.9) saturate(.8)',
    mono: 'grayscale(1)',
    noir: 'brightness(1.1) contrast(1.2) grayscale(1)',
    vivid: 'brightness(1.1) contrast(1.2) saturate(1.4)',
    warm: 'brightness(1.1) sepia(.3)',
    cool: 'brightness(1.1) saturate(.8) hue-rotate(30deg)'
  };


  if (!isOpen) return null;

  const handleLocationSelect = (newLocation) => {
    setLocation(newLocation);
  };
  
  const handleHashtagInput = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const newHashtag = e.target.value.trim();
      if (!hashtags.includes(newHashtag)) {
        setHashtags([...hashtags, newHashtag]);
      }
      e.target.value = '';
    }
  };

 // Update handleTypeSelect
const handleTypeSelect = (type) => {
  setPostType(type);
  if (type === 'photo') {
    document.getElementById('photoInput').click();
  }
  // For future moment/story implementation
  else if (type === 'moment') {
    // Future: handle moment creation
    console.log('Moments coming soon!');
  }
};

  


// Update handleMediaSelect to only run for photo type
const handleMediaSelect = (e) => {
  if (postType === 'photo') {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMedia(reader.result);
        setStep('editor');
      };
      reader.readAsDataURL(file);
    }
  }
};

const handleEditComplete = async ({ croppedImage, filter, adjustments }) => {
  setEditedMedia({
    url: croppedImage,
    filter: filters[filter] || '', // Now using the filters object from your code
    adjustments: adjustments ? 
      `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)` 
      : ''
  });
  setStep('details');
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

  // Use postType in renderTypeSelection
const renderTypeSelection = () => (
  <div className="p-4">
    <div className="grid grid-cols-1 gap-4">
      <input
        id="photoInput"
        type="file"
        accept="image/*"
        onChange={handleMediaSelect}
        className="hidden"
      />
      
      <button 
        onClick={() => handleTypeSelect('photo')}
        className={`p-6 rounded-lg border-2 transition-all ${
          postType === 'photo' && 'border-blue-500'
        } ${
          theme === 'dark-theme'
            ? 'border-gray-800 hover:border-blue-500 bg-gray-900'
            : 'border-gray-200 hover:border-blue-500 bg-white'
        }`}
      >
        <div className="flex items-center justify-center">
          <ImageRegular className={`w-8 h-8 ${
            theme === 'dark-theme' ? 'text-blue-400' : 'text-blue-500'
          }`} />
        </div>
        <p className={`mt-2 font-medium ${
          theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
        }`}>Photo</p>
      </button>

      <button
        onClick={() => handleTypeSelect('moment')}
        className={`p-6 rounded-lg border-2 transition-all ${
          postType === 'moment' && 'border-blue-500'
        } ${
          theme === 'dark-theme'
            ? 'border-gray-800 hover:border-blue-500 bg-gray-900'
            : 'border-gray-200 hover:border-blue-500 bg-white'
        }`}
      >
        <div className="flex items-center justify-center">
          <SparkleRegular className={`w-8 h-8 ${
            theme === 'dark-theme' ? 'text-blue-400' : 'text-blue-500'
          }`} />
        </div>
        <p className={`mt-2 font-medium ${
          theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
        }`}>Moment</p>
      </button>

      <button
        disabled
        className={`p-6 rounded-lg border-2 opacity-50 cursor-not-allowed ${
          theme === 'dark-theme'
            ? 'border-gray-800 bg-gray-900'
            : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-center">
          <DocumentRegular className={`w-8 h-8 ${
            theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
          }`} />
        </div>
        <p className={`mt-2 font-medium ${
          theme === 'dark-theme' ? 'text-white' : 'text-gray-900'
        }`}>Text Post</p>
        <p className={`text-sm ${
          theme === 'dark-theme' ? 'text-gray-400' : 'text-gray-500'
        }`}>Coming soon</p>
      </button>
    </div>
  </div>
);

const renderDetails = () => (
  <div className="flex flex-col h-full">
    <div className="flex-1 overflow-y-auto">
    {editedMedia && (
  <div className="relative aspect-square">
    <img
      src={editedMedia.url}
      alt="Preview"
      className="w-full h-full object-cover"
      style={{ 
        filter: `${editedMedia.filter} ${editedMedia.adjustments}`
      }}
    />
  </div>
)}
        <div className="p-4 space-y-4">
        <textarea
          placeholder="Write a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className={`w-full p-3 rounded-lg resize-none border ${
            theme === 'dark-theme'
              ? 'bg-gray-900 border-gray-800 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          }`}
          rows={4}
        />
          
          <LocationAutocomplete LocationAutocomplete onSelectLocation={setLocation} />

          
          <UserSearch
            onTagUser={(user) => setTaggedUsers([...taggedUsers, user])}
            onRemoveTag={(userId) => setTaggedUsers(taggedUsers.filter(u => u.id !== userId))}
            taggedUsers={taggedUsers}
          />

          {/* Add this hashtag section */}
        <div className="relative">
          <input
            type="text"
            placeholder="Add hashtags (press Enter to add)"
            onKeyPress={handleHashtagInput}
            className={`w-full p-3 rounded-lg border ${
              theme === 'dark-theme'
                ? 'bg-gray-900 border-gray-800 text-white'
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {hashtags.map((tag, index) => (
              <span 
                key={index} 
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center"
              >
                #{tag}
                <button
                  onClick={() => setHashtags(hashtags.filter((_, i) => i !== index))}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>

      <div className={`p-4 border-t ${
        theme === 'dark-theme' ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <button
          onClick={() => setStep('share')}
          className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Next
        </button>
      </div>
    </div>
  );

  
  return (
    <div className="fixed inset-0 z-50 m-50 flex items-start justify-center p-8 overflow-auto">
    <div className="absolute inset-0 dark: bg-black/100" onClick={onClose} />
    <div
      className={`relative w-full max-w-lg rounded-xl overflow-auto max-h-screen shadow-xl ${
        theme === 'dark-theme' ? 'bg-black' : 'bg-white'
      }`}
    >
      {/* Header */}
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
  
      {/* Content */}
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