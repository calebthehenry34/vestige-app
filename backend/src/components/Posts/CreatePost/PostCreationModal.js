import React, { useState } from 'react';
import { X, Image, Video, Type, ChevronLeft } from 'lucide-react';
import MediaUploader from './MediaUploader';
import MediaEditor from './MediaEditor';
import PostDetails from './PostDetails';

const ASPECT_RATIOS = {
  PORTRAIT: '4:5',
  LANDSCAPE: '16:9',
  STORY: '9:16',
  SQUARE: '1:1'
};

const CREATION_STEPS = {
  CHOOSE_TYPE: 'CHOOSE_TYPE',
  UPLOAD: 'UPLOAD',
  EDIT: 'EDIT',
  DETAILS: 'DETAILS'
};

const PostCreationModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(CREATION_STEPS.CHOOSE_TYPE);
  const [mediaType, setMediaType] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [aspectRatio, setAspectRatio] = useState(ASPECT_RATIOS.SQUARE);
  const [editedMedia, setEditedMedia] = useState(null);
  
  if (!isOpen) return null;

  const handleBack = () => {
    if (step === CREATION_STEPS.UPLOAD) {
      setStep(CREATION_STEPS.CHOOSE_TYPE);
      setMediaType(null);
    } else if (step === CREATION_STEPS.EDIT) {
      setStep(CREATION_STEPS.UPLOAD);
      setMediaFile(null);
    } else if (step === CREATION_STEPS.DETAILS) {
      setStep(CREATION_STEPS.EDIT);
      setEditedMedia(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b p-4 flex items-center justify-between">
          <button 
            onClick={handleBack}
            className={step === CREATION_STEPS.CHOOSE_TYPE ? 'invisible' : ''}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-semibold">Create New Post</h2>
          <button onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[80vh]">
          {step === CREATION_STEPS.CHOOSE_TYPE && (
            <div className="p-8 flex flex-col items-center justify-center w-full">
              <h3 className="text-xl mb-8">Choose post type</h3>
              <div className="grid grid-cols-3 gap-6">
                <button
                  onClick={() => {
                    setMediaType('image');
                    setStep(CREATION_STEPS.UPLOAD);
                  }}
                  className="flex flex-col items-center p-6 border rounded-lg hover:bg-gray-50"
                >
                  <Image className="w-12 h-12 mb-2" />
                  <span>Photo</span>
                </button>
                <button
                  onClick={() => {
                    setMediaType('video');
                    setStep(CREATION_STEPS.UPLOAD);
                  }}
                  className="flex flex-col items-center p-6 border rounded-lg hover:bg-gray-50"
                >
                  <Video className="w-12 h-12 mb-2" />
                  <span>Video</span>
                </button>
                <button
                  onClick={() => {
                    setMediaType('text');
                    setStep(CREATION_STEPS.DETAILS);
                  }}
                  className="flex flex-col items-center p-6 border rounded-lg hover:bg-gray-50"
                >
                  <Type className="w-12 h-12 mb-2" />
                  <span>Text</span>
                </button>
              </div>
            </div>
          )}

          {step === CREATION_STEPS.UPLOAD && (
            <MediaUploader
              mediaType={mediaType}
              onFileSelect={(file) => {
                setMediaFile(file);
                setStep(CREATION_STEPS.EDIT);
              }}
              aspectRatio={aspectRatio}
            />
          )}

          {step === CREATION_STEPS.EDIT && (
            <MediaEditor
              file={mediaFile}
              aspectRatio={aspectRatio}
              onAspectRatioChange={setAspectRatio}
              onComplete={(editedFile) => {
                setEditedMedia(editedFile);
                setStep(CREATION_STEPS.DETAILS);
              }}
            />
          )}

          {step === CREATION_STEPS.DETAILS && (
            <PostDetails
              media={editedMedia}
              mediaType={mediaType}
              onSubmit={async (postData) => {
                // Handle post creation
                onClose();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PostCreationModal;